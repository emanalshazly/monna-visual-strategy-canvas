import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const originalBrief = 'A fictional neighbourhood bicycle repair cooperative';
const nextBrief = 'A fictional bakery delivering sourdough subscriptions';
const editedPartners = 'Local partners & "repair cafes" <fictional>';

async function generate(page: Page, brief: string) {
  await page.getByPlaceholder(/Describe your business idea/i).fill(brief);
  await page.getByRole('button', { name: 'Generate Canvas', exact: true }).click();
  await expect(page.getByText('Fixture content for Value Propositions')).toBeVisible();
}

async function refineAndExport(page: Page, outputPath: string) {
  await page.getByRole('button', { name: 'Edit Key Partners', exact: true }).focus();
  await page.keyboard.press('Enter');
  const editor = page.getByPlaceholder('Enter your content here...');
  await editor.fill(editedPartners);
  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/analysis') && request.postDataJSON()?.action === 'refine');
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/analysis') && response.request().postDataJSON()?.action === 'refine');
  await page.getByRole('button', { name: 'Refine with AI', exact: true }).click();
  const request = await requestPromise;
  const response = await responsePromise;
  await expect(page.getByRole('button', { name: 'Refine with AI', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /^SVG/ }).click();
  const download = await pendingDownload;
  await download.saveAs(outputPath);
  const bytes = await readFile(outputPath, 'utf8');
  const artifact = await page.evaluate((svg) => {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return {
      errors: document.querySelectorAll('parsererror').length,
      root: document.documentElement.localName,
      blocks: [...document.querySelectorAll('g.canvas-block')].map((block) => ({
        title: block.querySelector('title')?.textContent,
        text: block.querySelector('foreignObject')?.textContent,
      })),
      scripts: document.querySelectorAll('script').length,
      eventAttributes: [...document.querySelectorAll('*')].flatMap((element) => [...element.attributes].filter((attribute) => /^on/i.test(attribute.name)).map((attribute) => attribute.name)),
    };
  }, bytes);
  expect(artifact.errors).toBe(0);
  expect(artifact.root).toBe('svg');
  expect(artifact.scripts).toBe(0);
  expect(artifact.eventAttributes).toEqual([]);
  expect(artifact.blocks).toHaveLength(9);
  expect(artifact.blocks.find((block) => block.title === 'Key Partners')?.text).toContain(`Refined: ${editedPartners}`);
  for (const title of ['Key Activities', 'Value Propositions', 'Customer Relationships', 'Customer Segments', 'Key Resources', 'Channels', 'Cost Structure', 'Revenue Streams']) {
    expect(artifact.blocks.find((block) => block.title === title)?.text).toContain(`Fixture content for ${title}`);
  }
  expect(response.status()).toBe(200);
  return request.postDataJSON() as { originalUserInput: string };
}

test('refinement retains its canvas brief after the next draft is edited', async ({ page }, testInfo) => {
  await page.goto('/');
  await generate(page, originalBrief);
  await page.getByPlaceholder(/Describe your business idea/i).fill(nextBrief);
  const submitted = await refineAndExport(page, testInfo.outputPath('edited-next-draft.svg'));
  expect(submitted.originalUserInput).toBe(originalBrief);
  await expect(page.getByPlaceholder(/Describe your business idea/i)).toHaveValue(nextBrief);
});

test('refinement retains the submitted brief when the draft changes during generation', async ({ page }, testInfo) => {
  let release!: () => void;
  let ready!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const responseReady = new Promise<void>((resolve) => { ready = resolve; });
  await page.route('**/api/analysis', async (route) => {
    if (route.request().postDataJSON()?.action !== 'generate') return route.continue();
    const response = await route.fetch();
    ready();
    await gate;
    await route.fulfill({ response });
  });
  await page.goto('/');
  await page.getByPlaceholder(/Describe your business idea/i).fill(originalBrief);
  await page.getByRole('button', { name: 'Generate Canvas', exact: true }).click();
  await responseReady;
  await page.getByPlaceholder(/Describe your business idea/i).fill(nextBrief);
  release();
  await expect(page.getByText('Fixture content for Value Propositions')).toBeVisible();
  const submitted = await refineAndExport(page, testInfo.outputPath('draft-during-generation.svg'));
  expect(submitted.originalUserInput).toBe(originalBrief);
});

test('a successful new generation updates the brief used for refinement', async ({ page }, testInfo) => {
  await page.goto('/');
  await generate(page, originalBrief);
  await generate(page, nextBrief);
  const submitted = await refineAndExport(page, testInfo.outputPath('new-generation-control.svg'));
  expect(submitted.originalUserInput).toBe(nextBrief);
});

test('refinement uses the trimmed brief accepted by generation', async ({ page }, testInfo) => {
  await page.goto('/');
  // The generation schema trims before its 10,000-character bound. Reusing
  // this raw draft as originalUserInput instead rejects a successful canvas.
  await generate(page, originalBrief.padEnd(10_010, ' '));
  const submitted = await refineAndExport(page, testInfo.outputPath('trimmed-generation-brief.svg'));
  expect(submitted.originalUserInput).toBe(originalBrief);
});

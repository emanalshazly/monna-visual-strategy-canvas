import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const edit = 'Fictional bicycle co-op: keep "weekly repairs" & <shared tools>.';
const brief = 'A fictional bicycle cooperative offering weekly repairs and shared tools.';

async function generate(page: Page, text = brief) {
  await page.getByPlaceholder(/Describe your business idea/i).fill(text);
  const response = page.waitForResponse((r) => r.url().endsWith('/api/analysis'));
  await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
  const actual = await response;
  expect(actual.status()).toBe(200);
  const body = await actual.json();
  expect(body.receipt.provider).toBe('fake');
  await expect(page.getByText('Fixture content for Value Propositions')).toBeVisible();
  return body;
}

async function exportSvg(page: Page, info: TestInfo, name: string) {
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^SVG/ }).click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  const path = info.outputPath(name + '.svg');
  await download.saveAs(path);
  const text = await readFile(path, 'utf8');
  const parsed = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
    const blocks = Array.from(doc.querySelectorAll('g.canvas-block')).map((block) => ({
      title: block.querySelector('title')?.textContent,
      paragraphs: Array.from(block.querySelectorAll('foreignObject .prose p')).map((p) => p.textContent),
    }));
    return {
      errors: doc.querySelectorAll('parsererror').length,
      root: doc.documentElement.localName,
      namespace: doc.documentElement.namespaceURI,
      blocks,
    };
  }, text);
  expect(parsed.errors).toBe(0);
  expect(parsed.root).toBe('svg');
  expect(parsed.namespace).toBe('http://www.w3.org/2000/svg');
  expect(parsed.blocks).toHaveLength(9);
  return { filename: download.suggestedFilename(), bytes: Buffer.byteLength(text), ...parsed };
}

async function editedCanvas(page: Page, info: TestInfo) {
  await page.goto('/');
  const body = await generate(page);
  await page.getByRole('button', { name: 'Edit Key Partners', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByPlaceholder('Enter your content here...').fill(edit);
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByText(edit, { exact: true })).toBeVisible();
  const initial = await exportSvg(page, info, 'before-regeneration');
  expect(initial.blocks.find((b) => b.title === 'Key Partners')?.paragraphs).toEqual([edit]);
  const analysis = await page.getByRole('heading', { name: 'AI Strategic Analysis' })
    .locator('../..').locator('.prose p').allTextContents();
  return { body, initial, analysis };
}

async function observe(page: Page, info: TestInfo) {
  const available = await page.getByRole('button', { name: 'Export Canvas', exact: true }).count() === 1;
  const analysis = page.getByRole('heading', { name: 'AI Strategic Analysis' });
  const analysisVisible = await analysis.isVisible();
  return {
    editVisible: await page.getByText(edit, { exact: true }).isVisible(),
    analysisVisible,
    analysis: analysisVisible ? await analysis.locator('../..').locator('.prose p').allTextContents() : [],
    exportAvailable: available,
    artifact: available ? await exportSvg(page, info, 'after-regeneration') : null,
  };
}

async function record(info: TestInfo, value: unknown) {
  const path = info.outputPath('observations.json');
  await writeFile(path, JSON.stringify(value, null, 2) + '\n');
  await info.attach('observations', { path, contentType: 'application/json' });
}

function expectPreserved(state: Awaited<ReturnType<typeof observe>>, initial: Awaited<ReturnType<typeof editedCanvas>>) {
  expect.soft(state.editVisible, 'saved edit survives unsuccessful regeneration').toBe(true);
  expect.soft(state.analysisVisible, 'the saved canvas keeps its analysis').toBe(true);
  expect.soft(state.exportAvailable, 'the saved canvas remains exportable').toBe(true);
  expect.soft(state.artifact?.blocks.find((b) => b.title === 'Key Partners')?.paragraphs,
    'the completed SVG preserves the exact edit').toEqual([edit]);
  expect.soft(state.artifact?.blocks, 'all nine exported blocks retain their content').toEqual(initial.initial.blocks);
  expect.soft(state.analysis, 'the saved analysis retains its content').toEqual(initial.analysis);
}

test('cancelled regeneration preserves the edited canvas and its downloaded SVG', async ({ page }, info) => {
  const initial = await editedCanvas(page, info);
  let release!: () => void;
  let fetched!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { fetched = resolve; });
  let receipt;
  await page.route('**/api/analysis', async (route) => {
    const response = await route.fetch();
    receipt = await response.json();
    fetched();
    await gate;
    await route.fulfill({ response }).catch(() => { /* The browser may already have cancelled. */ });
  });
  await page.getByPlaceholder(/Describe your business idea/i).fill(brief + ' Cancel this replacement.');
  await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
  await ready;
  await expect(page.getByRole('status')).toContainText('AI is thinking');
  await expect(page.getByRole('button', { name: 'Export Canvas', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel generation', exact: true }).click();
  release();
  await expect(page.getByRole('alert')).toContainText('Generation cancelled.');
  const final = await observe(page, info);
  await record(info, { initial, receipt, final });
  expectPreserved(final, initial);
});

test('a real gateway rejection preserves the edited canvas and its downloaded SVG', async ({ page }, info) => {
  const initial = await editedCanvas(page, info);
  // The actual gateway rejects this over-limit brief; no response is fabricated.
  await page.getByPlaceholder(/Describe your business idea/i).fill('F'.repeat(10_001));
  const pending = page.waitForResponse((r) => r.url().endsWith('/api/analysis'));
  await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
  const response = await pending;
  expect(response.status()).toBe(400);
  const rejection = await response.json();
  expect(rejection.code).toBe('invalid_request');
  await expect(page.getByRole('alert')).toContainText('Check the request fields.');
  const final = await observe(page, info);
  await record(info, { initial, rejection, final });
  expectPreserved(final, initial);
});

test('interrupted response delivery preserves the edited canvas and its downloaded SVG', async ({ page }, info) => {
  const initial = await editedCanvas(page, info);
  let responseBody;
  await page.route('**/api/analysis', async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    responseBody = await response.json();
    // Inject a transport failure after the real local gateway has responded.
    await route.abort('connectionreset');
  });
  await page.getByPlaceholder(/Describe your business idea/i).fill(brief + ' Interrupted replacement.');
  await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
  await expect(page.getByRole('alert')).toContainText('Failed to fetch');
  const final = await observe(page, info);
  await record(info, { initial, responseBody, fault: 'Playwright connectionreset after route.fetch', final });
  expectPreserved(final, initial);
});

test('successful regeneration commits the replacement and exports the new content', async ({ page }, info) => {
  const initial = await editedCanvas(page, info);
  let release!: () => void;
  let fetched!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { fetched = resolve; });
  let replacement;
  await page.route('**/api/analysis', async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    replacement = await response.json();
    fetched();
    await gate;
    await route.fulfill({ response });
  });
  await page.getByPlaceholder(/Describe your business idea/i).fill(brief + ' Accepted replacement.');
  await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
  await ready;
  await expect(page.getByRole('status')).toContainText('AI is thinking');
  await expect(page.getByRole('button', { name: 'Export Canvas', exact: true })).toHaveCount(0);
  release();
  await expect(page.getByText('Fixture content for Key Partners', { exact: true })).toBeVisible();
  await expect(page.getByText(edit, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'AI Strategic Analysis' })).toBeVisible();
  const artifact = await exportSvg(page, info, 'replacement');
  expect(artifact.blocks.find((b) => b.title === 'Key Partners')?.paragraphs).toEqual(['Fixture content for Key Partners']);
  await record(info, { initial, replacement, artifact });
});

test('a first-generation rejection stays empty and can recover normally', async ({ page }, info) => {
  await page.goto('/');
  await page.getByPlaceholder(/Describe your business idea/i).fill('F'.repeat(10_001));
  const pending = page.waitForResponse((r) => r.url().endsWith('/api/analysis'));
  await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
  const response = await pending;
  expect(response.status()).toBe(400);
  await expect(page.getByRole('alert')).toContainText('Check the request fields.');
  await expect(page.getByRole('button', { name: 'Export Canvas', exact: true })).toHaveCount(0);
  await expect(page.getByText('Your generated canvas will appear here.')).toBeVisible();
  const recovered = await generate(page, brief + ' Initial recovery.');
  const artifact = await exportSvg(page, info, 'recovered');
  expect(artifact.blocks.find((b) => b.title === 'Key Partners')?.paragraphs).toEqual(['Fixture content for Key Partners']);
  await record(info, { rejection: await response.json(), recovered, artifact });
});

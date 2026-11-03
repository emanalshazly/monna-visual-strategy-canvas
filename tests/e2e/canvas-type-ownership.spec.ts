import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function generateCanvas(page: Page, blockTitle = 'Key Partners') {
  await page.getByPlaceholder(/Describe your business idea/i).fill('A fictional neighborhood bicycle repair service');
  const pending = page.waitForResponse((response) => response.url().endsWith('/api/analysis') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
  const response = await pending;
  expect(response.ok()).toBe(true);
  expect((await response.json()).receipt.provider).toBe('fake');
  await expect(page.getByText(`Fixture content for ${blockTitle}`, { exact: true })).toBeVisible();
}

async function exportedSvg(page: Page, info: TestInfo, filename: string) {
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^SVG/ }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(filename);
  const path = info.outputPath(filename);
  await download.saveAs(path);
  expect(await download.failure()).toBeNull();
  return page.evaluate((text) => {
    const document = new DOMParser().parseFromString(text, 'image/svg+xml');
    return {
      root: document.documentElement.localName,
      errors: document.querySelectorAll('parsererror').length,
      content: document.documentElement.textContent,
      titles: [...document.querySelectorAll('.canvas-block > title')].map((title) => title.textContent),
    };
  }, await readFile(path, 'utf8'));
}

test.beforeEach(async ({ page, request }) => {
  // Exercise the real local gateway and its schema validation, without model calls.
  const health = await request.get('/healthz');
  expect((await health.json()).provider).toBe('fake');
  await page.goto('/');
});

test('changing canvas type cannot export content under another template and keeps edits when returning', async ({ page }, info) => {
  await generateCanvas(page);
  await page.getByRole('button', { name: 'Edit Key Partners' }).click();
  await page.getByPlaceholder('Enter your content here...').fill('Fictional bicycle cooperative partners');
  await page.getByRole('button', { name: 'Save Changes' }).click();

  await page.getByLabel('1. Select Canvas Type').selectOption('SWOT_ANALYSIS');
  await expect(page.getByRole('button', { name: 'Export Canvas', exact: true })).toHaveCount(0);
  await expect(page.getByText('Your generated canvas will appear here.')).toBeVisible();
  await expect(page.getByText('Fixture content for Key Partners', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('different-template.png'), fullPage: true });

  await page.getByLabel('1. Select Canvas Type').selectOption('BUSINESS_MODEL_CANVAS');
  await expect(page.getByText('Fictional bicycle cooperative partners', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('restored-edits.png'), fullPage: true });
  const artifact = await exportedSvg(page, info, 'Business_Model_Canvas.svg');
  expect(artifact.root).toBe('svg');
  expect(artifact.errors).toBe(0);
  expect(artifact.titles).toEqual(['Key Partners', 'Key Activities', 'Value Propositions', 'Customer Relationships', 'Customer Segments', 'Key Resources', 'Channels', 'Cost Structure', 'Revenue Streams']);
  expect(artifact.content).toContain('Fictional bicycle cooperative partners');
  expect(artifact.titles).not.toContain('Strengths');

  // Generating for the new selection must establish its own result ownership.
  await page.getByLabel('1. Select Canvas Type').selectOption('SWOT_ANALYSIS');
  await generateCanvas(page, 'Strengths');
  const swot = await exportedSvg(page, info, 'SWOT_Analysis.svg');
  expect(swot.root).toBe('svg');
  expect(swot.errors).toBe(0);
  expect(swot.titles).toEqual(['Strengths', 'Weaknesses', 'Opportunities', 'Threats']);
  expect(swot.content).toContain('Fixture content for Strengths');
  expect(swot.content).not.toContain('Fictional bicycle cooperative partners');
});

test('an in-flight gateway response belongs to the canvas type that requested it', async ({ page }) => {
  let release!: () => void;
  let received!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const gatewayAnswered = new Promise<void>((resolve) => { received = resolve; });
  await page.route('**/api/analysis', async (route) => {
    // Keep the real server response; only its delivery is delayed.
    const response = await route.fetch();
    expect((await response.json()).receipt.provider).toBe('fake');
    received();
    await gate;
    await route.fulfill({ response });
  });
  try {
    await page.getByPlaceholder(/Describe your business idea/i).fill('A fictional neighborhood bicycle repair service');
    await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
    await gatewayAnswered;
    await page.getByLabel('1. Select Canvas Type').selectOption('SWOT_ANALYSIS');
    await expect(page.getByRole('status')).toContainText('Generating your Business Model Canvas');
    release();
    await expect(page.getByRole('button', { name: /^Generate Canvas$/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Export Canvas', exact: true })).toHaveCount(0);
    await expect(page.getByText('Your generated canvas will appear here.')).toBeVisible();
    await page.getByLabel('1. Select Canvas Type').selectOption('BUSINESS_MODEL_CANVAS');
    await expect(page.getByText('Fixture content for Key Partners', { exact: true })).toBeVisible();
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

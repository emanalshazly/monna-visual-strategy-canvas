import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function generate(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder(/Describe your business idea/i).fill('A fictional neighborhood bicycle repair cooperative');
  const pending = page.waitForResponse((r) => r.url().endsWith('/api/analysis'));
  await page.getByRole('button', { name: /^Generate Canvas$/ }).click();
  expect((await (await pending).json()).receipt.provider).toBe('fake');
  await expect(page.getByText('Fixture content for Key Partners', { exact: true })).toBeVisible();
}

async function delayedRefinements(page: Page) {
  const requests: { ready: Promise<void>; release: () => void }[] = [];
  const gates = [0, 1].map(() => {
    let release!: () => void;
    let ready!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const answered = new Promise<void>((resolve) => { ready = resolve; });
    requests.push({ ready: answered, release });
    return { gate, ready };
  });
  let index = 0;
  await page.route('**/api/analysis', async (route) => {
    if (route.request().postDataJSON().action !== 'refine') return route.continue();
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    expect((await response.json()).receipt.provider).toBe('fake');
    const current = gates[index++];
    expect(current).toBeDefined();
    current.ready();
    await current.gate;
    await route.fulfill({ response });
  });
  return requests;
}

async function exportedBlocks(page: Page, info: TestInfo) {
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^SVG/ }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('Business_Model_Canvas.svg');
  const path = info.outputPath('Business_Model_Canvas.svg');
  await download.saveAs(path);
  expect(await download.failure()).toBeNull();
  const text = await readFile(path, 'utf8');
  expect(Buffer.byteLength(text)).toBeGreaterThan(1000);
  return page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
    return {
      root: doc.documentElement.localName,
      errors: doc.querySelectorAll('parsererror').length,
      blocks: Object.fromEntries([...doc.querySelectorAll('.canvas-block')].map((block) => [
        block.querySelector('title')?.textContent,
        block.querySelector('.prose')?.textContent,
      ])),
    };
  }, text);
}

test.beforeEach(async ({ request }) => {
  expect((await (await request.get('/healthz')).json()).provider).toBe('fake');
});

test('pending refinement cannot replace newer manual edits in the saved SVG', async ({ page }, info) => {
  await generate(page);
  const requests = await delayedRefinements(page);
  try {
    await page.getByRole('button', { name: 'Edit Key Partners' }).click();
    await page.getByRole('button', { name: 'Refine with AI', exact: true }).click();
    await requests[0].ready;
    const manual = 'Manual cooperative partners & repair shops';
    const editor = page.getByPlaceholder('Enter your content here...');
    await editor.fill(manual);
    requests[0].release();
    await expect(page.getByRole('button', { name: 'Refine with AI', exact: true })).toBeEnabled();
    await expect(editor).toHaveValue(manual);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    const artifact = await exportedBlocks(page, info);
    expect(artifact.root).toBe('svg');
    expect(artifact.errors).toBe(0);
    expect(Object.keys(artifact.blocks)).toHaveLength(9);
    expect(artifact.blocks['Key Partners']).toBe(manual);
    expect(artifact.blocks['Key Activities']).toBe('Fixture content for Key Activities');
  } finally {
    requests.forEach((r) => r.release());
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('cancelled block refinement cannot replace a reopened block or finish its request', async ({ page }, info) => {
  await generate(page);
  const requests = await delayedRefinements(page);
  try {
    await page.getByRole('button', { name: 'Edit Key Partners' }).click();
    await page.getByRole('button', { name: 'Refine with AI', exact: true }).click();
    await requests[0].ready;
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Key Activities' }).click();
    await expect(page.getByRole('button', { name: 'Refine with AI', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Refine with AI', exact: true }).click();
    await requests[1].ready;
    const oldResponse = page.waitForResponse((r) => r.url().endsWith('/api/analysis') && r.request().postDataJSON().blockTitle === 'Key Partners');
    requests[0].release();
    await (await oldResponse).finished();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    await expect(page.getByRole('button', { name: 'Refining...', exact: true })).toBeDisabled();
    await expect(page.getByPlaceholder('Enter your content here...')).toHaveValue('Fixture content for Key Activities');
    requests[1].release();
    await expect(page.getByRole('button', { name: 'Refine with AI', exact: true })).toBeEnabled();
    await expect(page.getByPlaceholder('Enter your content here...')).toHaveValue('Refined: Fixture content for Key Activities');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    const artifact = await exportedBlocks(page, info);
    expect(artifact.root).toBe('svg');
    expect(artifact.errors).toBe(0);
    expect(artifact.blocks['Key Activities']).toBe('Refined: Fixture content for Key Activities');
    expect(artifact.blocks['Key Partners']).toBe('Fixture content for Key Partners');
  } finally {
    requests.forEach((r) => r.release());
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('unchanged drafts still accept a normal refinement in the downloaded SVG', async ({ page }, info) => {
  await generate(page);
  await page.getByRole('button', { name: 'Edit Key Partners' }).click();
  await page.getByRole('button', { name: 'Refine with AI', exact: true }).click();
  await expect(page.getByPlaceholder('Enter your content here...')).toHaveValue('Refined: Fixture content for Key Partners');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  const artifact = await exportedBlocks(page, info);
  expect(artifact.root).toBe('svg');
  expect(artifact.errors).toBe(0);
  expect(artifact.blocks['Key Partners']).toBe('Refined: Fixture content for Key Partners');
  expect(artifact.blocks['Key Activities']).toBe('Fixture content for Key Activities');
});

import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function generateEditAndExport(page: Page, info: TestInfo) {
  await expect(page.getByRole('heading', { name: /Visual Strategy Canvas AI/i })).toBeVisible();
  await page.getByPlaceholder(/Describe your business idea/i).fill('A fictional cooperative that repairs bicycles');
  const generated = page.waitForResponse((r) => r.url().endsWith('/api/analysis'));
  await page.getByRole('button', { name: /^Generate Canvas$/ }).click();
  expect((await (await generated).json()).receipt.provider).toBe('fake');
  await expect(page.getByText('Fixture content for Key Partners', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit Key Partners' }).click();
  await page.getByPlaceholder('Enter your content here...').fill('Fictional bicycle cooperative partners');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^SVG/ }).click();
  const download = await pending;
  const path = info.outputPath('Business_Model_Canvas.svg');
  await download.saveAs(path);
  expect(await download.failure()).toBeNull();
  const source = await readFile(path, 'utf8');
  const artifact = await page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const partner = [...doc.querySelectorAll('.canvas-block')].find((block) => block.querySelector('title')?.textContent === 'Key Partners');
    return {
      root: doc.documentElement.localName,
      errors: doc.querySelectorAll('parsererror').length,
      blocks: doc.querySelectorAll('.canvas-block').length,
      content: partner?.querySelector('.prose')?.textContent,
    };
  }, source);
  expect(artifact).toEqual({ root: 'svg', errors: 0, blocks: 9, content: 'Fictional bicycle cooperative partners' });
}

for (const area of ['localStorage', 'sessionStorage'] as const) {
  test(`the complete canvas journey works with exhausted ${area}`, async ({ page }, info) => {
    await page.addInitScript((name) => {
      // Fill real Chromium storage in this disposable test context. No API is mocked.
      const storage = window[name];
      storage.clear();
      let value = '';
      for (let size = 1024 * 1024; size >= 1; size = Math.floor(size / 2)) {
        while (value.length + size <= 8 * 1024 * 1024) {
          const next = value + 'x'.repeat(size);
          try { storage.setItem('fictional-quota-fixture', next); value = next; }
          catch (error) {
            if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') throw error;
            break;
          }
        }
      }
      let full = false;
      try { storage.setItem('fictional-quota-probe', 'x'); }
      catch (error) { full = error instanceof DOMException && error.name === 'QuotaExceededError'; }
      (window as unknown as { quotaFixture: { area: string; full: boolean } }).quotaFixture = { area: name, full };
    }, area);
    await page.goto('/');
    expect(await page.evaluate(() => (window as unknown as { quotaFixture: unknown }).quotaFixture)).toEqual({ area, full: true });
    await generateEditAndExport(page, info);
  });
}

test('normal storage retains its identifiers across reload and exports edits', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Visual Strategy Canvas AI/i })).toBeVisible();
  const before = await page.evaluate(() => [localStorage.getItem('abtest_user_id'), sessionStorage.getItem('abtest_session')]);
  expect(before.every(Boolean)).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Visual Strategy Canvas AI/i })).toBeVisible();
  expect(await page.evaluate(() => [localStorage.getItem('abtest_user_id'), sessionStorage.getItem('abtest_session')])).toEqual(before);
  await generateEditAndExport(page, info);
});

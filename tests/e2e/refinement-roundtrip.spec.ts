import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const content = 'Fictional repair cooperative. ' + 'A'.repeat(10_000 - 'Fictional repair cooperative. '.length);

for (const viewport of [{ width: 1280, height: 900 }, { width: 393, height: 851 }]) {
  test(`refines an accepted response again and exports it at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#canvas-type').selectOption('SWOT_ANALYSIS');
    await page.locator('#user-input').fill('A fictional neighborhood repair cooperative.');
    await page.getByRole('button', { name: /^Generate Canvas$/ }).click();
    await page.getByRole('button', { name: 'Edit Strengths', exact: true }).click();
    const editor = page.getByPlaceholder('Enter your content here...');
    await editor.fill(content);
    await page.getByRole('button', { name: 'Refine with AI', exact: true }).click();
    await expect(editor).toHaveValue(`Refined: ${content}`);
    await page.screenshot({ path: testInfo.outputPath('before-second-refine.png'), fullPage: true });
    const response = page.waitForResponse((value) => value.url().endsWith('/api/analysis') && value.request().method() === 'POST');
    await page.getByRole('button', { name: 'Refine with AI', exact: true }).click();
    expect((await response).status()).toBe(200);
    const expected = `Refined: Refined: ${content}`;
    await expect(editor).toHaveValue(expected);
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: /^SVG/ }).click();
    const download = await downloading;
    const artifact = testInfo.outputPath('refined-canvas.svg');
    await download.saveAs(artifact);
    const xml = await readFile(artifact, 'utf8');
    const result = await page.evaluate(({ xml, expected }) => {
      const document = new DOMParser().parseFromString(xml, 'image/svg+xml');
      const block = [...document.querySelectorAll('g.canvas-block')].find((value) => value.querySelector('title')?.textContent === 'Strengths');
      return { valid: !document.querySelector('parsererror'), preserved: block?.textContent?.includes(expected), blocks: document.querySelectorAll('g.canvas-block').length };
    }, { xml, expected });
    expect(result).toEqual({ valid: true, preserved: true, blocks: 4 });
    await page.screenshot({ path: testInfo.outputPath('after-export.png'), fullPage: true });
  });
}

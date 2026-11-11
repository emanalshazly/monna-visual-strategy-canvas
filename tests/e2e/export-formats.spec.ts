import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

for (const format of ['PNG', 'JPEG', 'PDF'] as const) {
  test(`${format} download remains usable after dependency updates`, async ({ page, request }, info) => {
    const health = await request.get('/healthz');
    expect((await health.json()).provider).toBe('fake');
    await page.goto('/');
    await page.getByPlaceholder(/Describe your business idea/i).fill('A fictional bicycle repair cooperative');
    await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
    await expect(page.getByText('Fixture content for Key Partners', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: new RegExp(`^${format}`) }).click();
    const download = await pending;
    const extension = format.toLowerCase();
    expect(download.suggestedFilename()).toBe(`Business_Model_Canvas.${extension}`);
    const filename = info.outputPath(download.suggestedFilename());
    await download.saveAs(filename);
    expect(await download.failure()).toBeNull();
    const bytes = await readFile(filename);
    expect(bytes.byteLength).toBeGreaterThan(1_000);

    if (format === 'PDF') {
      const document = bytes.toString('latin1');
      expect(document.startsWith('%PDF-')).toBe(true);
      expect(document.trimEnd().endsWith('%%EOF')).toBe(true);
      expect(document).toMatch(/\/Type\s*\/Page\b/);
      expect(document).toMatch(/\/Subtype\s*\/Image\b/);
    } else {
      const dimensions = await page.evaluate(async ({ data, type }) => {
        const bitmap = await createImageBitmap(new Blob([Uint8Array.from(data)], { type }));
        const result = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return result;
      }, { data: [...bytes], type: format === 'PNG' ? 'image/png' : 'image/jpeg' });
      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
    }
    await expect(page.getByRole('heading', { name: 'Export Canvas', exact: true })).toHaveCount(0);
  });
}

import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('recovers from an automatic speech restart rejection and exports a saved brief', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    class RecognitionFixture {
      static current: RecognitionFixture;
      attempts = 0;
      onend?: () => void;
      constructor() { RecognitionFixture.current = this; }
      start() {
        this.attempts += 1;
        if (this.attempts === 2) throw new DOMException('Synthetic restart rejection', 'InvalidStateError');
      }
      stop() {}
    }
    Object.assign(window, { SpeechRecognition: RecognitionFixture });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Advanced Voice Input', exact: true }).click();
  await page.getByRole('button', { name: 'Start Recording', exact: true }).click();
  await page.evaluate(() => {
    const fixture = window as unknown as { SpeechRecognition: { current: { onend(): void } } };
    queueMicrotask(() => fixture.SpeechRecognition.current.onend());
  });
  await expect(page.getByText('Could not restart speech recognition. Please start recording again.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start Recording', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop Recording', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  const brief = 'A fictional repair cooperative after a recovered recording error';
  await page.getByPlaceholder('Your transcribed text will appear here...').fill(brief);
  await page.getByRole('button', { name: 'Save & Close', exact: true }).click();
  const request = page.waitForRequest((r) => r.url().endsWith('/api/analysis') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Generate Canvas', exact: true }).click();
  expect((await request).postDataJSON().userInput).toBe(brief);
  await page.getByRole('button', { name: 'Edit Key Partners', exact: true }).click();
  await page.getByPlaceholder('Enter your content here...').fill(brief);
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
  const completed = page.waitForEvent('download');
  await page.getByRole('button', { name: /^SVG/ }).click();
  const download = await completed;
  expect(await download.failure()).toBeNull();
  const xml = await readFile((await download.path())!, 'utf8');
  expect(await page.evaluate(({ xml, brief }) => {
    const document = new DOMParser().parseFromString(xml, 'image/svg+xml');
    return !document.querySelector('parsererror') && document.documentElement.localName === 'svg' && document.documentElement.textContent?.includes(brief);
  }, { xml, brief })).toBe(true);
});

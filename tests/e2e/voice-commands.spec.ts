import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

for (const phrase of ['We produce clear text reports for fictional shops.', 'We help studios stop recording duplicate interviews.']) {
  test(`ordinary voice text survives submission and SVG export: ${phrase}`, async ({ page }) => {
    await page.addInitScript(() => {
      class SpeechFixture {
        static current: SpeechFixture;
        onresult?: (event: unknown) => void;
        start() { SpeechFixture.current = this; }
        stop() {}
      }
      Object.assign(window, { SpeechRecognition: SpeechFixture });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Advanced Voice Input', exact: true }).click();
    await page.getByRole('button', { name: 'Start Recording', exact: true }).click();
    await page.evaluate((text) => {
      const fixture = window as unknown as { SpeechRecognition: { current: { onresult(event: unknown): void } } };
      fixture.SpeechRecognition.current.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text, confidence: 1 }], { isFinal: true })] });
    }, phrase);
    await expect(page.getByPlaceholder('Your transcribed text will appear here...')).toHaveValue(phrase);
    await expect(page.getByRole('button', { name: 'Stop Recording', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save & Close', exact: true }).click();
    const request = page.waitForRequest((r) => r.url().endsWith('/api/analysis') && r.method() === 'POST');
    await page.getByRole('button', { name: 'Generate Canvas', exact: true }).click();
    expect((await request).postDataJSON().userInput).toBe(phrase);
    await page.getByRole('button', { name: 'Edit Key Partners', exact: true }).click();
    await page.getByPlaceholder('Enter your content here...').fill(phrase);
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
    const completed = page.waitForEvent('download');
    await page.getByRole('button', { name: /^SVG/ }).click();
    const download = await completed;
    expect(await download.failure()).toBeNull();
    const xml = await readFile((await download.path())!, 'utf8');
    const parsed = await page.evaluate(({ xml, phrase }) => {
      const document = new DOMParser().parseFromString(xml, 'image/svg+xml');
      return { errors: document.querySelectorAll('parsererror').length, hasText: document.documentElement.textContent?.includes(phrase), root: document.documentElement.localName };
    }, { xml, phrase });
    expect(parsed).toEqual({ errors: 0, hasText: true, root: 'svg' });
  });
}

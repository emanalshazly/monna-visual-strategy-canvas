import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function speech(page: Page, text: string, final = false) {
  await page.evaluate(async ({ text, final }) => {
    const fixture = window as unknown as { voiceRecognition: { onresult(event: unknown): void } };
    fixture.voiceRecognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text, confidence: 1 }], { isFinal: final })] });
    // Finalization can leave the displayed value unchanged. Wait for React's
    // effects before delivering the next utterance, rather than matching old text.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, { text, final });
}

for (const edit of [false, true]) {
  test(`visible interim brief survives ${edit ? 'manual editing and finalization' : 'save without finalization'}, generation and export`, async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      class Recognition {
        constructor() { Object.assign(window, { voiceRecognition: this }); }
        start() {}
        stop() {}
      }
      Object.assign(window, { SpeechRecognition: Recognition });
      // Keep this draft test independent of microphone permission/device behavior.
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('No audio device in draft fixture')) } });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Advanced Voice Input', exact: true }).click();
    await page.getByRole('button', { name: 'Start Recording', exact: true }).click();
    const phrase = 'A fictional repair cooperative';
    const expected = edit ? `${phrase}. Serving local shops` : phrase;
    const editor = page.getByPlaceholder('Your transcribed text will appear here...');
    await speech(page, phrase);
    await expect(editor).toHaveValue(phrase);
    if (edit) {
      await editor.press('End');
      await editor.press('.');
      await expect(editor).toHaveValue(`${phrase}.`);
      await speech(page, `${phrase} revised`);
      await expect(editor).toHaveValue(`${phrase}.`);
      await speech(page, `${phrase} revised`, true);
      await expect(editor).toHaveValue(`${phrase}.`);
      await speech(page, 'Serving local shops');
    }
    await expect(editor).toHaveValue(expected);
    await page.screenshot({ path: testInfo.outputPath('visible-brief.png') });
    await page.getByRole('button', { name: 'Save & Close', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByPlaceholder(/Describe your business idea/)).toHaveValue(expected);
    const request = page.waitForRequest((r) => r.url().endsWith('/api/analysis') && r.method() === 'POST');
    await page.getByRole('button', { name: 'Generate Canvas', exact: true }).click();
    expect((await request).postDataJSON().userInput).toBe(expected);
    await page.getByRole('button', { name: 'Edit Key Partners', exact: true }).click();
    await page.getByPlaceholder('Enter your content here...').fill(expected);
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
    const pendingDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: /^SVG/ }).click();
    const download = await pendingDownload;
    expect(await download.failure()).toBeNull();
    const output = testInfo.outputPath('voice-brief.svg');
    await download.saveAs(output);
    const xml = await readFile(output, 'utf8');
    const artifact = await page.evaluate((xml) => {
      const document = new DOMParser().parseFromString(xml, 'image/svg+xml');
      return { errors: document.querySelectorAll('parsererror').length, root: document.documentElement.localName, text: document.documentElement.textContent };
    }, xml);
    expect(artifact.errors).toBe(0);
    expect(artifact.root).toBe('svg');
    expect(artifact.text).toContain(expected);
    for (const label of ['Key Partners', 'Key Activities', 'Value Propositions', 'Customer Relationships', 'Customer Segments', 'Key Resources', 'Channels', 'Cost Structure', 'Revenue Streams']) expect(artifact.text).toContain(label);
  });
}

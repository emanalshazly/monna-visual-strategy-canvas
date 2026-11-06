import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function speech(page: Page, text: string, final = false) {
  await speechBatch(page, [[text, final]]);
}

async function speechBatch(page: Page, results: Array<[string, boolean]>) {
  await page.evaluate(async (results) => {
    const fixture = window as unknown as { voiceRecognition: { emit(results: Array<[string, boolean]>): void } };
    fixture.voiceRecognition.emit(results);
    // Finalization can leave the displayed value unchanged. Wait for React's
    // effects before delivering the next utterance, rather than matching old text.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, results);
}

for (const scenario of ['save without finalization', 'manual editing', 'batched finalization', 'automatic restart', 'retracted interim', 'split clear command', 'split stop command']) {
  const commandCase = scenario.startsWith('split ');
  test(`visible interim brief survives ${scenario}${commandCase ? ' and save' : ', generation and export'}`, async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      class Recognition {
        history: unknown[] = [];
        onresult?: (event: unknown) => void;
        onend?: () => void;
        constructor() { Object.assign(window, { voiceRecognition: this }); }
        start() { this.history = []; }
        stop() {}
        emit(results: Array<[string, boolean]>) {
          const resultIndex = this.history.length;
          const batch = results.map(([text, isFinal]) => Object.assign([{ transcript: text, confidence: 1 }], { isFinal }));
          this.onresult?.({ resultIndex, results: [...this.history, ...batch] });
          this.history.push(...batch.filter(result => result.isFinal));
        }
      }
      Object.assign(window, { SpeechRecognition: Recognition });
      // Keep this draft test independent of microphone permission/device behavior.
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('No audio device in draft fixture')) } });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Advanced Voice Input', exact: true }).click();
    await page.getByRole('button', { name: 'Start Recording', exact: true }).click();
    const phrase = 'A fictional repair cooperative';
    const edit = scenario !== 'save without finalization';
    let expected = edit ? `${phrase}. Serving local shops` : phrase;
    const editor = page.getByPlaceholder('Your transcribed text will appear here...');
    await speech(page, phrase);
    await expect(editor).toHaveValue(phrase);
    if (edit) {
      await editor.press('End');
      await editor.press('.');
      await expect(editor).toHaveValue(`${phrase}.`);
      if (scenario === 'retracted interim') {
        await speechBatch(page, []);
        await speech(page, 'Serving shops');
        await expect(editor).toHaveValue(`${phrase}. Serving shops`);
        await speech(page, 'Serving local shops', true);
      } else if (scenario === 'split clear command') {
        await speech(page, phrase, true);
        await speechBatch(page, [['clear ', true], ['text', true]]);
        await expect(editor).toHaveValue('');
        expected = 'A fictional replacement brief after clearing';
        await editor.fill(expected);
      } else if (scenario === 'split stop command') {
        await speech(page, phrase, true);
        await speechBatch(page, [['stop ', true], ['recording', true]]);
        await expect(page.getByRole('button', { name: 'Start Recording', exact: true })).toBeVisible();
        // Stop/reset draft retention is tracked separately in #13. This case
        // proves command matching, then checks manual input still saves/exports.
        expected = 'A fictional replacement brief after stopping';
        await editor.fill(expected);
      } else if (scenario === 'batched finalization') {
        await speechBatch(page, [[`${phrase} revised`, true], ['Serving local shops', true]]);
      } else if (scenario === 'automatic restart') {
        await page.evaluate(() => {
          const fixture = window as unknown as { voiceRecognition: { onend(): void } };
          fixture.voiceRecognition.onend();
        });
        await speech(page, 'Serving shops');
        await expect(editor).toHaveValue(`${phrase}. Serving shops`);
        await speech(page, 'Serving local shops', true);
      } else {
        await speech(page, `${phrase} revised`);
        await expect(editor).toHaveValue(`${phrase}.`);
        await speech(page, `${phrase} revised`, true);
        await expect(editor).toHaveValue(`${phrase}.`);
        await speech(page, 'Serving local shops');
      }
    }
    await expect(editor).toHaveValue(expected);
    await page.screenshot({ path: testInfo.outputPath('visible-brief.png') });
    await page.getByRole('button', { name: 'Save & Close', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByPlaceholder(/Describe your business idea/)).toHaveValue(expected);
    // Command cases prove recognition and the saved parent draft. Other cases
    // cover generation/export without exhausting the shared gateway rate limit.
    if (commandCase) return;
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

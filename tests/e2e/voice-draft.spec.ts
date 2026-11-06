import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

// Speech recognition results are deterministic fixtures. The application,
// audio capture (Chromium's synthetic device), gateway and export are real.
test.use({
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
  permissions: ['microphone'],
  video: 'retain-on-failure',
});

async function speechFixture(page: Page) {
  await page.addInitScript(() => {
    class FixtureRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onresult?: (event: unknown) => void;
      onend?: () => void;
      constructor() {
        Object.assign(window, { voiceFixture: this });
      }
      start() {}
      stop() { queueMicrotask(() => this.onend?.()); }
    }
    Object.assign(window, { SpeechRecognition: FixtureRecognition });
  });
}

async function exportEditedCanvas(page: Page, outputPath: string) {
  const generation = page.waitForRequest((request) => request.url().endsWith('/api/analysis') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Generate Canvas', exact: true }).click();
  const request = await generation;
  await expect(page.getByText('Fixture content for Value Propositions')).toBeVisible();
  await page.getByRole('button', { name: 'Edit Key Partners', exact: true }).click();
  const edited = 'Voice-led repair partners & reuse workshop';
  await page.getByPlaceholder('Enter your content here...').fill(edited);
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /^SVG/ }).click();
  const download = await pendingDownload;
  await download.saveAs(outputPath);
  const bytes = await readFile(outputPath, 'utf8');
  const artifact = await page.evaluate((svg) => {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return {
      errors: document.querySelectorAll('parsererror').length,
      svg: document.documentElement.localName,
      text: document.documentElement.textContent,
    };
  }, bytes);
  expect(artifact.errors).toBe(0);
  expect(artifact.svg).toBe('svg');
  expect(artifact.text).toContain(edited);
  for (const title of ['Key Partners', 'Key Activities', 'Value Propositions', 'Customer Relationships', 'Customer Segments', 'Key Resources', 'Channels', 'Cost Structure', 'Revenue Streams']) {
    expect(artifact.text).toContain(title);
  }
  return request.postDataJSON() as { userInput: string };
}

test('stopping speech retains the brief through generation and a completed SVG export', async ({ page }, testInfo) => {
  await speechFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Advanced Voice Input', exact: true }).click();
  await page.getByRole('button', { name: 'Start Recording', exact: true }).click();
  const brief = 'A fictional neighborhood repair cooperative & reuse workshop';
  await page.evaluate((text) => {
    const fixture = (window as unknown as { voiceFixture: { onresult: (event: unknown) => void } }).voiceFixture;
    fixture.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text, confidence: 0.99 }], { isFinal: true })] });
  }, brief);
  const editor = page.getByPlaceholder('Your transcribed text will appear here...');
  await expect(editor).toHaveValue(brief);
  await page.screenshot({ path: testInfo.outputPath('before-stop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Stop Recording', exact: true }).click();
  await expect(editor).toHaveValue(brief);
  await page.screenshot({ path: testInfo.outputPath('after-stop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save & Close', exact: true }).click();
  await expect(page.getByPlaceholder(/Describe your business idea/)).toHaveValue(brief);
  const request = await exportEditedCanvas(page, testInfo.outputPath('voice-brief.svg'));
  expect(request.userInput).toBe(brief);
});

test('a manually edited voice-modal brief still reaches generation and export', async ({ page }, testInfo) => {
  await speechFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Advanced Voice Input', exact: true }).click();
  const brief = 'A fictional cooperative typed without starting speech recognition';
  await page.getByPlaceholder('Your transcribed text will appear here...').fill(brief);
  await page.getByRole('button', { name: 'Save & Close', exact: true }).click();
  const request = await exportEditedCanvas(page, testInfo.outputPath('manual-brief.svg'));
  expect(request.userInput).toBe(brief);
});

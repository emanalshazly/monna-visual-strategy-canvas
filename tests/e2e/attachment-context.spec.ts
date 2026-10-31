import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const oldText = 'Fictional OLD document: bicycle sales only.';
const newText = 'Fictional NEW document: weekly bicycle repairs and shared tools.';
// Two valid, generated 1x1 RGB PNG fixtures, never private photographs.
const oldPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4wCUCAAL8AQ+ZkTKPAAAAAElFTkSuQmCC';
const newPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgEvkAAAE6AQ9sjS6hAAAAAElFTkSuQmCC';
const savedEdit = 'Fictional attachment check: "current context" & <shared tools>.';

type Kind = 'document' | 'image';
type HeldRead = { name: string; reader: FileReader; event: ProgressEvent<FileReader>; callback: (this: FileReader, event: ProgressEvent<FileReader>) => unknown };
type ReadWindow = Window & {
  heldAttachmentReads: HeldRead[];
  completedAttachmentReads: { name: string; trusted: boolean; resultLength: number }[];
  abortedAttachmentReads: { name: string; before: number; after: number }[];
};

async function instrumentDelivery(page: Page) {
  await page.addInitScript(() => {
    const state = window as unknown as ReadWindow;
    state.heldAttachmentReads = [];
    state.completedAttachmentReads = [];
    state.abortedAttachmentReads = [];
    const names = new WeakMap<FileReader, string>();
    const readText = FileReader.prototype.readAsText;
    const readData = FileReader.prototype.readAsDataURL;
    const descriptor = Object.getOwnPropertyDescriptor(FileReader.prototype, 'onload')!;
    const abortFixture = (reader: FileReader, blob: Blob) => {
      if ((blob as File).name.startsWith('abort-')) {
        const before = reader.readyState;
        reader.abort();
        state.abortedAttachmentReads.push({ name: (blob as File).name, before, after: reader.readyState });
      }
    };
    FileReader.prototype.readAsText = function (blob, ...args) {
      names.set(this, (blob as File).name); readText.call(this, blob, ...args); abortFixture(this, blob);
    };
    FileReader.prototype.readAsDataURL = function (blob) {
      names.set(this, (blob as File).name); readData.call(this, blob); abortFixture(this, blob);
    };
    Object.defineProperty(FileReader.prototype, 'onload', {
      ...descriptor,
      set(callback) {
        descriptor.set!.call(this, callback && function (this: FileReader, event: ProgressEvent<FileReader>) {
          const name = names.get(this)!;
          state.completedAttachmentReads.push({ name, trusted: event.isTrusted, resultLength: String(this.result).length });
          if (name.startsWith('hold-')) state.heldAttachmentReads.push({ name, reader: this, event, callback });
          else callback.call(this, event);
        });
      },
    });
  });
}

async function select(page: Page, info: TestInfo, kind: Kind, older: boolean, held = false, aborted = false) {
  const name = (aborted ? 'abort-' : held ? 'hold-' : '') + (older ? 'old' : 'new') + (kind === 'document' ? '.txt' : '.png');
  const file = info.outputPath(name);
  await writeFile(file, kind === 'document' ? (older ? oldText : newText) : Buffer.from(older ? oldPng : newPng, 'base64'));
  await page.locator(kind === 'document' ? '#file-upload' : '#image-upload').setInputFiles(file);
  await page.waitForFunction((name) => [...(window as unknown as ReadWindow).completedAttachmentReads,
    ...(window as unknown as ReadWindow).abortedAttachmentReads].some(r => r.name === name), name);
  if (!held && !aborted && kind === 'image') {
    await expect(page.getByAltText('Preview')).toBeVisible();
    expect(await page.getByAltText('Preview').evaluate((img: HTMLImageElement) => img.decode().then(() => img.naturalWidth))).toBe(1);
  }
  return name;
}

async function release(page: Page, name: string) {
  await page.evaluate((name) => {
    const reads = (window as unknown as ReadWindow).heldAttachmentReads;
    const index = reads.findIndex(r => r.name === name);
    if (index < 0) throw Error('No completed native read is held for ' + name);
    const [read] = reads.splice(index, 1);
    read.callback.call(read.reader, read.event);
  }, name);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function generate(page: Page) {
  const pending = page.waitForResponse(r => r.url().endsWith('/api/analysis'));
  await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
  const response = await pending;
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.receipt.provider).toBe('fake');
  await expect(page.getByText('Fixture content for Value Propositions')).toBeVisible();
  return { submitted: response.request().postDataJSON(), receipt: body.receipt };
}

async function editAndExport(page: Page, info: TestInfo) {
  await page.getByRole('button', { name: 'Edit Key Partners', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByPlaceholder('Enter your content here...').fill(savedEdit);
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^SVG/ }).click();
  const download = await pending;
  const file = info.outputPath('attachment-workflow.svg');
  await download.saveAs(file); expect(await download.failure()).toBeNull();
  const bytes = await readFile(file);
  const svg = await page.evaluate(source => {
    const xml = new DOMParser().parseFromString(source, 'image/svg+xml');
    const blocks = Array.from(xml.querySelectorAll('g.canvas-block'));
    return { errors: xml.querySelectorAll('parsererror').length, namespace: xml.documentElement.namespaceURI,
      blockCount: blocks.length, partners: blocks.find(g => g.querySelector('title')?.textContent === 'Key Partners')
        ?.querySelector('foreignObject .prose p')?.textContent };
  }, bytes.toString());
  expect(svg).toEqual({ errors: 0, namespace: 'http://www.w3.org/2000/svg', blockCount: 9, partners: savedEdit });
  return { bytes: bytes.length, filename: download.suggestedFilename(), ...svg };
}

const cases = [
  { name: 'latest document wins', kind: 'document', action: 'reorder' },
  { name: 'latest image wins', kind: 'image', action: 'reorder' },
  { name: 'removal invalidates an older image read', kind: 'image', action: 'remove' },
  { name: 'generation waits for its document', kind: 'document', action: 'pending' },
  { name: 'generation waits for its image', kind: 'image', action: 'pending' },
  { name: 'a rejected document selection keeps its error and ignores the older read', kind: 'document', action: 'reject' },
  { name: 'an aborted document read reports failure and can recover', kind: 'document', action: 'abort' },
  { name: 'an aborted image read reports failure and can recover', kind: 'image', action: 'abort' },
  { name: 'ordinary document read remains usable', kind: 'document', action: 'normal' },
  { name: 'ordinary image read remains usable', kind: 'image', action: 'normal' },
] as const;

for (const scenario of cases) test(scenario.name, async ({ page }, info) => {
  await instrumentDelivery(page);
  await page.goto('/');
  await page.getByPlaceholder(/Describe your business idea/i).fill('A fictional bicycle cooperative offering repairs and shared tools.');
  let expectedDocument = '', expectedImage: { data: string; mimeType: string } | undefined;
  let prematurelyEnabled: boolean | null = null, prematureRequest: unknown = null, errorAfterRelease: string | null = null;
  let abortError: string | null = null;
  if (scenario.action === 'abort') {
    await select(page, info, scenario.kind, true, false, true);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    abortError = await page.getByRole('alert').count() ? await page.getByRole('alert').textContent() : null;
    await select(page, info, scenario.kind, false);
  } else if (scenario.action === 'normal') {
    await select(page, info, scenario.kind, false);
  } else {
    const old = await select(page, info, scenario.kind, true, true);
    if (scenario.action === 'reorder' || scenario.action === 'remove') {
      await select(page, info, scenario.kind, false);
      if (scenario.action === 'remove') {
        await page.getByAltText('Preview').locator('..').getByRole('button').click();
      }
    } else if (scenario.action === 'pending') {
      const button = page.getByRole('button', { name: /^(Generate Canvas|Reading attachments\.\.\.)$/i });
      prematurelyEnabled = await button.isEnabled();
      if (prematurelyEnabled) prematureRequest = await generate(page);
    } else if (scenario.action === 'reject') {
      const file = info.outputPath('unsupported.pdf'); await writeFile(file, 'Fictional invalid context fixture');
      await page.locator('#file-upload').setInputFiles(file);
      await expect(page.getByRole('alert')).toContainText('Only plain-text documents are supported.');
    }
    await release(page, old);
    if (scenario.action === 'reject') errorAfterRelease = await page.getByRole('alert').count() ? await page.getByRole('alert').textContent() : null;
  }
  if (scenario.action !== 'remove' && scenario.action !== 'reject') {
    const older = scenario.action === 'pending';
    if (scenario.kind === 'document') expectedDocument = older ? oldText : newText;
    else expectedImage = { data: older ? oldPng : newPng, mimeType: 'image/png' };
  }
  const actual = await generate(page);
  const artifact = await editAndExport(page, info);
  const reads = await page.evaluate(() => (window as unknown as ReadWindow).completedAttachmentReads);
  const aborts = await page.evaluate(() => (window as unknown as ReadWindow).abortedAttachmentReads);
  expect(reads.every(r => r.trusted)).toBe(true);
  const observation = { scenario, expectedDocument, expectedImage: expectedImage ?? null, prematurelyEnabled, prematureRequest,
    errorAfterRelease, abortError, actual, nativeReads: reads, nativeAborts: aborts, artifact };
  const path = info.outputPath('observations.json');
  await writeFile(path, JSON.stringify(observation, null, 2) + '\n');
  await info.attach('observations', { path, contentType: 'application/json' });
  expect.soft(actual.submitted.fileContent, 'current completed document is submitted').toBe(expectedDocument);
  expect.soft(actual.submitted.image, 'current completed image is submitted').toEqual(expectedImage);
  if (scenario.action === 'pending') expect.soft(prematurelyEnabled, 'generation stays disabled until context is ready').toBe(false);
  if (scenario.action === 'reject') expect.soft(errorAfterRelease).toContain('Only plain-text documents are supported.');
  if (scenario.action === 'abort') {
    expect(aborts).toHaveLength(1); expect(aborts[0].before).toBe(1); expect(aborts[0].after).toBe(2);
    expect.soft(abortError).toContain('could not be read');
  }
});

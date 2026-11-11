import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const bmc = ['Channels', 'Value Propositions', 'Key Partners', 'Key Activities',
  'Customer Relationships', 'Customer Segments', 'Key Resources', 'Cost Structure', 'Revenue Streams'];
const swot = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'];

async function saveSvg(page: Page, info: TestInfo, name: string) {
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^SVG/ }).click();
  const download = await pending;
  const path = info.outputPath(name);
  await download.saveAs(path);
  expect(await download.failure()).toBeNull();
  const source = await readFile(path, 'utf8');
  const parsed = await page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    return {
      root: doc.documentElement.localName,
      errors: doc.querySelectorAll('parsererror').length,
      blocks: [...doc.querySelectorAll('.canvas-block')].map((block) => {
        const rect = block.querySelector('rect')!;
        return {
          title: block.querySelector('title')?.textContent,
          content: block.querySelector('.prose')?.textContent,
          x: parseFloat(rect.getAttribute('x')!), y: parseFloat(rect.getAttribute('y')!),
          width: parseFloat(rect.getAttribute('width')!), height: parseFloat(rect.getAttribute('height')!),
        };
      }),
    };
  }, source);
  expect(parsed.root).toBe('svg');
  expect(parsed.errors).toBe(0);
  return { source, blocks: parsed.blocks };
}

for (const mode of ['desktop', 'touch'] as const) {
  test.describe(mode, () => {
    test.use({ viewport: mode === 'touch' ? { width: 393, height: 851 } : { width: 1440, height: 1000 }, hasTouch: mode === 'touch' });

    // SWOT is a valid-layout control: it needs no template change.
    for (const titles of mode === 'desktop' ? [bmc, swot] : [bmc]) {
      const canvas = titles === bmc ? 'Business Model Canvas' : 'SWOT Analysis';
      test(`${canvas} blocks accept pointer edits that survive SVG export`, async ({ page }, info) => {
        await page.goto('/');
        await page.getByLabel('1. Select Canvas Type').selectOption({ label: canvas });
        await page.getByPlaceholder(/Describe your business idea/i).fill('A fictional cooperative that repairs bicycles');
        const response = page.waitForResponse((r) => r.url().endsWith('/api/analysis'));
        await page.getByRole('button', { name: /^Generate Canvas$/ }).click();
        expect((await (await response).json()).receipt.provider).toBe('fake');
        await expect(page.locator('.canvas-block')).toHaveCount(titles.length);
        const initial = await saveSvg(page, info, 'generated.svg');
        expect(initial.blocks.map((b) => b.title).sort()).toEqual([...titles].sort());
        for (const block of initial.blocks) expect(block.content).toBe(`Fixture content for ${block.title}`);

        // Ask the browser what is really painted at each block's center.
        // Merely finding its SVG text also succeeds when another block hides it.
        const hits = [];
        for (const title of titles) {
          const rect = page.getByRole('button', { name: `Edit ${title}`, exact: true }).locator('rect');
          await rect.scrollIntoViewIfNeeded();
          hits.push(await rect.evaluate((element) => {
            const r = element.getBoundingClientRect();
            return {
              intended: element.parentElement?.getAttribute('aria-label'),
              painted: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.canvas-block')?.getAttribute('aria-label'),
            };
          }));
        }
        await writeFile(info.outputPath('painted-targets.json'), JSON.stringify({ hits, exportedBlocks: initial.blocks }, null, 2));
        await page.locator('#canvas-export').screenshot({ path: info.outputPath('generated.png') });

        for (const title of titles) {
          const rect = page.getByRole('button', { name: `Edit ${title}`, exact: true }).locator('rect');
          await rect.scrollIntoViewIfNeeded();
          const box = await rect.boundingBox();
          expect(box).not.toBeNull();
          const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2;
          // Native input dispatch: no force-click or synthetic DOM click can bypass an overlap.
          if (mode === 'touch') await page.touchscreen.tap(x, y);
          else await page.mouse.click(x, y);
          await expect(page.getByRole('heading', { name: /^Editing:/ })).toHaveText(`Editing: ${title}`, { timeout: 3000 });
          await page.getByPlaceholder('Enter your content here...').fill(`Fictional ${title} plan`);
          await page.getByRole('button', { name: 'Save Changes' }).click();
        }
        expect(hits.every((h) => h.intended === h.painted)).toBe(true);
        const completed = await saveSvg(page, info, 'edited.svg');
        expect(completed.blocks).toHaveLength(titles.length);
        for (const block of completed.blocks) expect(block.content).toBe(`Fictional ${block.title} plan`);
        const overlaps = [];
        for (const [i, a] of completed.blocks.entries()) {
          for (const b of completed.blocks.slice(i + 1)) {
            if (Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x)
              && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y)) overlaps.push([a.title, b.title]);
          }
        }
        expect(overlaps).toEqual([]);

        await page.locator('#canvas-export').screenshot({ path: info.outputPath('edited.png') });
      });
    }
  });
}

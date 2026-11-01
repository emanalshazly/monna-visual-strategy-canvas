import { expect, test, type Page } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };

const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function generate(page: Page, canvasType: string, visibleText: string) {
  await page.goto('/');
  await page.selectOption('#canvas-type', canvasType);
  await page.getByPlaceholder(/Describe your business idea/i).fill('A fictional bicycle repair cooperative');
  await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
  await expect(page.getByText(visibleText)).toBeVisible();
}

async function readGeometry(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('#canvas-export svg') as SVGSVGElement;
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return {
      canvas: box(svg),
      headings: [...svg.querySelectorAll(':scope > text')].map((text) => ({ label: text.textContent ?? '', box: box(text) })),
      blocks: [...svg.querySelectorAll('g.canvas-block')].map((group) => ({
        title: group.querySelector('title')?.textContent ?? '',
        box: box(group.querySelector('rect') as SVGRectElement),
      })),
    };
  });
}

test.describe('Value Proposition Canvas section headings', () => {
  test('headings stay fully visible above the blocks and survive export', async ({ page }) => {
    await generate(page, 'VALUE_PROPOSITION_CANVAS', 'Fixture content for Gain Creators');

    const geometry = await readGeometry(page);
    expect(geometry.headings.map((heading) => heading.label)).toEqual(['Value Proposition', 'Customer Segment']);
    expect(geometry.blocks).toHaveLength(6);

    for (const heading of geometry.headings) {
      // The heading must be inside the drawing and must not be covered by any block.
      expect(heading.box.y, `${heading.label} top edge`).toBeGreaterThanOrEqual(geometry.canvas.y);
      const covering = geometry.blocks.filter((block) => intersects(heading.box, block.box)).map((block) => block.title);
      expect(covering, `${heading.label} is covered by`).toEqual([]);
      const topElementText = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.textContent ?? '',
        [heading.box.x + heading.box.width - 4, heading.box.y + heading.box.height / 2],
      );
      expect(topElementText, `${heading.label} right edge is drawn on top`).toBe(heading.label);
    }

    // Edit a block, then confirm the completed SVG download keeps the edit and the headings.
    await page.getByRole('button', { name: 'Edit Gains' }).click();
    await page.getByPlaceholder('Enter your content here...').fill('Fictional "gains" <edited> & kept');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.getByRole('button', { name: 'Export Canvas' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^SVG/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Value_Proposition_Canvas.svg');
    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk));
    const svgText = Buffer.concat(chunks).toString('utf8');

    const exported = await page.evaluate((source) => {
      const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
      if (parsed.querySelector('parsererror')) throw new Error('exported SVG does not parse');
      // html-to-image wraps the page in an outer <svg><foreignObject>; the canvas is the svg that owns the blocks directly.
      const inner = [...parsed.querySelectorAll('svg')].find((svg) => svg.querySelector(':scope > g.canvas-block')) as SVGSVGElement;
      const viewBoxHeight = Number((inner.getAttribute('viewBox') ?? '').split(' ')[3]);
      const percent = (value: string | null) => Number((value ?? '').replace('%', ''));
      return {
        headings: [...inner.querySelectorAll(':scope > text')].map((text) => ({ label: text.textContent, baselineY: Number(text.getAttribute('y')) })),
        blockTops: [...inner.querySelectorAll('g.canvas-block > rect')].map((rect) => (percent(rect.getAttribute('y')) / 100) * viewBoxHeight),
        blockTitles: [...inner.querySelectorAll('g.canvas-block > title')].map((title) => title.textContent),
        editedText: [...inner.querySelectorAll('p')].some((p) => p.textContent === 'Fictional "gains" <edited> & kept'),
        scripts: inner.querySelectorAll('script').length,
      };
    }, svgText);

    expect(exported.blockTitles).toHaveLength(6);
    expect(exported.editedText).toBe(true);
    expect(exported.scripts).toBe(0);
    expect(exported.headings.map((heading) => heading.label)).toEqual(['Value Proposition', 'Customer Segment']);
    const topmostBlock = Math.min(...exported.blockTops);
    for (const heading of exported.headings) {
      expect(heading.baselineY, `${heading.label} baseline sits above the first block row`).toBeLessThan(topmostBlock);
    }
  });

  test('a SWOT canvas without section headings remains a valid control', async ({ page }) => {
    await generate(page, 'SWOT_ANALYSIS', 'Fixture content for Strengths');
    const geometry = await readGeometry(page);
    expect(geometry.headings).toEqual([]);
    expect(geometry.blocks).toHaveLength(4);
    for (const block of geometry.blocks) {
      const others = geometry.blocks.filter((other) => other !== block && intersects(block.box, other.box));
      expect(others, `${block.title} overlaps`).toEqual([]);
    }
  });
});

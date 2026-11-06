import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const longLink = 'https://example.invalid/CooperativePartnerReferenceABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

async function geometry(page: Page, content: string) {
  return page.evaluate((expected) => {
    const block = [...document.querySelectorAll('g.canvas-block')].find((element) => element.querySelector('title')?.textContent === 'Key Partners')!;
    const wrapper = block.querySelector('.prose')!;
    const paragraph = [...wrapper.querySelectorAll('p')].find((element) => element.textContent === expected)!;
    const contentRect = wrapper.getBoundingClientRect();
    const clipRect = block.querySelector('foreignObject')!.getBoundingClientRect();
    const bounds = {
      left: Math.max(contentRect.left, clipRect.left),
      right: Math.min(contentRect.right, clipRect.right),
      top: Math.max(contentRect.top, clipRect.top),
      bottom: Math.min(contentRect.bottom, clipRect.bottom),
    };
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const lines = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0).map(({ left, right, top, bottom }) => ({ left, right, top, bottom }));
    return { bounds, lines, text: paragraph.textContent };
  }, content);
}

function expectVisibleText(result: Awaited<ReturnType<typeof geometry>>, content: string) {
  expect(result.text).toBe(content);
  expect(result.lines.length).toBeGreaterThan(0);
  for (const line of result.lines) {
    expect(line.left).toBeGreaterThanOrEqual(result.bounds.left - 1);
    expect(line.right).toBeLessThanOrEqual(result.bounds.right + 1);
    expect(line.top).toBeGreaterThanOrEqual(result.bounds.top - 1);
    expect(line.bottom).toBeLessThanOrEqual(result.bounds.bottom + 1);
  }
}

for (const { name, width, content } of [
  { name: 'desktop long link', width: 1280, content: longLink },
  { name: 'mobile long link', width: 393, content: longLink },
  { name: 'ordinary spaced-text control', width: 1280, content: 'Local repair shops & reuse cafés' },
]) {
  test(`${name} remains visible after editing and SVG download`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByPlaceholder(/Describe your business idea/i).fill('A fictional neighbourhood repair cooperative');
    await page.getByRole('button', { name: 'Generate Canvas', exact: true }).click();
    await expect(page.getByText('Fixture content for Value Propositions')).toBeVisible();
    await page.getByRole('button', { name: 'Edit Key Partners', exact: true }).focus();
    await page.keyboard.press('Enter');
    const editor = page.getByPlaceholder('Enter your content here...');
    await editor.click();
    await editor.fill(content);
    await expect(editor).toHaveValue(content);
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit Key Partners', exact: true }).getByText(content, { exact: true })).toBeVisible();
    const onCanvas = await geometry(page, content);
    await page.screenshot({ path: testInfo.outputPath('edited-canvas.png'), fullPage: true });

    await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
    const pendingDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: /^SVG/ }).click();
    const download = await pendingDownload;
    const output = testInfo.outputPath('edited-canvas.svg');
    await download.saveAs(output);
    const bytes = await readFile(output, 'utf8');
    const parsed = await page.evaluate((svg) => {
      const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
      return {
        errors: document.querySelectorAll('parsererror').length,
        root: document.documentElement.localName,
        scripts: document.querySelectorAll('script').length,
        eventAttributes: [...document.querySelectorAll('*')].flatMap((element) => [...element.attributes].filter((attribute) => /^on/i.test(attribute.name))),
        blocks: [...document.querySelectorAll('g.canvas-block')].map((block) => ({ title: block.querySelector('title')?.textContent, text: block.querySelector('foreignObject')?.textContent })),
      };
    }, bytes);
    expect(parsed.errors).toBe(0);
    expect(parsed.root).toBe('svg');
    expect(parsed.scripts).toBe(0);
    expect(parsed.eventAttributes).toEqual([]);
    expect(parsed.blocks).toHaveLength(9);
    expect(parsed.blocks.find((block) => block.title === 'Key Partners')?.text).toContain(content);
    for (const title of ['Key Activities', 'Value Propositions', 'Customer Relationships', 'Customer Segments', 'Key Resources', 'Channels', 'Cost Structure', 'Revenue Streams']) {
      expect(parsed.blocks.find((block) => block.title === title)?.text).toContain(`Fixture content for ${title}`);
    }

    const rendered = await page.context().newPage();
    let inDownload;
    try {
      await rendered.setContent(bytes);
      inDownload = await geometry(rendered, content);
      await rendered.screenshot({ path: testInfo.outputPath('rendered-download.png'), fullPage: true });
    } finally {
      await rendered.close();
    }
    await writeFile(testInfo.outputPath('text-bounds.json'), JSON.stringify({ onCanvas, inDownload }, null, 2));
    // Both artifacts are saved before checking clipping, including on the base.
    expectVisibleText(onCanvas, content);
    expectVisibleText(inDownload, content);
  });
}

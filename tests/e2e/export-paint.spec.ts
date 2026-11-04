import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const cases = [
  { canvas: 'Business Model Canvas', block: 'Key Partners', count: 9, theme: 'light' },
  { canvas: "Porter's Five Forces", block: 'Competitive Rivalry', count: 5, theme: 'light' },
  { canvas: 'Value Proposition Canvas', block: 'Products & Services', count: 6, theme: 'light' },
  { canvas: 'SWOT Analysis', block: 'Strengths', count: 4, theme: 'light' },
  { canvas: 'SWOT Analysis', block: 'Strengths', count: 4, theme: 'dark' },
] as const;

async function downloadFormat(page: Page, info: TestInfo, format: string) {
  // Closing a download dialog can put the pointer over a diagram block.
  // Settle that hover transition before comparing independent captures.
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).hover();
  await page.locator('#canvas-export').evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
  });
  await page.getByRole('button', { name: 'Export Canvas', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: new RegExp(`^${format}\\b`) }).click();
  const download = await pending;
  const path = info.outputPath(download.suggestedFilename());
  await download.saveAs(path);
  expect(await download.failure()).toBeNull();
  return path;
}

async function imageSample(page: Page, path: string, mime: string, point: { x: number; y: number }) {
  const source = `data:${mime};base64,${(await readFile(path)).toString('base64')}`;
  return page.evaluate(async ({ source, point }) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return { width: canvas.width, height: canvas.height,
      pixel: [...context.getImageData(Math.floor(point.x * canvas.width), Math.floor(point.y * canvas.height), 1, 1).data] };
  }, { source, point });
}

for (const scenario of cases) {
  test(`${scenario.canvas} ${scenario.theme} exports retain the live paint and edited text`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: scenario.theme });
    await page.goto('/');
    await page.getByLabel('1. Select Canvas Type').selectOption({ label: scenario.canvas });
    await page.getByPlaceholder(/Describe your business idea/i).fill('A fictional cooperative repairing bicycles');
    const generated = page.waitForResponse((r) => r.url().endsWith('/api/analysis'));
    await page.getByRole('button', { name: /^Generate Canvas$/ }).click();
    expect((await (await generated).json()).receipt.provider).toBe('fake');
    await page.getByRole('button', { name: `Edit ${scenario.block}`, exact: true }).focus();
    await page.keyboard.press('Enter');
    const edit = `Fictional ${scenario.block}: "repair & reuse" <bikes>`;
    await page.getByPlaceholder('Enter your content here...').fill(edit);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.getByRole('button', { name: 'Export Canvas', exact: true }).hover();
    await page.locator('#canvas-export').evaluate(async (element) => {
      await Promise.all(element.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
    });
    const before = await page.locator('#canvas-export').evaluate((element, title) => {
      const block = [...element.querySelectorAll('.canvas-block')].find((b) => b.querySelector('title')?.textContent === title)!;
      const rect = block.querySelector('rect')!;
      const heading = block.querySelector('h3')!;
      const outer = element.getBoundingClientRect(), box = rect.getBoundingClientRect();
      const sample = document.createElement('canvas').getContext('2d')!;
      sample.fillStyle = getComputedStyle(rect).fill;
      sample.fillRect(0, 0, 1, 1);
      return {
        fill: getComputedStyle(rect).fill, stroke: getComputedStyle(rect).stroke,
        font: getComputedStyle(heading).fontSize, textColor: getComputedStyle(heading).color,
        rgb: [...sample.getImageData(0, 0, 1, 1).data],
        point: { x: (box.x - outer.x + 6) / outer.width, y: (box.y - outer.y + box.height * 0.65) / outer.height },
        styles: [...element.querySelectorAll('*')].map((node) => node.getAttribute('style')),
      };
    }, scenario.block);

    const svgPath = await downloadFormat(page, info, 'SVG');
    const source = await readFile(svgPath, 'utf8');
    const xml = await page.evaluate(({ source, title }) => {
      const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
      const block = [...doc.querySelectorAll('.canvas-block')].find((b) => b.querySelector('title')?.textContent === title);
      return { errors: doc.querySelectorAll('parsererror').length, root: doc.documentElement.localName,
        blocks: doc.querySelectorAll('.canvas-block').length, content: block?.querySelector('.prose')?.textContent };
    }, { source, title: scenario.block });
    expect(xml).toEqual({ errors: 0, root: 'svg', blocks: scenario.count, content: edit });

    // Open the completed file without the application's stylesheet or server.
    // Looking at SVG inside the live app would conceal missing export styles.
    const standalone = await page.context().newPage();
    const failedRequests: string[] = [];
    standalone.on('requestfailed', (r) => failedRequests.push(r.url()));
    await standalone.route(/^https?:/, (route) => route.abort());
    await standalone.goto(`file://${svgPath}`, { waitUntil: 'domcontentloaded' });
    const after = await standalone.locator('.canvas-block').evaluateAll((blocks, title) => {
      const block = blocks.find((b) => b.querySelector('title')?.textContent === title)!;
      const rect = block.querySelector('rect')!, heading = block.querySelector('h3')!;
      return { fill: getComputedStyle(rect).fill, stroke: getComputedStyle(rect).stroke,
        font: getComputedStyle(heading).fontSize, textColor: getComputedStyle(heading).color };
    }, scenario.block);
    await standalone.close();
    await writeFile(info.outputPath('svg-paint.json'), JSON.stringify({ before, after, xml, failedRequests }, null, 2));
    expect(failedRequests).toEqual([]);
    expect.soft(after).toEqual({ fill: before.fill, stroke: before.stroke, font: before.font, textColor: before.textColor });

    const rasters = [];
    for (const format of ['PNG', 'JPEG']) {
      const path = await downloadFormat(page, info, format);
      const image = await imageSample(page, path, format === 'PNG' ? 'image/png' : 'image/jpeg', before.point);
      expect(image.width).toBeGreaterThan(100);
      expect.soft(Math.max(...image.pixel.slice(0, 3).map((channel, i) => Math.abs(channel - before.rgb[i]))))
        .toBeLessThanOrEqual(format === 'PNG' ? 3 : 15);
      rasters.push({ format, ...image });
    }
    const pdfPath = await downloadFormat(page, info, 'PDF');
    expect((await readFile(pdfPath)).subarray(0, 5).toString()).toBe('%PDF-');
    const poppler = spawnSync('pdftoppm', ['-v']);
    if (poppler.error && 'code' in poppler.error && poppler.error.code === 'ENOENT') {
      info.annotations.push({ type: 'NOT RUN', description: 'PDF pixel rendering requires optional Poppler; actual PDF download/header verified.' });
    } else {
      expect(poppler.status).toBe(0);
      const prefix = info.outputPath('pdf-page');
      execFileSync('pdftoppm', ['-f', '1', '-l', '1', '-singlefile', '-png', '-r', '72', pdfPath, prefix]);
      const image = await imageSample(page, `${prefix}.png`, 'image/png', before.point);
      expect.soft(Math.max(...image.pixel.slice(0, 3).map((channel, i) => Math.abs(channel - before.rgb[i])))).toBeLessThanOrEqual(5);
      rasters.push({ format: 'PDF', ...image });
    }
    await writeFile(info.outputPath('raster-paint.json'), JSON.stringify(rasters, null, 2));
    expect(await page.locator('#canvas-export').evaluate((el) => [...el.querySelectorAll('*')].map((node) => node.getAttribute('style')))).toEqual(before.styles);
    await expect(page.locator('[data-canvas-export-snapshot]')).toHaveCount(0);
  });
}

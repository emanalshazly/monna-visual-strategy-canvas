import { expect, test, type Page, type Route } from '@playwright/test';

const fixture = {
  keyPartners: 'Fixture partners',
  keyActivities: 'Fixture activities',
  valuePropositions: 'Fixture value proposition',
  customerRelationships: 'Fixture relationships',
  customerSegments: 'Fixture customers',
  keyResources: 'Fixture resources',
  channels: 'Fixture channels',
  costStructure: 'Fixture costs',
  revenueStreams: 'Fixture revenue',
};

async function fulfillSuccess(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      kind: 'generate',
      result: { canvasData: fixture, analysisFeedback: { strengths: 'Coherent fixture', suggestions: 'Validate assumptions' } },
      receipt: { requestId: 'e2e', provider: 'fake', cached: false, durationMs: 1 },
    }),
  });
}

async function generate(page: Page) {
  await page.getByPlaceholder(/Describe your business idea/i).fill('A repair service for local businesses');
  await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
  await expect(page.getByText('Fixture content for Value Propositions')).toBeVisible();
}

test.describe('strategy canvas core journey', () => {
  test('generates, keyboard-edits, and exports a deterministic canvas', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Visual Strategy Canvas AI/i })).toBeVisible();
    await generate(page);

    const block = page.getByRole('button', { name: 'Edit Key Partners' });
    await block.focus();
    await page.keyboard.press('Enter');
    const editor = page.getByPlaceholder('Enter your content here...');
    await editor.fill('Edited partners');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Edited partners')).toBeVisible();

    await page.getByRole('button', { name: 'Export Canvas' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^SVG/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Business_Model_Canvas.svg');
  });

  test('cancels an in-flight generation without a fixed sleep', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/analysis', async (route) => { await gate; await fulfillSuccess(route); });
    await page.goto('/');
    await page.getByPlaceholder(/Describe your business idea/i).fill('A repair service');
    await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
    await expect(page.getByRole('status')).toContainText('AI is thinking');
    await page.getByRole('button', { name: 'Cancel generation' }).click();
    release();
    await expect(page.getByRole('alert')).toContainText('Generation cancelled');
  });

  test('recovers from a provider failure', async ({ page }) => {
    let attempt = 0;
    await page.route('**/api/analysis', async (route) => {
      attempt += 1;
      if (attempt === 1) return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'Strategy analysis is temporarily unavailable.' }) });
      return route.continue();
    });
    await page.goto('/');
    await page.getByPlaceholder(/Describe your business idea/i).fill('A repair service');
    await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
    await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
    await page.getByRole('button', { name: /^Generate Canvas$/i }).click();
    await expect(page.getByText('Fixture content for Value Propositions')).toBeVisible();
  });

  test('keeps the core controls visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('/');
    await expect(page.getByPlaceholder(/Describe your business idea/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Generate Canvas$/i })).toBeVisible();
  });
});

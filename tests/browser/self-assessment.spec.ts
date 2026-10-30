import { test, expect, type Page } from '@playwright/test';

async function answerSection(page: Page, value: number) {
  for (const group of await page.locator('.checkin-question').all()) {
    await group.locator(`input[value="${value}"]`).check();
  }
}

test('employee check-in scores real answers, exports a summary, and clears on restart', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/individual');
  await expect(page.getByRole('heading', { name: 'How are you feeling at work?' })).toBeVisible();
  await expect(page.locator('.checkin-question')).toHaveCount(3);
  await expect(page.locator('input:checked')).toHaveCount(0);
  await page.screenshot({ path: 'output/screenshots/self-assessment-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Please answer each question');
  await expect(page.locator('.checkin-question')).toHaveCount(3);
  await answerSection(page, 3);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.checkin-question')).toHaveCount(4);
  await answerSection(page, 3);
  // The final item is reversed: always enough energy means zero exhaustion points.
  await page.locator('input[name="energy"][value="4"]').check();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('input:checked')).toHaveCount(3);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('#wellbeing-stress').selectOption('8');
  await page.locator('#wellbeing-sleep_hours').fill('5.5');
  await page.locator('#wellbeing-work_hours').fill('52');
  await page.locator('#wellbeing-work_life_balance').selectOption('3');
  await page.locator('#wellbeing-manager_support').selectOption('2');
  await page.locator('#wellbeing-job_satisfaction').selectOption('4');
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/self-assessment') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'See my summary' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Your wellbeing snapshot' })).toBeVisible();
  await expect(page.locator('.checkin-score > strong')).toContainText('64.3');
  await expect(page.locator('.checkin-factor-results')).toContainText('5.5');
  await expect(page.getByRole('heading', { name: 'Make room for rest' })).toBeVisible();
  await page.screenshot({ path: 'output/screenshots/self-assessment-results.png', fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my summary' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('workwell-self-assessment.txt');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const report = Buffer.concat(chunks).toString();
  expect(report).toContain('64.29 / 100');
  expect(report).toContain('Sleep: 5.5 hours / night');
  expect(report).toContain('Borritz');
  await page.getByRole('button', { name: 'Start a new check-in' }).click();
  await expect(page.locator('input:checked')).toHaveCount(0);
  await expect(page.getByText('0 of 7 burnout questions answered')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('employee check-in works on mobile with all optional fields skipped and handles submit failure', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/individual');
  await expect(page.locator('.checkin-question')).toHaveCount(3);
  await page.screenshot({ path: 'output/screenshots/self-assessment-mobile.png', fullPage: true });
  await answerSection(page, 0);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await answerSection(page, 0);
  await page.locator('input[name="energy"][value="4"]').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.route('**/api/self-assessment', async route => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Summary temporarily unavailable. Please retry.' }) });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'See my summary' }).click();
  await expect(page.getByRole('alert')).toContainText('Summary temporarily unavailable');
  await page.unroute('**/api/self-assessment');
  await page.getByRole('button', { name: 'See my summary' }).click();
  await expect(page.locator('.checkin-score > strong')).toContainText('0.0');
  await expect(page.locator('.checkin-unanswered')).toHaveCount(6);
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(widths[0]).toBeLessThanOrEqual(widths[1]);
  await page.screenshot({ path: 'output/screenshots/self-assessment-results-mobile.png', fullPage: true });
});

test('employee questionnaire load failure can be retried', async ({ page }) => {
  await page.route('**/api/self-assessment', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Could not load the questionnaire.' }) }));
  await page.goto('/individual');
  await expect(page.getByRole('alert')).toContainText('Could not load the questionnaire');
  await page.unroute('**/api/self-assessment');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.checkin-question')).toHaveCount(3);
});

test('what-if targets compare real entries while leaving the measured CBI score unchanged', async ({ page }) => {
  await page.goto('/individual');
  await expect(page.locator('.checkin-question')).toHaveCount(3);
  await answerSection(page, 2);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await answerSection(page, 2);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('#wellbeing-stress').selectOption('8');
  await page.locator('#wellbeing-sleep_hours').fill('5.5');
  await page.getByRole('button', { name: 'See my summary' }).click();
  await expect(page.locator('.checkin-score > strong')).toContainText('50.0');
  await page.getByRole('main').getByRole('link', { name: 'Explore changes' }).click();
  await expect(page).toHaveURL(/\/individual\/explore$/);
  await page.locator('#scenario-stress').selectOption('0');
  await page.locator('#scenario-sleep_hours').fill('7.5');
  await page.locator('#scenario-manager_support').selectOption('9');
  const stress = page.locator('.scenario-comparison tbody tr').filter({ hasText: 'Stress' });
  await expect(stress).toContainText('-8');
  const sleep = page.locator('.scenario-comparison tbody tr').filter({ hasText: 'Sleep' });
  await expect(sleep).toContainText('+2');
  const support = page.locator('.scenario-comparison tbody tr').filter({ hasText: 'Manager support' });
  await expect(support).toContainText('Not available');
  await expect(page.locator('.baseline-score')).toHaveText('50.0 / 100');
  await page.screenshot({ path: 'output/screenshots/individual-what-if.png', fullPage: true });
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download scenario' }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe('workwell-what-if.txt');
  const stream = await file.createReadStream(); const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toContain('target 0');
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole('button', { name: 'Reset scenario' }).click();
  await expect(page.locator('#scenario-stress')).toHaveValue('8');
  await expect(page.locator('#scenario-manager_support')).toHaveValue('');
  await page.getByRole('link', { name: 'Back to my summary' }).click();
  await expect(page.locator('.checkin-score > strong')).toContainText('50.0');
  await page.reload();
  await expect(page).toHaveURL(/\/individual$/);
  await expect(page.locator('input:checked')).toHaveCount(0);
});

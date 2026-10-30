/** Capture real, reproducible README screenshots from a running Workwell app. */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseURL = process.env.WORKWELL_URL || 'http://127.0.0.1:5173';
const destination = resolve('docs/screenshots');
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function capture(name, fullPage = false) {
  await page.evaluate(async () => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: resolve(destination, `${name}.png`), fullPage, animations: 'disabled' });
  console.log(`Captured ${name}`);
}
try {
  await page.goto('/');
  await expect(page.locator('.role-choices > a')).toHaveCount(2);
  await capture('landing');
  await page.getByRole('link', { name: /HR Dashboard/ }).click();
  const demo = page.waitForResponse(r => r.url().endsWith('/api/hr/demo') && r.request().method() === 'POST', { timeout: 60000 });
  await page.getByRole('button', { name: 'Explore demo data' }).click();
  const metadata = await (await demo).json();
  await expect(page.locator('.demo-tag')).toHaveText('Demo data', { timeout: 60000 });
  await expect(page.locator('.hr-kpi').first()).toContainText('5,000');
  await expect(page.locator('.recharts-pie')).toBeVisible();
  await capture('hr-dashboard', true);
  const overview = await (await page.request.get(`/api/hr/analyses/${metadata.analysis_id}/overview`)).json();
  await page.getByRole('link', { name: 'Employees', exact: true }).click();
  await expect(page.locator('.hr-employee-table tbody tr')).toHaveCount(10);
  await capture('hr-employees', true);

  await page.goto('/individual');
  await expect(page.locator('.checkin-question')).toHaveCount(3);
  await capture('individual-check-in', true);
  for (let step = 0; step < 2; step++) {
    for (const question of await page.locator('.checkin-question').all()) await question.locator('input[value="3"]').check();
    if (step === 1) await page.locator('input[name="energy"][value="4"]').check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  const values = { stress: '8', sleep_hours: '5.5', work_hours: '52', work_life_balance: '3', manager_support: '2', job_satisfaction: '4' };
  for (const [name, value] of Object.entries(values)) {
    const field = page.locator(`#wellbeing-${name}`);
    if (['sleep_hours', 'work_hours'].includes(name)) await field.fill(value);
    else await field.selectOption(value);
  }
  const assessed = page.waitForResponse(r => r.url().endsWith('/api/self-assessment') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'See my summary' }).click();
  const assessment = await (await assessed).json();
  await expect(page.locator('.checkin-score > strong')).toContainText('64.3');
  await capture('individual-summary', true);
  await page.getByRole('main').getByRole('link', { name: 'Explore changes' }).click();
  await page.locator('#scenario-sleep_hours').fill('7.5');
  await page.locator('#scenario-work_hours').fill('40');
  await page.locator('#scenario-stress').selectOption('5');
  await expect(page.locator('.scenario-comparison tbody tr').filter({ hasText: 'Sleep' })).toContainText('+2');
  await expect(page.locator('.scenario-comparison tbody tr').filter({ hasText: 'Workweek' })).toContainText('-12');
  await capture('individual-what-if', true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Your check-in', exact: true }).click();
  await expect(page.locator('.checkin-question')).toHaveCount(3);
  await capture('individual-mobile', true);
  if (errors.length) throw new Error(errors.join('\n'));
  await writeFile(resolve(destination, 'provenance.json'), JSON.stringify({
    captured_at: new Date().toISOString(),
    capture_script: 'scripts/capture_readme.mjs',
    desktop_viewport: { width: 1440, height: 1050 }, mobile_viewport: { width: 390, height: 844 },
    hr: { source: 'Explicit built-in demo: first 5,000 rows of the supplied research CSV', row_count: metadata.row_count, source_rows: metadata.source_rows, metrics: overview.metrics },
    individual: { source: 'Fictional illustrative questionnaire responses submitted through the actual UI', cbi_score: assessment.burnout.score, wellbeing: values, scenario: { stress: 5, sleep_hours: 7.5, work_hours: 40 }, scenario_changes_measured_score: false },
    page_errors: errors,
  }, null, 2) + '\n');
} finally {
  await browser.close();
}

import { test, expect, type Page } from '@playwright/test';

const team = 'ID,Name,Department,Role,Stress,Burnout,Sleep,Weekly hours\na,Ana,Engineering,Developer,8,7,5,50\nb,Ben,Support,Analyst,4,3,7.5,40\nc,Cam,Engineering,Developer,,5.5,6.5,45\nd,Dee,Support,Analyst,oops,8,6,48\n';

async function importTeam(page: Page, filename = 'team.csv', csv = team) {
  await page.goto('/hr/import');
  await page.getByLabel('Choose HR file').setInputFiles({ name: filename, mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByRole('heading', { name: 'Tell us what each column means.' })).toBeVisible();
  await page.getByRole('button', { name: 'Review mapped rows' }).click();
  await expect(page.getByRole('heading', { name: 'A clear picture of your file.' })).toBeVisible();
  if (await page.getByRole('checkbox').count()) await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create my dashboard' }).click();
  await expect(page).toHaveURL(/\/hr$/);
  await expect(page.locator('.hr-kpi').first()).toBeVisible();
}

test('landing offers two workspaces without loading employee or HR data', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Better work starts/ })).toBeVisible();
  await expect(page.locator('.role-choices > a')).toHaveCount(2);
  await page.screenshot({ path: 'output/screenshots/landing-desktop.png', fullPage: true });
  expect(requests).toEqual([]);
  await page.getByRole('link', { name: /HR Dashboard/ }).click();
  await expect(page.getByRole('heading', { name: 'Bring your workforce into focus.' })).toBeVisible();
  await expect(page.locator('.hr-kpi')).toHaveCount(0);
  await expect(page.locator('.hr-app')).toHaveAttribute('data-theme', 'hr');
  await page.screenshot({ path: 'output/screenshots/hr-upload-first.png', fullPage: true });
});

test('HR upload review, filters, employee drilldown, downloads, and refresh use the upload', async ({ page }) => {
  const pageErrors: string[] = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/hr/import');
  await page.getByLabel('Choose HR file').setInputFiles({ name: 'team.csv', mimeType: 'text/csv', buffer: Buffer.from(team) });
  await page.getByRole('button', { name: 'Review mapped rows' }).click();
  await expect(page.locator('.review-counts')).toContainText('3');
  await expect(page.locator('.review-counts')).toContainText('1');
  await expect(page.getByRole('button', { name: 'Create my dashboard' })).toBeDisabled();
  const issuesDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download issues' }).click();
  expect((await issuesDownload).suggestedFilename()).toBe('workwell-import-issues.csv');
  await page.screenshot({ path: 'output/screenshots/hr-import-review.png', fullPage: true });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create my dashboard' }).click();
  await expect(page.locator('.hr-kpi').first()).toContainText('3');
  await expect(page.locator('.source-line')).toContainText('team.csv');
  await expect(page.locator('.source-line')).not.toContainText('Research');
  await page.screenshot({ path: 'output/screenshots/hr-dashboard-upload.png', fullPage: true });
  await page.getByLabel('Department', { exact: true }).selectOption('Engineering');
  await expect(page).toHaveURL(/department=Engineering/);
  await expect(page.locator('.hr-kpi').first()).toContainText('2');
  const download = page.waitForEvent('download'); await page.getByRole('link', { name: 'Export summary' }).click();
  expect((await download).suggestedFilename()).toBe('workwell-summary.csv');
  await page.reload();
  await expect(page.locator('.source-line')).toContainText('team.csv');
  await expect(page.locator('.hr-kpi').first()).toContainText('2');
  await page.getByRole('link', { name: 'Employees', exact: true }).click();
  await page.getByLabel('Search employees').fill('Cam');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.hr-employee-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.hr-employee-table tbody')).toContainText('Cam');
  await page.screenshot({ path: 'output/screenshots/hr-employees.png', fullPage: true });
  await page.getByRole('link', { name: 'Open profile c', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cam', exact: true })).toBeVisible();
  await expect(page.locator('.employee-model-output')).toContainText('Missing');
  await page.screenshot({ path: 'output/screenshots/hr-employee-profile.png', fullPage: true });
  expect(pageErrors).toEqual([]);
});

test('replacing and clearing a dataset never returns bundled research statistics', async ({ page }) => {
  await importTeam(page);
  await importTeam(page, 'replacement.csv', 'ID,Stress,Sleep\nx,2,8\n');
  await expect(page.locator('.source-line')).toContainText('replacement.csv');
  await expect(page.locator('.hr-kpi').first()).toContainText('1');
  await page.getByRole('link', { name: 'Data & imports', exact: true }).click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Clear workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Bring your workforce into focus.' })).toBeVisible();
  await expect(page.locator('.hr-kpi')).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('workwell-active-analysis'))).toBeNull();
});

test('demo is explicit and model/research screens remain available', async ({ page }) => {
  await page.goto('/hr');
  await page.getByRole('button', { name: 'Explore demo data' }).click();
  await expect(page.locator('.demo-tag')).toHaveText('Demo data', { timeout: 30000 });
  await expect(page.locator('.hr-kpi').first()).toContainText('5,000');
  await page.screenshot({ path: 'output/screenshots/hr-dashboard-demo.png', fullPage: true });
  await page.goto('/hr/research');
  await expect(page.locator('.model-table tbody tr')).toHaveCount(6);
  await page.getByRole('link', { name: 'Open model sandbox' }).click();
  await page.getByRole('button', { name: 'Load dataset example' }).click();
  await expect(page.getByText('Source dataset profile #1')).toBeVisible();
  await page.getByRole('button', { name: 'Run prediction', exact: true }).click();
  await expect(page.locator('.probability strong')).toHaveText(/\d+\.\d%/);
  await expect(page.locator('.result-details')).toContainText('25.35%');
});

test('expired analysis returns an upload state instead of silently using demo data', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('workwell-active-analysis', 'expired-reference'));
  await page.goto('/hr/employees');
  await expect(page.getByRole('heading', { name: 'Bring your workforce into focus.' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('expired');
  await expect(page.locator('.hr-kpi')).toHaveCount(0);
});

test('individual workspace does not request HR data and switching returns to chooser', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(new URL(request.url()).pathname); });
  await page.goto('/individual');
  await expect(page.locator('.checkin-question')).toHaveCount(3);
  expect(requests.every(p => p.startsWith('/api/self-assessment'))).toBe(true);
  await expect(page.getByRole('navigation', { name: 'HR navigation' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Switch experience' }).click();
  await expect(page.locator('.role-choices > a')).toHaveCount(2);
});

test('mobile and large layouts stay within the viewport', async ({ page }) => {
  for (const width of [320, 390, 1280, 1920]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ['/', '/hr', '/hr/import', '/individual']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('.loading-state')).toHaveCount(0);
      const widths = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      expect(widths[0], `${route} at ${width}px`).toBeLessThanOrEqual(widths[1]);
    }
    if (width === 390) await page.screenshot({ path: 'output/screenshots/individual-mobile.png', fullPage: true });
  }
});

test('legacy links redirect and frontend deep links survive reload', async ({ page, request }) => {
  await page.goto('/?view=self-assessment'); await expect(page).toHaveURL(/\/individual$/);
  await page.goto('/?view=overview'); await expect(page).toHaveURL(/\/hr$/);
  await page.goto('/individual/results'); await expect(page).toHaveURL(/\/individual$/);
  expect((await request.get('/hr/employees/row-2')).status()).toBe(200);
  expect((await request.get('/api/no-such-endpoint')).status()).toBe(404);
});

test('Excel worksheet selection and explicit CBI scale retain original units', async ({ page }) => {
  await page.goto('/hr/import');
  await page.getByLabel('Choose HR file').setInputFiles('tests/fixtures/hr-multi-sheet.xlsx');
  await expect(page.getByLabel('Worksheet', { exact: true })).toHaveValue('First');
  await page.getByLabel('Worksheet', { exact: true }).selectOption('Wellbeing');
  await expect(page.getByLabel('Burnout score scale')).toBeVisible();
  await page.getByLabel('Burnout score scale').selectOption('cbi100');
  await page.getByRole('button', { name: 'Review mapped rows' }).click();
  await expect(page.locator('.review-counts')).toContainText('2');
  await page.getByRole('button', { name: 'Create my dashboard' }).click();
  await expect(page.locator('.hr-kpi').first()).toContainText('2');
  await expect(page.locator('.hr-kpis')).toContainText('CBI exhaustion');
  await expect(page.locator('.hr-kpis')).toContainText('62.5');
  await expect(page.locator('.hr-kpis')).toContainText('/ 100');
  await expect(page.getByRole('heading', { name: 'Stress and reported exhaustion' })).toHaveCount(0);
});

/** Verify a Pages build on a strict static server with no SPA rewrites. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium, expect } from '@playwright/test';

const directory = resolve(process.env.PAGES_TEST_DIR || 'tmp/pages-unconnected');
const backend = process.env.PAGES_TEST_BACKEND || '';
const prefix = '/workwell/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!path.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const file = resolve(directory, path.slice(prefix.length) || 'index.html');
    if (!file.startsWith(directory + sep)) { response.writeHead(403).end(); return; }
    const contents = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(contents);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const errors = []; const apiRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
try {
  await page.goto(`http://127.0.0.1:4173${prefix}`);
  await expect(page.locator('.role-choices > a')).toHaveCount(2);
  await page.getByRole('link', { name: /HR Dashboard/ }).click();
  await expect(page).toHaveURL(/\/workwell\/#\/hr$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bring your workforce into focus.' })).toBeVisible();
  const template = page.getByText('Download an example CSV template', { exact: true });
  if (backend) {
    await expect(template).toHaveAttribute('href', `${backend}/api/hr/template.csv`);
    await page.getByRole('link', { name: 'Data & imports' }).click();
    await page.getByLabel('Choose HR file').setInputFiles({ name: 'pages-check.csv', mimeType: 'text/csv', buffer: Buffer.from('ID,Department,Stress,Sleep\na,Engineering,8,5.5\nb,Support,4,7.5\n') });
    await page.getByRole('button', { name: 'Review mapped rows' }).click();
    await expect(page.locator('.review-counts')).toContainText('2');
    await page.getByRole('button', { name: 'Create my dashboard' }).click();
    await expect(page.locator('.hr-kpi').first()).toContainText('2');
    await expect(page.getByRole('link', { name: 'Export summary' })).toHaveAttribute('href', new RegExp(`^${backend}/api/hr/`));
    await page.getByRole('link', { name: 'Model & research' }).click();
    const researchFile = page.locator('.resource-list a').first();
    await expect(researchFile).toHaveAttribute('href', new RegExp(`^${backend}/resources/`));
    await page.locator('.provenance summary').click();
    await expect(page.getByRole('link', { name: 'Explore the FastAPI documentation' })).toHaveAttribute('href', `${backend}/docs`);
  } else {
    await expect(template).not.toHaveAttribute('href');
    await page.getByRole('button', { name: 'Explore demo data' }).click();
    await expect(page.getByRole('alert')).toContainText('analysis service is not connected');
  }
  await page.goto(`http://127.0.0.1:4173${prefix}#/individual`);
  await page.reload();
  if (backend) {
    await expect(page.locator('.checkin-question')).toHaveCount(3);
    for (let step = 0; step < 2; step++) {
      for (const question of await page.locator('.checkin-question').all()) await question.locator('input[value="2"]').check();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
    }
    await page.getByRole('button', { name: 'See my summary' }).click();
    await expect(page.locator('.checkin-score > strong')).toContainText('50.0');
    if (!apiRequests.length || !apiRequests.every(url => url.startsWith(backend + '/api/'))) throw new Error('API requests did not all reach the separate backend');
  } else {
    await expect(page.getByRole('alert')).toContainText('analysis service is not connected');
    if (apiRequests.length) throw new Error('Unconfigured Pages build attempted API requests');
  }
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/individual(?:\/results)?$/);
  await expect(page.getByRole('main')).toBeFocused();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Pages smoke test passed: subpath assets, hash navigation/reload, skip link, ${backend ? 'real cross-origin HR import, downloads, resources, and CBI submission' : 'explicit unconnected-service state; no API requests'}.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

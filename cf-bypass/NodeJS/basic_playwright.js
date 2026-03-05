const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const url = 'https://example.com'; // replace with target URL
  await page.goto(url, { timeout: 60000 });

  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('page.html', html, 'utf8');

  await browser.close();
})();

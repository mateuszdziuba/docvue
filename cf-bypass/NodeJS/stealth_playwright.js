const { chromium } = require('playwright-extra');
const stealth = require('playwright-extra-plugin-stealth')();

chromium.use(stealth);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://example.com', { timeout: 60000 });
  const title = await page.title();
  console.log(title);

  await browser.close();
})();
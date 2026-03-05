const { chromium } = require('playwright');
const headersList = [
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
  },
  {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Accept-Language': 'en-GB,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
  }
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: headersList[Math.floor(Math.random() * headersList.length)]
  });
  const page = await context.newPage();
  await page.goto('https://httpbin.org/headers');
  const content = await page.textContent('pre');
  console.log(content);
  await browser.close();
})();

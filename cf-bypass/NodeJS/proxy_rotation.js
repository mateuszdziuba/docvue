const { chromium } = require('playwright');

const proxies = [
  'http://user:pass@proxy1.example.com:8000',
  'http://user:pass@proxy2.example.com:8000',
  'http://user:pass@proxy3.example.com:8000'
];

const proxy = proxies[Math.floor(Math.random() * proxies.length)];

(async () => {
  const browser = await chromium.launch({
    proxy: { server: proxy }
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://httpbin.org/ip');
  const content = await page.textContent('body');
  console.log(content);
  await browser.close();
})();

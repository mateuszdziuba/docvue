const { chromium } = require('playwright-extra');
const stealth = require('playwright-extra-plugin-stealth');

chromium.use(stealth());

const PROXIES = [
  'http://username:password@proxy1.example.com:8000',
  'http://username:password@proxy2.example.com:8000',
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanLikeInteraction(page) {
  await page.mouse.move(100, 100);
  await sleep(Math.random() * 1000 + 500);
  await page.mouse.move(200, 300);
  await sleep(Math.random() * 1000 + 500);
  await page.evaluate(() => window.scrollBy(0, window.innerHeight / 2));
  await sleep(Math.random() * 1000 + 1000);
}

(async () => {
  const proxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const browser = await chromium.launch({
    proxy: { server: proxy },
    headless: true,
  });

  const context = await browser.newContext({
    userAgent,
  });

  const page = await context.newPage();

  await page.goto('https://example.com');
  await humanLikeInteraction(page);

  const content = await page.content();
  console.log(content.slice(0, 500)); // print first 500 chars

  await browser.close();
})();

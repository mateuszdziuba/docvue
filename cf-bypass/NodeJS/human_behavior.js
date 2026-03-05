const { chromium } = require('playwright-extra');
const Stealth = require('playwright-extra-plugin-stealth');
chromium.use(Stealth());

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function humanBehavior(page) {
  // random mouse moves
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * 700) + 100;
    const y = Math.floor(Math.random() * 500) + 100;
    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 20) + 5 });
    await sleep(Math.random() * 400 + 200);
  }

  // scroll down in chunks
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 0.8);
    });
    await sleep(Math.random() * 700 + 500);
  }

  // pause and scroll up
  await sleep(Math.random() * 500 + 500);
  await page.evaluate(() => {
    window.scrollBy(0, -window.innerHeight * 0.5);
  });
  await sleep(Math.random() * 500 + 300);

  // random click
  const bx = Math.floor(Math.random() * 700) + 50;
  const by = Math.floor(Math.random() * 500) + 50;
  await page.mouse.click(bx, by);
  await sleep(Math.random() * 1000 + 1000);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://example.com');
  await humanBehavior(page);
  // continue with your scraping...
  await browser.close();
})();

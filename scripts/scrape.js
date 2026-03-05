const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(url) {
  let browser = null;
  try {
    // We use chromium headless mode
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Add extra evasions
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Go to URL and wait for domcontentloaded
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    
    // HUMAN BEHAVIOR - Cloudflare Bypass Trick
    try {
        for (let i = 0; i < 5; i++) {
          const x = Math.floor(Math.random() * 700) + 100;
          const y = Math.floor(Math.random() * 500) + 100;
          await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 20) + 5 });
          await page.waitForTimeout(Math.random() * 400 + 200);
        }

        // scroll down in chunks
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
          await page.waitForTimeout(Math.random() * 700 + 500);
        }

        // pause and scroll up
        await page.waitForTimeout(Math.random() * 500 + 500);
        await page.evaluate(() => window.scrollBy(0, -window.innerHeight * 0.5));
        await page.waitForTimeout(Math.random() * 500 + 300);
        
        // random click
        const bx = Math.floor(Math.random() * 700) + 50;
        const by = Math.floor(Math.random() * 500) + 50;
        await page.mouse.click(bx, by);
        await page.waitForTimeout(Math.random() * 1000 + 1000);
    } catch(e) {}

    // Let dynamic content load after interaction
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/tmp/scrape-debug.png' });

    const price = await page.evaluate(() => {
        // Look for common price patterns exactly like cheerio did
        const findPrice = () => {
             const mPriceStr = document.querySelector('meta[property="product:price:amount"]')?.content ||
                               document.querySelector('meta[name="twitter:data1"]')?.content ||
                               document.querySelector('meta[itemprop="price"]')?.content;
             if (mPriceStr) return mPriceStr;

             // Check JSON-LD
             const scripts = document.querySelectorAll('script[type="application/ld+json"]');
             for (const script of scripts) {
                 try {
                     const data = JSON.parse(script.textContent);
                     const extract = (obj) => {
                         if (obj['@type'] === 'Product' || obj['@type'] === 'Offer') {
                             if (obj.offers?.price) return obj.offers.price;
                             if (obj.price) return obj.price;
                         }
                         return null;
                     };
                     
                     if (Array.isArray(data)) {
                         for (const d of data) {
                             const p = extract(d);
                             if (p) return p;
                         }
                     } else if (data['@graph']) {
                         for (const d of data['@graph']) {
                             const p = extract(d);
                             if (p) return p;
                         }
                     } else {
                         const p = extract(data);
                         if (p) return p;
                     }
                 } catch(e) {}
             }
             
             // Check Sephora price
             const sephora = document.querySelector('.price-sales, .sales .value, .product-price');
             if (sephora) return sephora.innerText;

             // Check Notino price
             const notino = document.querySelector('#pd-price, .styled__PriceWrapper-sc-1v2eueq-0, [data-testid="product-price"], span[class*="Price"]');
             if (notino) return notino.innerText;

             return null;
        }
        return findPrice();
    });

    const imageUrl = await page.evaluate(() => {
        return document.querySelector('meta[property="og:image"]')?.content ||
               document.querySelector('meta[name="twitter:image"]')?.content ||
               document.querySelector('meta[itemprop="image"]')?.content || null;
    });

    const name = await page.evaluate(() => {
        return document.querySelector('meta[property="og:title"]')?.content ||
               document.querySelector('meta[name="twitter:title"]')?.content ||
               document.title || null;
    });

    const bodyText = await page.evaluate(() => document.body.innerText);

    console.log(JSON.stringify({
        price,
        imageUrl,
        name,
        isBlocked: bodyText.includes('Attention Required!') || bodyText.includes('Just a moment...')
    }));

  } catch (error) {
     console.error("ERROR:", error.message);
     process.exit(1);
  } finally {
     if (browser) await browser.close();
  }
}

const targetUrl = process.argv[2];
if (!targetUrl) {
    console.error("No URL provided");
    process.exit(1);
}

scrape(targetUrl);

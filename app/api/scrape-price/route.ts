import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-core';

const execFileAsync = promisify(execFile);

// Initialize Supabase admin client for caching
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runBrowserlessScrape(url: string, token: string) {
    let browser = null;
    try {
        console.log("Connecting to Browserless.io directly from API route...");
        browser = await chromium.connect({ 
           wsEndpoint: `wss://chrome.browserless.io?token=${token}` 
        });
        
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          viewport: { width: 1280, height: 720 }
        });
        
        const page = await context.newPage();
        
        // Add extra evasions
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        
        // Human behavior
        try {
            for (let i = 0; i < 3; i++) {
              await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
              await page.waitForTimeout(500);
            }
        } catch(e) {}

        await page.waitForTimeout(1500);

        const result = await page.evaluate(() => {
            const findPrice = () => {
                 const mPriceStr = document.querySelector('meta[property="product:price:amount"]')?.getAttribute('content') ||
                                   document.querySelector('meta[name="twitter:data1"]')?.getAttribute('content') ||
                                   document.querySelector('meta[itemprop="price"]')?.getAttribute('content');
                 if (mPriceStr) return mPriceStr;

                 const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                 for (const script of Array.from(scripts)) {
                     try {
                         const data = JSON.parse(script.textContent || '');
                         const extract = (obj: any) => {
                             if (obj['@type'] === 'Product' || obj['@type'] === 'Offer') {
                                 if (obj.offers?.price) return obj.offers.price;
                                 if (obj.price) return obj.price;
                             }
                             return null;
                         };
                         if (Array.isArray(data)) {
                             for (const d of data) {
                                 const p = extract(d); if (p) return p;
                             }
                         } else {
                             const p = extract(data); if (p) return p;
                         }
                     } catch(e) {}
                 }
                 
                 const sephora = document.querySelector('.price-sales, .sales .value, .product-price');
                 if (sephora) return (sephora as HTMLElement).innerText;

                 const notino = document.querySelector('#pd-price, [data-testid="product-price"], span[class*="Price"]');
                 if (notino) return (notino as HTMLElement).innerText;

                 return null;
            }
            
            const findImageUrl = () => {
                return document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                       document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || null;
            }

            const findName = () => {
                return document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                       document.title || null;
            }

            const bodyText = document.body.innerText;

            return {
                price: findPrice(),
                imageUrl: findImageUrl(),
                name: findName(),
                isBlocked: bodyText.includes('Attention Required!') || bodyText.includes('Just a moment...')
            };
        });

        return result;
    } finally {
        if (browser) await browser.close();
    }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // --- NORMALIZE URL FOR BETTER CACHE HITS ---
    // Remove query parameters that tracking scripts add, and trailing slashes
    const normalizeUrl = (rawUrl: string) => {
        try {
            const u = new URL(rawUrl);
            u.searchParams.delete('utm_source');
            u.searchParams.delete('utm_medium');
            u.searchParams.delete('utm_campaign');
            u.searchParams.delete('gclid');
            u.searchParams.delete('fbclid');
            let clean = u.origin + u.pathname + u.search;
            if (clean.endsWith('/')) {
                clean = clean.slice(0, -1);
            }
            return clean;
        } catch {
            return rawUrl;
        }
    };
    
    const normalizedUrl = normalizeUrl(url);

    // --- CHECK CACHE FIRST ---
    try {
       const today = new Date();
       const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
       
       const { data: cachedProduct } = await supabase
         .from('scraped_products_cache')
         .select('*')
         .eq('url', normalizedUrl)
         .gte('updated_at', oneWeekAgo.toISOString())
         .single();
         
       if (cachedProduct) {
         console.log(`Cache hit for: ${url}`);
         return NextResponse.json({
            price: cachedProduct.price || null,
            imageUrl: cachedProduct.image_url,
            name: cachedProduct.name,
            cached: true
         });
       }
    } catch (e) {
       console.log('Cache check failed, continuing with scrape:', e);
    }

    // --- FALLBACK URL PARSER ---
    // If we get blocked by Cloudflare/Datadome (403, 503, 302, etc.), we can at least guess the name from the URL
    const parseNameFromUrl = (urlStr: string) => {
        try {
            const urlObj = new URL(urlStr);
            const hostname = urlObj.hostname.replace('www.', '');
            const pathname = urlObj.pathname;
            
            if (hostname.includes('sephora')) {
                const match = pathname.match(/\/p\/([a-zA-Z0-9-]+)-\d+\.html/);
                if (match) return match[1].replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
            } else if (hostname.includes('notino')) {
                const parts = pathname.split('/').filter(Boolean);
                if (parts.length >= 2) {
                   const brand = parts[parts.length - 2];
                   const product = parts[parts.length - 1];
                   return `${brand} ${product}`.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
                }
            } else if (hostname.includes('rossmann')) {
                const parts = pathname.split('/').filter(Boolean);
                const lastPart = parts[parts.length - 1];
                if (lastPart) {
                    const namePart = lastPart.split(',')[0];
                    return namePart.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
                }
            } else if (hostname.includes('hebe')) {
                let namePart = pathname.replace('.html', '').replace(/^\//, '');
                namePart = namePart.replace(/-\d{10,}$/, '');
                return namePart.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
            } else if (hostname.includes('superpharm')) {
                let namePart = pathname.replace('.html', '').replace(/^\//, '');
                namePart = namePart.replace(/-\d{5,}$/, '');
                return namePart.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
            } else if (hostname.includes('ezebra')) {
                const parts = pathname.split('/').filter(Boolean);
                const lastPart = parts[parts.length - 1];
                if (lastPart) {
                    let namePart = lastPart.replace('.html', '');
                    namePart = namePart.replace(/-\d{4,}$/, '');
                    return namePart.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
                }
            }
        } catch {
            return null;
        }
        return null;
    };

    const toTitleCase = (str: string) => {
        return str.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const scriptPath = path.join(process.cwd(), 'scripts', 'scrape.js');
    try {
        let result: any = null;
        const browserlessToken = process.env.BROWSERLESS_TOKEN;

        if (browserlessToken) {
            result = await runBrowserlessScrape(url, browserlessToken);
        } else {
            // Run Playwright script securely outside Next.js process (LOCAL FALLBACK)
            console.log(`Executing Local Playwright for: ${url}`);
            const { stdout } = await execFileAsync('node', [scriptPath, url], { 
                timeout: 45000,
                env: {
                    ...process.env,
                    BROWSERLESS_TOKEN: process.env.BROWSERLESS_TOKEN
                }
            });
            
            console.log("Playwright output:", stdout);
            
            // Find JSON block in output in case script logs other debug stuff
            const match = stdout.match(/\{"price"[^]*\}/);
            if (match) {
                result = JSON.parse(match[0]);
            }
        }
        
        if (result) {
            
            // If Playwright returns block page or empty name, invoke URL parser fallback
            if (result.isBlocked || !result.name || result.name.toLowerCase().includes('just a moment')) {
                const fallbackName = parseNameFromUrl(url);
                if (fallbackName) {
                    result.name = toTitleCase(fallbackName);
                }
                
                // Erase generic pictures if it's Notino/Rossmann block
                if (result.imageUrl && result.imageUrl.includes('og-default')) result.imageUrl = null;
            } else if (result.name) {
                // Clean up title
                result.name = result.name.split('|')[0].split('-')[0].trim();
                if (result.name.includes('≡')) result.name = result.name.split('≡')[0].trim(); // Sephora specific
            }
            
            // Parse price string correctly from Playwright
            if (result.price && typeof result.price === 'string') {
                 const pMatch = result.price.match(/[\d\s]+[,.]\d{2}/) || result.price.match(/\d+/);
                 if (pMatch) {
                   const clean = pMatch[0].replace(/\s/g, '').replace(',', '.');
                   result.price = parseFloat(clean);
                 } else {
                   result.price = null;
                 }
            }
            
            // Save to cache
            try {
               const { error: cacheError } = await supabase.from('scraped_products_cache').upsert({
                  url: normalizedUrl,
                  name: result.name,
                  price: result.price,
                  image_url: result.imageUrl,
                  updated_at: new Date().toISOString()
               }, { onConflict: 'url' });
               
               if (cacheError) {
                   console.error("Supabase Cache Upsert Error:", cacheError);
               } else {
                   console.log(`Successfully cached: ${normalizedUrl}`);
               }
            } catch (cacheError) {
               console.error("Failed to save to cache:", cacheError);
            }
            
            return NextResponse.json(result);
        }
    } catch (err) {
        console.error("Playwright execution failed or timed out:", err);
    }
    
    // Absolute worst case fallback if Playwright crashes entirely
    const fallbackName = parseNameFromUrl(url);
    if (fallbackName) {
        return NextResponse.json({ price: null, imageUrl: null, name: toTitleCase(fallbackName) });
    }
    
    return NextResponse.json({ price: null, imageUrl: null, name: null });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: 'Internal server error while scraping' }, { status: 500 });
  }
}

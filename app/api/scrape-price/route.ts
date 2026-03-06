import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client for caching
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * NOTE: Full Playwright/Browserless scraping has been disabled in the main API
 * to ensure fast response times on production. 
 * Use scripts/scrape.js if you want to host this as a separate microservice.
 */

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // --- NORMALIZE URL FOR BETTER CACHE HITS ---
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
       console.log('Cache check failed, continuing with fallback:', e);
    }

    // --- FALLBACK URL PARSER (FAST REGEX) ---
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

    const fallbackName = parseNameFromUrl(url);
    if (fallbackName) {
        return NextResponse.json({ 
            price: null, 
            imageUrl: null, 
            name: toTitleCase(fallbackName),
            status: 'fallback' 
        });
    }
    
    return NextResponse.json({ price: null, imageUrl: null, name: null, status: 'none' });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import asyncio
import random
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

async def human_behavior(page):
    # random mouse moves
    for _ in range(5):
        x = random.randint(100, 800)
        y = random.randint(100, 600)
        await page.mouse.move(x, y, steps=random.randint(5, 25))
        await asyncio.sleep(random.uniform(0.2, 0.6))

    # scroll down in chunks
    for _ in range(3):
        await page.evaluate("""() => {
            window.scrollBy(0, window.innerHeight * 0.8);
        }""")
        await asyncio.sleep(random.uniform(0.5, 1.2))

    # small pause, then scroll up
    await asyncio.sleep(random.uniform(0.5, 1.0))
    await page.evaluate("""() => {
        window.scrollBy(0, -window.innerHeight * 0.5);
    }""")
    await asyncio.sleep(random.uniform(0.3, 0.8))

    # click a random point
    bx = random.randint(50, 750)
    by = random.randint(50, 550)
    await page.mouse.click(bx, by)
    await asyncio.sleep(random.uniform(1.0, 2.0))


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        await stealth_async(page)  # optional stealth
        await page.goto("https://example.com")
        await human_behavior(page)
        # now you can scrape or do more...
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

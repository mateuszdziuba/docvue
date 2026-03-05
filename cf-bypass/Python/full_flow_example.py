import asyncio
import random
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

PROXIES = [
    "http://username:password@proxy1.example.com:8000",
    "http://username:password@proxy2.example.com:8000",
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
]

async def human_like_interaction(page):
    await page.mouse.move(100, 100)
    await asyncio.sleep(random.uniform(0.5, 1.5))
    await page.mouse.move(200, 300)
    await asyncio.sleep(random.uniform(0.5, 1.5))
    await page.evaluate("window.scrollBy(0, window.innerHeight / 2)")
    await asyncio.sleep(random.uniform(1, 2))

async def main():
    proxy = random.choice(PROXIES)
    user_agent = random.choice(USER_AGENTS)

    async with async_playwright() as p:
        browser = await p.chromium.launch(proxy={"server": proxy}, headless=True)
        context = await browser.new_context(user_agent=user_agent)
        page = await context.new_page()
        await stealth_async(page)  # apply stealth

        await page.goto("https://example.com")
        await human_like_interaction(page)

        content = await page.content()
        print(content[:500])  # print first 500 chars

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

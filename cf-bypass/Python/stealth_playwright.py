from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    stealth_sync(page)  

    page.goto("https://example.com", timeout=60000)
    print(page.title())

    browser.close()

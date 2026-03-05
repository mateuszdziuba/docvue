import random
from playwright.sync_api import sync_playwright

headers_list = [
    {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
    },
    {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "Accept-Language": "en-GB,en;q=0.8",
        "Accept-Encoding": "gzip, deflate",
    },
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        extra_http_headers=random.choice(headers_list)
    )
    page = context.new_page()
    page.goto("https://httpbin.org/headers")
    print(page.text_content("pre"))
    browser.close()
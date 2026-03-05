import random
from playwright.sync_api import sync_playwright

proxies = [
    "http://user:pass@proxy1.example.com:8000",
    "http://user:pass@proxy2.example.com:8000",
    "http://user:pass@proxy3.example.com:8000"
]

proxy = random.choice(proxies)

with sync_playwright() as p:
    browser = p.chromium.launch(proxy={"server": proxy})
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://httpbin.org/ip")
    print(page.text_content("body"))
    browser.close()

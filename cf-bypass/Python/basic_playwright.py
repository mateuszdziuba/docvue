from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    url = "https://example.com"  # replace with target URL
    page.goto(url, timeout=60000)
    html = page.content()

    with open("page.html", "w", encoding="utf-8") as f:
        f.write(html)

    browser.close()

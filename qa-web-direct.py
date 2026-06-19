from playwright.sync_api import sync_playwright
from pathlib import Path

base = Path(__file__).parent
url = "https://cati-9dxibsf44-walerimoretz-langs-projects.vercel.app"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(url, wait_until='networkidle')
    page.screenshot(path=str(base / 'qa_web_direct_desktop.png'), full_page=True)
    browser.close()

print('Direct deployment screenshot captured.')

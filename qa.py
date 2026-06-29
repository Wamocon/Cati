from pathlib import Path
from playwright.sync_api import sync_playwright

url = "http://localhost:3104/tr/platform"
output_dir = Path("qa_output")
output_dir.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(url, wait_until="networkidle")
    page.screenshot(path=str(output_dir / "platform_desktop.png"), full_page=True)

    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(url, wait_until="networkidle")
    page.screenshot(path=str(output_dir / "platform_mobile.png"), full_page=True)

    logs = []
    page.on("console", lambda msg: logs.append(f"{msg.type}: {msg.text}"))
    page.on("pageerror", lambda err: logs.append(f"pageerror: {err}"))
    page.goto(url, wait_until="networkidle")
    page.wait_for_timeout(2000)
    (output_dir / "platform_console.txt").write_text(
        "\n".join(logs) or "No console messages captured.",
        encoding="utf-8",
    )

    browser.close()

print("Platform QA screenshots and console log updated.")

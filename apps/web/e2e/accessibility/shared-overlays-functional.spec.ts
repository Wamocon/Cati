import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test, type Locator, type Page } from "@playwright/test"
import { openDashboardAs } from "../support/flows"

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8")

async function expectModalKeyboardContract(
  page: Page,
  dialog: Locator,
  trigger: Locator
) {
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate((node) => node.matches(":modal"))).toBe(true)
  expect(
    await dialog.evaluate((node) => node.contains(document.activeElement))
  ).toBe(true)

  const controls = dialog.locator(
    "a[href]:visible, button:not([disabled]):visible, select:not([disabled]):visible, input:not([disabled]):visible"
  )
  expect(await controls.count()).toBeGreaterThan(1)

  await controls.last().focus()
  await page.keyboard.press("Tab")
  await expect(controls.first()).toBeFocused()

  await controls.first().focus()
  await page.keyboard.press("Shift+Tab")
  await expect(controls.last()).toBeFocused()

  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
}

test.describe("shared overlay accessibility contracts", () => {
  test("public and dashboard navigation use native modal contracts", () => {
    const navbar = readSource("app/sections/navbar.tsx")
    const sidebar = readSource("app/[locale]/dashboard/dashboard-sidebar.tsx")

    for (const source of [navbar, sidebar]) {
      expect(source).toContain("<dialog")
      expect(source).toContain("dialog.showModal()")
      expect(source).toContain("onCancel=")
      expect(source).toContain("onClose=")
      expect(source).toContain("aria-labelledby=")
    }
    expect(navbar).toContain("xl:flex")
    expect(navbar).toContain("z-[200]")
  })

  test("table tools expose controls in a labelled dialog rather than a menu", () => {
    const table = readSource("components/data-table.tsx")

    expect(table).toContain('role="dialog"')
    expect(table).toContain('aria-modal="false"')
    expect(table).toContain('aria-haspopup="dialog"')
    expect(table).toContain("optionsFirstControlRef.current?.focus()")
    expect(table).not.toContain('role="menu"')
  })

  test("public mobile navigation traps focus and restores its trigger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/tr")

    const trigger = page.getByTestId("menu-toggle")
    await trigger.click()
    await expectModalKeyboardContract(
      page,
      page.locator("#public-mobile-menu"),
      trigger
    )
  })

  test("public desktop navigation fits at 1280px in every locale", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    for (const locale of ["tr", "en", "de", "ru"]) {
      await page.goto(`/${locale}`)
      const header = page.locator("header").first()
      const navigation = header.locator("nav").first()

      await expect(navigation).toBeVisible()
      await expect(header.getByTestId("menu-toggle")).toBeHidden()
      expect(await navigation.locator("a").count()).toBeGreaterThanOrEqual(8)

      const layout = await navigation.evaluate((node) => ({
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        pageClientWidth: document.documentElement.clientWidth,
        pageScrollWidth: document.documentElement.scrollWidth,
      }))
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1)
      expect(layout.pageScrollWidth).toBeLessThanOrEqual(
        layout.pageClientWidth + 1
      )
    }
  })

  test("dashboard off-canvas traps focus and restores its trigger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openDashboardAs(page, "admin")

    const trigger = page.getByTestId("dashboard-menu-toggle")
    await trigger.click()
    await expectModalKeyboardContract(
      page,
      page.locator("#dashboard-mobile-sidebar"),
      trigger
    )
  })

  test("table tools focus their first control and return focus on Escape", async ({
    page,
  }) => {
    await openDashboardAs(page, "admin", "/tr/dashboard/listings")

    const trigger = page
      .getByRole("button", { name: /Ayarlar|Options/i })
      .first()
    await trigger.click()
    const tools = page.getByRole("dialog", {
      name: /Tablo araçları|Table tools/i,
    })
    await expect(tools).toBeVisible()
    await expect(
      tools.getByRole("button", { name: /Sıfırla|Reset/i })
    ).toBeFocused()

    await page.keyboard.press("Escape")
    await expect(tools).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })
})

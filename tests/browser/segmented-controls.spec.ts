import { expect, test } from './browserApp'

test('Icon-Tabs beschriften responsiv und bleiben per Tastatur erreichbar', async ({ app, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await app.open('/apps/triathlon-tracker')
  const navigation = page.getByRole('tablist', { name: 'Triathlon-Tracker' })
  const planning = navigation.getByRole('tab', { name: 'Planung', exact: true })
  const records = navigation.getByRole('tab', { name: 'Rekorde', exact: true })
  const inactiveOpacity = page.viewportSize()!.width >= 430 ? '1' : '0'
  await expect(records.locator('.selection-label')).toHaveCSS('opacity', '1')
  await expect(planning.locator('.selection-label')).toHaveCSS('opacity', inactiveOpacity)
  await records.focus()
  await records.press('ArrowRight')
  await expect(planning).toBeFocused()
  await expect(planning).toHaveAttribute('aria-selected', 'true')
  await expect(planning.locator('.selection-label')).toHaveCSS('opacity', '1')
  await expect(records.locator('.selection-label')).toHaveCSS('opacity', inactiveOpacity)
  for (const item of await navigation.getByRole('tab').all()) {
    await expect(item).toHaveCSS('border-top-width', '0px')
  }
  const calendar = page.getByRole('radiogroup', { name: 'Planung', exact: true })
  await calendar.getByRole('radio', { name: 'Woche', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(calendar.getByRole('radio', { name: 'Monat', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(calendar.getByRole('radio', { name: 'Monat', exact: true })).toBeFocused()
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  await expect(calendar.locator('.selection-indicator')).toHaveCSS('transition-duration', '0s')
  await app.expectHealthy()
})

test('Auswahlindikator gleitet und richtet sich nach Größenwechseln aus @desktop', async ({ app, page }) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await app.open('/apps/triathlon-tracker')
  const navigation = page.getByRole('tablist', { name: 'Triathlon-Tracker' })
  const indicator = navigation.locator('.selection-indicator')
  const before = await indicator.boundingBox()
  await navigation.getByRole('tab', { name: 'Verlauf', exact: true }).click()
  await expect(indicator).toHaveCSS('transition-duration', '0.12s, 0.12s, 0.12s')
  await expect.poll(async () => (await indicator.boundingBox())?.x).toBeGreaterThan(before!.x + 10)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await navigation.getByRole('tab', { name: 'Rekorde', exact: true }).click()
  for (const width of [320, 360, 375, 390, 393, 412, 429, 430, 431, 440, 768, 820, 899, 900, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => new Promise(requestAnimationFrame))
    const trackWidth = (await navigation.boundingBox())!.width
    for (const tab of await navigation.getByRole('tab').all()) {
      await tab.click()
      expect(Math.abs((await navigation.boundingBox())!.width - trackWidth), `Stabile Breite bei ${width}px`).toBeLessThanOrEqual(1)
    }
    const selected = navigation.getByRole('tab', { selected: true })
    await expect.poll(async () => {
      const item = await selected.boundingBox()
      const marker = await indicator.boundingBox()
      return Math.max(Math.abs(item!.x - marker!.x), Math.abs(item!.y - marker!.y), Math.abs(item!.width - marker!.width))
    }, { message: `Auswahlfläche bei ${width}px` }).toBeLessThanOrEqual(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `Überlauf bei ${width}px`).toBeLessThanOrEqual(1)
    await expect(selected.locator('.selection-label')).toHaveCSS('opacity', '1')
    for (const tab of await navigation.getByRole('tab').all()) {
      const isSelected = await tab.getAttribute('aria-selected') === 'true'
      await expect(tab.locator('.selection-label')).toHaveCSS('opacity', width >= 430 || isSelected ? '1' : '0')
    }
  }
  await app.expectHealthy()
})

test('Farbschema wechselt global, wird gespeichert und ist im Dunkelmodus barrierefrei', async ({ app, page }) => {
  await app.open('/')
  const root = page.locator('html')
  await expect(root).not.toHaveClass(/\bdark\b/)
  const colorScheme = page.getByRole('radiogroup', { name: 'Farbschema auswählen' })
  if (await colorScheme.isVisible()) {
    await colorScheme.getByRole('radio', { name: 'Dunkel' }).click()
  } else {
    await page.getByRole('button', { name: 'Navigation' }).click()
    await page.getByRole('menuitemradio', { name: 'Dunkel' }).click()
  }
  await expect(root).toHaveClass(/\bdark\b/)
  expect(await page.evaluate(() => localStorage.getItem('bengtstoolbox.colorScheme'))).toBe('dark')
  await app.expectHealthy()
  // app.open() leert LocalStorage; clientseitige Navigation prüft, dass das Schema in Apps gilt.
  await page.getByRole('link', { name: /Fortschritts-Dashboard/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Fortschritts-Dashboard' })).toBeVisible()
  await expect(root).toHaveClass(/\bdark\b/)
  await app.expectHealthy()
})

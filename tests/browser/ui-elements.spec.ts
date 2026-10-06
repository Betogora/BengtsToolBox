import { expect, test } from '@playwright/test'

test('Katalog-Controls lassen sich ausprobieren @desktop', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/docs/ui-elements.html')
  const demo = (name: string) => page.locator(`[data-demo="${name}"]`)
  await expect(demo('Card-Familie').locator('[data-slot="card"]')).toBeVisible()
  await expect(demo('Table-Familie').getByRole('row')).toHaveCount(3)
  await expect(page.locator('[data-icon-name] svg')).toHaveCount(93)

  const invalidName = demo('Input').getByRole('textbox', { name: 'Name', exact: true })
  await expect(invalidName).toHaveAttribute('aria-invalid', 'true')
  await expect(invalidName).toHaveAccessibleDescription('Bitte einen Namen eingeben.')
  const feedback = demo('Laufzeit- und Rückmeldungszustände')
  const draft = feedback.getByRole('textbox', { name: 'Name nach fehlgeschlagenem Speichern' })
  await draft.fill('Sommerabend mit Freunden')
  await feedback.getByRole('button', { name: 'Erneut versuchen' }).click()
  await expect(draft).toHaveValue('Sommerabend mit Freunden')
  await expect(feedback.getByRole('status')).toHaveText('Name gespeichert.')
  await demo('Toaster / Sonner').getByRole('button', { name: 'Erfolg anzeigen' }).click()
  await expect(page.locator('[data-sonner-toast]')).toContainText('Änderung gespeichert')
  await page.locator('[data-sonner-toast] [data-close-button]').click()

  await demo('Dialog-Familie').getByRole('button', { name: 'Dialog öffnen' }).click()
  const close = page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).last()
  expect((await close.boundingBox())!.width).toBe(36)
  await page.getByRole('dialog').getByRole('textbox').focus()
  await expect(page.getByRole('dialog').getByRole('textbox')).toHaveCSS('outline-style', 'solid')
  await expect(page.getByRole('dialog').getByRole('textbox')).toHaveCSS('outline-width', '2px')
  await close.click()

  const player = demo('Shared PlayerCard')
  await player.getByRole('button', { name: 'Paul erhöhen', exact: true }).click()
  await expect(player.locator('.type-metric-lg')).toHaveText('13')
  await player.getByRole('button', { name: 'Paul verringern', exact: true }).click()
  await expect(player.locator('.type-metric-lg')).toHaveText('12')
  const increaseFive = player.getByRole('button', { name: 'Paul um 5 erhöhen', exact: true })
  const plusHeight = (await player.getByRole('button', { name: 'Paul erhöhen', exact: true }).boundingBox())!.height
  expect(Math.abs((await increaseFive.boundingBox())!.height - plusHeight)).toBeLessThanOrEqual(1)
  await increaseFive.click()
  await expect(player.locator('.type-metric-lg')).toHaveText('17')

  const disclosure = demo('Aufklappen')
  await disclosure.locator('summary').focus()
  await disclosure.locator('summary').press('Enter')
  await expect(disclosure.getByRole('textbox', { name: 'Notiz' })).toBeVisible()
  await disclosure.locator('summary').press('Enter')
  await expect(disclosure.getByRole('textbox', { name: 'Notiz' })).toBeHidden()

  const text = demo('InlineTextEdit')
  await text.getByRole('button', { name: 'Spielername bearbeiten' }).click()
  await text.getByRole('textbox', { name: 'Spielername' }).fill('Alex')
  await text.getByRole('textbox', { name: 'Spielername' }).press('Enter')
  await expect(text.getByText('Alex')).toHaveCount(2)

  await demo('Select-Familie').getByRole('combobox').click()
  await page.getByRole('option', { name: '2 Punkte' }).click()
  await expect(demo('Select-Familie').getByRole('combobox')).toHaveText('2 Punkte')

  await demo('DropdownMenu-Familie').getByRole('button', { name: 'Aktionen' }).click()
  await page.getByRole('menuitem', { name: 'Duplizieren' }).click()
  await expect(demo('DropdownMenu-Familie').getByRole('status')).toHaveText('Kopie erstellt')

  await demo('Popover-Familie').getByRole('button', { name: 'Popover öffnen' }).click()
  await expect(page.getByRole('textbox', { name: 'Kurznotiz' })).toBeVisible()
  await page.keyboard.press('Escape')

  await demo('DatePicker').getByRole('button').click()
  await expect(page.getByRole('grid')).toBeVisible()
  await page.keyboard.press('Escape')

  await demo('ColorPicker').getByRole('button', { name: 'Kompakte Farbe' }).click()
  const wheel = page.getByRole('slider')
  await wheel.focus()
  await wheel.press('ArrowRight')
  await page.keyboard.press('Escape')

  const tabs = demo('Tabs-Familie')
  await tabs.getByRole('tab', { name: 'Ergebnisse', exact: true }).click()
  await expect(tabs.getByRole('tabpanel', { name: 'Ergebnisse' })).toHaveText('12 · 8 · 5 Punkte')
  for (const [group, role] of [[tabs.getByRole('tablist', { name: 'Icon-Tabs' }), 'tab'], [demo('SegmentedControl').getByRole('radiogroup', { name: 'Ansicht' }), 'radio']] as const) {
    for (const viewportWidth of [320, 390, 429, 430, 431, 1440]) {
      await page.setViewportSize({ width: viewportWidth, height: 900 })
      const width = (await group.boundingBox())!.width
      for (const button of await group.getByRole(role).all()) {
        await button.click()
        expect(Math.abs((await group.boundingBox())!.width - width), `Lange Tab-Namen bei ${viewportWidth}px`).toBeLessThanOrEqual(1)
      }
    }
  }
  expect(errors).toEqual([])
})

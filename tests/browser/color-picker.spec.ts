import { expect, test } from './browserApp'

test('Globaler Farbkreis zeigt live an und speichert direkte Änderungen', async ({
  app,
  page,
}, testInfo) => {
  test.setTimeout(90_000)

  const scoreboardRoute = '/apps/scoreboard'
  const appPickers = [
    { route: '/apps/decision-wheel', name: 'Option 1 Farbe wählen' },
    { route: '/apps/progress-dashboard', name: 'Person 1 Farbe wählen' },
    { route: scoreboardRoute, name: null },
    { route: '/apps/sushi', name: 'Bengt Farbe wählen' },
  ]

  for (const picker of appPickers) {
    await app.open(picker.route)

    if (picker.route === '/apps/sushi') {
      await page.getByRole('button', { name: 'Touristen bearbeiten' }).click()
    }

    if (picker.route === '/apps/progress-dashboard') {
      await page.getByRole('button', { name: /^Spieler/, expanded: false }).click()
    }

    const scoreboardPickers = page.locator('button[aria-label^="Farbe für"]')

    if (picker.route === scoreboardRoute) {
      await expect.poll(() => scoreboardPickers.count()).toBeGreaterThan(0)
    }

    const trigger = picker.name
      ? page.getByRole('button', { name: picker.name })
      : scoreboardPickers.first()

    await expect(trigger).toBeVisible()
    await trigger.click()
    await expect(page.getByRole('slider')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('slider')).toBeHidden()
  }

  await app.open(scoreboardRoute)
  const colorPickerFrames = page.locator('button[aria-label^="Farbe für"]')

  await expect.poll(() => colorPickerFrames.count()).toBeGreaterThan(1)

  const picker = colorPickerFrames.first()
  const framePaddings = await colorPickerFrames.evaluateAll((frames) =>
    frames.map((frame) => getComputedStyle(frame).paddingTop),
  )

  expect(framePaddings.length).toBeGreaterThan(1)
  expect([...new Set(framePaddings)]).toEqual(['2px'])

  const storedValues = () =>
    page.evaluate(() =>
      Object.entries(window.localStorage)
        .filter(([key]) => key.includes('scoreboard'))
        .sort(([left], [right]) => left.localeCompare(right)),
    )
  const swatch = picker.locator('span[aria-hidden="true"]')
  const readSwatchColor = () =>
    swatch.evaluate((element) => getComputedStyle(element).backgroundColor)
  const storedBeforePointer = await storedValues()
  const swatchBeforePointer = await readSwatchColor()

  await picker.click()
  const wheel = page.getByRole('slider', {
    name: 'Farbkreis: links und rechts ändern den Farbton, oben und unten die Intensität',
  })
  const wheelBounds = await wheel.boundingBox()

  if (!wheelBounds) {
    throw new Error('Der Farbkreis besitzt keine sichtbaren Abmessungen.')
  }

  if (testInfo.project.name === 'desktop') {
    await page.mouse.move(
      wheelBounds.x + wheelBounds.width / 2,
      wheelBounds.y + wheelBounds.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      wheelBounds.x + wheelBounds.width * 0.8,
      wheelBounds.y + wheelBounds.height / 2,
    )
    await expect.poll(readSwatchColor).not.toBe(swatchBeforePointer)
    expect(await storedValues()).toEqual(storedBeforePointer)
    await page.mouse.up()
  } else {
    await wheel.click({
      position: {
        x: wheelBounds.width * 0.8,
        y: wheelBounds.height / 2,
      },
    })
  }

  await expect.poll(readSwatchColor).not.toBe(swatchBeforePointer)
  await expect.poll(storedValues).not.toEqual(storedBeforePointer)
  await expect(wheel).toBeVisible()

  const storedAfterPointer = await storedValues()
  await page.keyboard.press('Escape')
  await expect(wheel).toBeHidden()
  expect(await storedValues()).toEqual(storedAfterPointer)

  const storedBeforeKeyboard = await storedValues()
  await picker.click()
  await wheel.press('ArrowRight')
  await expect.poll(storedValues).not.toEqual(storedBeforeKeyboard)
  await expect(wheel).toBeVisible()
})

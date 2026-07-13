import AxeBuilder from '@axe-core/playwright'
import { expect, test as base } from '@playwright/test'

const wcagTags = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
] as const

type BrowserApp = {
  open: (route: string) => Promise<void>
  expectHealthy: () => Promise<void>
}

type BrowserFixtures = {
  app: BrowserApp
}

function formatAxeViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
) {
  return violations.flatMap((violation) =>
    violation.nodes.map((node) => ({
      help: violation.help,
      id: violation.id,
      impact: violation.impact,
      summary: node.failureSummary,
      target: node.target.join(' '),
    })),
  )
}

export const test = base.extend<BrowserFixtures>({
  app: async ({ page }, provideFixture) => {
    const runtimeErrors: string[] = []

    page.on('pageerror', (error) => {
      runtimeErrors.push(`pageerror: ${error.message}`)
    })
    page.on('console', (message) => {
      if (message.type() === 'error') {
        runtimeErrors.push(`console.error: ${message.text()}`)
      }
    })

    await page.addInitScript(() => {
      window.localStorage.clear()
      window.localStorage.setItem('bengtstoolbox.language', 'de')
    })

    await provideFixture({
      open: async (route) => {
        runtimeErrors.length = 0
        await page.goto(route)
        await page.waitForLoadState('domcontentloaded')
        await expect(page.locator('body')).toBeVisible()
      },
      expectHealthy: async () => {
        await page.evaluate(async () => {
          await document.fonts.ready
        })

        expect(runtimeErrors, 'unerwartete Browser-Laufzeitfehler').toEqual([])

        const horizontalOverflow = await page.evaluate(() => {
          const documentWidth = Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
          )

          return documentWidth - window.innerWidth
        })

        expect(
          horizontalOverflow,
          'die Seite darf nicht horizontal über den Viewport hinausragen',
        ).toBeLessThanOrEqual(1)

        const accessibilityScan = await new AxeBuilder({ page })
          .withTags([...wcagTags])
          .analyze()

        expect(
          formatAxeViolations(accessibilityScan.violations),
          'WCAG-A/AA-Verstöße im aktuellen Browserzustand',
        ).toEqual([])
      },
    })
  },
})

export { expect }

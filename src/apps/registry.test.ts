import { describe, expect, it } from 'vitest'

import specificationHtml from '../../docs/specs.html?raw'
import specificationMarkdown from '../../docs/specs.md?raw'

import { appRoutes, registeredApps } from '@/apps/registry'

function extractMarkdownRegistryRoutes(markdown: string) {
  const productMap = markdown.match(
    /## 2\. Produktlandkarte und Routen([\s\S]*?)\n## 3\. /,
  )?.[1]

  if (!productMap) {
    throw new Error('Produktlandkarte in docs/specs.md nicht gefunden.')
  }

  return productMap
    .split(/\r?\n/)
    .map((line) =>
      line.match(/^\|\s*[^|]+\|\s*`([^`]+)`\s*\|\s*Registry\s*\|/)?.[1],
    )
    .filter((route): route is string => route !== undefined)
}

function extractHtmlRegistryRoutes(html: string) {
  const productMap = html.match(
    /<section class="section" id="produktlandkarte">([\s\S]*?)<\/section>/,
  )?.[1]

  if (!productMap) {
    throw new Error('Produktlandkarte in docs/specs.html nicht gefunden.')
  }

  return [
    ...productMap.matchAll(
      /<tr><td>[^<]+<\/td><td><code>([^<]+)<\/code><\/td><td>Registry<\/td>/g,
    ),
  ].map((match) => match[1])
}

function expectUnique(values: string[]) {
  expect(new Set(values).size).toBe(values.length)
}

describe('app registry contract', () => {
  it('uses unique ids, hrefs, and route paths', () => {
    expectUnique(registeredApps.map((app) => app.id))
    expectUnique(registeredApps.map((app) => app.href))
    expectUnique(registeredApps.map((app) => app.routePath))
  })

  it('keeps hrefs and router paths aligned', () => {
    for (const app of registeredApps) {
      expect(app.href).toBe(`/${app.routePath}`)
    }

    expect(appRoutes).toEqual(
      registeredApps.map((app) => ({ appId: app.id, path: app.routePath })),
    )
  })

  it('matches both documented registry route lists in registry order', () => {
    const expectedRoutes = registeredApps.map((app) => app.href)

    expect(extractMarkdownRegistryRoutes(specificationMarkdown)).toEqual(
      expectedRoutes,
    )
    expect(extractHtmlRegistryRoutes(specificationHtml)).toEqual(expectedRoutes)
  })
})

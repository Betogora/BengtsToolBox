import type { Plugin } from 'vite'

export function insertUiCatalogBundle(html: string, bundle: { style: string; script: string }): string

export function uiCatalogPlugin(): Plugin

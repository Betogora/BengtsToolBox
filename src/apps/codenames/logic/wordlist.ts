import { cryptoRandomInt, shuffle, type RandomInt } from './random'

/** Vergleichsform: klein, Umlaute ausgeschrieben, nur a–z und Ziffern. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/** Zeilen der Wortliste ohne Kommentare und ohne Dubletten (nach `norm`). */
export function parseWordlist(text: string): string[] {
  const unique = new Map<string, string>()
  for (const line of text.split(/\r?\n/)) {
    const word = line.trim()
    if (!word || word.startsWith('#')) continue
    const key = norm(word)
    if (!unique.has(key)) unique.set(key, word)
  }
  return [...unique.values()]
}

const FORM_SUFFIXES = ['e', 'n', 'en', 'in', 's']

/**
 * Bloße Wortformen desselben Begriffs (HOSE/HOSEN, KÖNIG/KÖNIGIN): kürzeres Wort plus
 * Endung e, n, en, in oder s. Ähnliche, aber verschiedene Wörter (GERICHT/GESICHT) zählen nicht.
 */
export function sameForm(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na]
  return long.startsWith(short) && FORM_SUFFIXES.includes(long.slice(short.length))
}

/** 25 Begriffe: Fisher-Yates über die ganze Liste, Wortformen desselben Begriffs ausgelassen. */
export function drawWords(pool: readonly string[], randomInt: RandomInt = cryptoRandomInt, count = 25): string[] {
  const words: string[] = []
  for (const word of shuffle([...pool], randomInt)) {
    if (!words.some((w) => sameForm(w, word))) words.push(word)
    if (words.length === count) break
  }
  if (words.length < count) throw new Error(`Die Wortliste enthält zu wenige Begriffe (${words.length} statt ${count}).`)
  return words
}

/**
 * Anzeigeform eines Wortes: großer Anfangsbuchstabe. Durchgehend groß geschriebene Wörter
 * (z. B. vom Modell „MATADOR“) werden zu „Matador“; gemischte Schreibung (McDonald) bleibt.
 */
export function displayWord(word: string): string {
  const w = word.trim()
  if (!w) return w
  const lettersUpper = w === w.toUpperCase() && w !== w.toLowerCase()
  const base = lettersUpper && w.length > 2 ? w.toLowerCase() : w
  return base.charAt(0).toUpperCase() + base.slice(1)
}

// Weiche Trennstellen (U+00AD) nach einer einfachen deutschen Silbenregel. Browser ohne
// Trennwörterbuch (hyphens: auto) brechen lange Begriffe sonst mitten im Buchstaben.
const SHY = '­'
const VOWEL = /[aeiouäöüy]/
const UNITS = ['sch', 'ch', 'ck', 'ph', 'th', 'qu']
const ONSET_PARTNERS = ['b', 'p', 't', 'd', 'k', 'g', 'f', 'sch']

function units(cluster: string): string[] {
  const out: string[] = []
  for (let i = 0; i < cluster.length; ) {
    const unit = UNITS.find((u) => cluster.startsWith(u, i)) ?? cluster[i]!
    out.push(unit)
    i += unit.length
  }
  return out
}

export function hyphenate(word: string, minPart = 2): string {
  const lower = word.toLowerCase()
  if (lower.length < 2 * minPart + 1 || lower.length !== word.length) return word
  const splits: number[] = []
  let i = 0
  // Zum ersten Vokal.
  while (i < lower.length && !VOWEL.test(lower[i]!)) i++
  while (i < lower.length) {
    while (i < lower.length && VOWEL.test(lower[i]!)) i++
    const start = i
    while (i < lower.length && !VOWEL.test(lower[i]!)) i++
    if (i >= lower.length) break
    const parts = units(lower.slice(start, i))
    if (!parts.length) continue
    // Trennung vor dem letzten Konsonanten; „sp“/„st“ am Ende eines längeren Clusters bleiben zusammen.
    // Konsonant + r/l am Ende eines längeren Clusters ebenso (Kugel-schreiber, Zen-trum, An-drang).
    let keep = 1
    if (parts.length >= 3 && parts.at(-2) === 's' && ['p', 't'].includes(parts.at(-1)!)) keep = 2
    if (parts.length >= 3 && ['r', 'l'].includes(parts.at(-1)!) && ONSET_PARTNERS.includes(parts.at(-2)!)) keep = 2
    const at = i - parts.slice(-keep).join('').length
    if (at >= minPart && lower.length - at >= minPart) splits.push(at)
  }
  let out = ''
  let last = 0
  for (const at of splits) {
    out += word.slice(last, at) + SHY
    last = at
  }
  return out + word.slice(last)
}

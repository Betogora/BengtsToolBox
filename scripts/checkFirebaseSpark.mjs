const token = process.env.GOOGLE_ACCESS_TOKEN
const projectId = process.env.FIREBASE_PROJECT_ID
if (!token || !projectId) throw new Error('Spark-Prüfung braucht Google-Zugriff und Projekt-ID.')
const response = await fetch(`https://cloudbilling.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/billingInfo`, {
  headers: { Authorization: `Bearer ${token}` },
})
if (!response.ok) throw new Error(`Abrechnungsstatus nicht prüfbar (${response.status}); Deployment abgebrochen.`)
const billing = await response.json()
if (billing.billingEnabled !== false || billing.billingAccountName) {
  throw new Error('Abrechnung aktiviert oder Konto verknüpft; nur Spark ohne Abrechnung ist erlaubt.')
}
console.log(`Kostenprüfung bestanden: ${projectId} ohne verknüpftes Abrechnungskonto.`)

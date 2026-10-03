import { expect, test } from '@playwright/test'

test('Zwei Geräte synchronisieren Buzz, Reload und Mobilfunk-Reconnect @desktop', async ({ browser }) => {
  test.skip(!process.env.FIREBASE_DATABASE_EMULATOR_HOST, 'Requires Auth, Firestore and Realtime Database emulators')
  const contexts = await Promise.all([browser.newContext(), browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), browser.newContext({ viewport: { width: 320, height: 720 }, hasTouch: true })])
  try {
    const pages = []
    for (const [i, context] of contexts.entries()) {
      await context.route('**/src/lib/firebase/client.ts*', async (route) => {
        const response = await route.fetch()
        let source = await response.text()
        source = source.replace(/const isFirebaseConfigured = Boolean\([\s\S]*?\);/, 'const isFirebaseConfigured = true;')
        source = source.replace('initializeApp(firebaseConfig)', "initializeApp({apiKey:'emulator-key',authDomain:'demo-buzzer-browser.firebaseapp.com',projectId:'demo-buzzer-browser',appId:'1:123:web:emulator'})")
        const auth = source.match(/from "([^"]*firebase_auth[^"]*)"/)![1]
        const firestore = source.match(/from "([^"]*firebase_firestore[^"]*)"/)![1]
        source += `\nimport {connectAuthEmulator} from ${JSON.stringify(auth)};\nimport {connectFirestoreEmulator} from ${JSON.stringify(firestore)};\nconst emulatorServices=getFirebaseServices();connectAuthEmulator(emulatorServices.auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(emulatorServices.db,'127.0.0.1',8080);`
        await route.fulfill({ response, body: source })
      })
      await context.route('**/src/lib/firebase/realtimeDatabase.ts*', async (route) => {
        const response = await route.fetch()
        let source = await response.text()
        const databaseImport = source.match(/import\("([^"]*firebase_database[^"]*)"\)/)![1]
        source = source.replace(/const url = [^;]+;/, "const url = 'https://demo-buzzer-browser-default-rtdb.firebaseio.com';")
        source = source.replace('return getDatabase(services.app, url);', "const database=getDatabase(services.app,url);if(!emulatorConnected){connectDatabaseEmulator(database,'127.0.0.1',9000);emulatorConnected=true;}return database;")
        // Keep both presses in flight before either winner reaches the other device.
        source = source.replace(/(async function updateRealtimeValue\([^)]*\)\s*\{)/, '$1 await new Promise(resolve => setTimeout(resolve, 250));')
        expect(source).toContain('await new Promise(resolve => setTimeout(resolve, 250))')
        source += `\nimport {connectDatabaseEmulator} from ${JSON.stringify(databaseImport)};\nlet emulatorConnected=false;`
        await route.fulfill({ response, body: source })
      })
      const page = await context.newPage()
      pages.push(page)
      if (i === 2) continue
      await page.goto('/apps/live-buzzer')
      await expect(page.getByRole('button', { name: 'Beitreten', exact: true })).toBeVisible({ timeout: 30_000 })
      await page.getByLabel('Dein Spielername').fill(i ? 'Handy' : 'Spielleitung')
      if (i === 0) await page.getByRole('button', { name: 'Spielleitung', exact: true }).click()
      await page.getByRole('button', { name: 'Beitreten', exact: true }).click()
    }
    const [host, phone, latePhone] = pages
    await host.getByRole('button', { name: 'Uhrabgleich starten' }).click()
    await host.getByRole('button', { name: 'Neue Runde freigeben' }).click()
    await expect(phone.getByRole('button', { name: 'Buzz', exact: true })).toBeEnabled()
    await phone.getByRole('button', { name: 'Buzz', exact: true }).tap()
    await expect(host.getByRole('list', { name: 'Buzz-Reihenfolge' })).toContainText('Handy')
    await phone.reload()
    await expect(phone.getByRole('button', { name: 'Buzz registriert', exact: true })).toBeDisabled()
    await expect(phone.getByRole('list', { name: 'Buzz-Reihenfolge' })).toContainText('Handy')
    await expect(phone.getByText('Sieger', { exact: true })).toBeVisible()
    await host.getByRole('button', { name: 'Neue Runde freigeben' }).click()
    await expect(phone.getByRole('button', { name: 'Buzz', exact: true })).toBeEnabled()
    await phone.context().setOffline(true)
    await expect(phone.getByText('Offline – Buzzer gesperrt')).toBeVisible()
    await expect(phone.getByRole('button', { name: 'Gesperrt', exact: true })).toBeDisabled()
    await phone.context().setOffline(false)
    await expect(phone.getByRole('button', { name: 'Buzz', exact: true })).toBeEnabled({ timeout: 30_000 })
    await host.getByRole('switch', { name: 'Auch mitspielen' }).click()
    await host.getByRole('button', { name: 'Uhrabgleich starten' }).click()
    await host.getByRole('button', { name: 'Neue Runde freigeben' }).click()
    for (const page of pages.slice(0, 2)) await expect(page.getByRole('button', { name: 'Buzz', exact: true })).toBeEnabled()
    await Promise.all(pages.slice(0, 2).map((page) => page.getByRole('button', { name: 'Buzz', exact: true }).dispatchEvent('pointerdown', { button: 0 })))
    await expect(host.getByRole('list', { name: 'Buzz-Reihenfolge' }).getByRole('listitem')).toHaveCount(2)
    await expect(phone.getByText('Sieger', { exact: true })).toBeVisible()
    await host.getByRole('button', { name: 'Neue Runde freigeben' }).click()
    await host.getByRole('button', { name: 'Buzz', exact: true }).click()
    await expect(phone.getByRole('button', { name: 'Nachbuzz', exact: true })).toBeVisible()
    await phone.getByRole('button', { name: 'Nachbuzz', exact: true }).tap()
    await expect(host.getByText('Nach Sperre', { exact: true })).toBeVisible()
    await expect(host.getByRole('list', { name: 'Buzz-Reihenfolge' })).toContainText('Spielleitung')
    await expect(phone.getByRole('list', { name: 'Buzz-Reihenfolge' })).toContainText('Spielleitung')
    await latePhone.goto('/apps/live-buzzer')
    await expect(latePhone.getByRole('button', { name: 'Spielleitung', exact: true })).toBeDisabled()
    await latePhone.getByLabel('Dein Spielername').fill('Nachzügler')
    await latePhone.getByRole('button', { name: 'Beitreten', exact: true }).click()
    await expect(latePhone.getByRole('button', { name: 'Gesperrt', exact: true })).toBeDisabled()
    await expect(host.getByRole('button', { name: 'Neue Runde freigeben' })).toBeDisabled()
    await host.getByRole('button', { name: 'Uhrabgleich starten' }).click()
    await host.getByRole('button', { name: 'Neue Runde freigeben' }).click()
    await expect(latePhone.getByRole('button', { name: 'Buzz', exact: true })).toBeEnabled()
    await host.reload()
    await expect(host.getByRole('button', { name: 'Uhrabgleich starten' })).toBeVisible()
    await expect(host.getByRole('button', { name: 'Beitreten', exact: true })).toHaveCount(0)
  } finally { await Promise.all(contexts.map((context) => context.close())) }
})

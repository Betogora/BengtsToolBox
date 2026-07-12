import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const projectId = 'demo-bengtstoolbox-lobbies'
let testEnvironment: RulesTestEnvironment

function validLobby(id: string, uid: string) {
  return {
    id,
    code: id,
    name: 'Test Lobby',
    kind: 'custom',
    createdAt: serverTimestamp(),
    createdAtClientIso: new Date().toISOString(),
    createdByDeviceId: uid,
  }
}

function validDevice(uid: string) {
  const clientIso = new Date().toISOString()
  return {
    deviceId: uid,
    deviceName: 'Testgerät',
    firstSeenAt: serverTimestamp(),
    firstSeenAtClientIso: clientIso,
    lastSeenAt: serverTimestamp(),
    lastSeenAtClientIso: clientIso,
  }
}

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync(resolve('firebase/firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

beforeEach(async () => {
  await testEnvironment.clearFirestore()
})

afterAll(async () => {
  await testEnvironment.cleanup()
})

describe('lobby Firestore rules', () => {
  it('allows anonymous users to create and list valid public lobbies', async () => {
    const creator = testEnvironment.authenticatedContext('creator').firestore()

    await assertSucceeds(setDoc(doc(creator, 'lobbies/ABC234'), validLobby('ABC234', 'creator')))
    await assertSucceeds(getDocs(collection(creator, 'lobbies')))
  })

  it('keeps device writes scoped to the current device but allows the admin UI to list history', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'lobbies/ABC234'), {
        ...validLobby('ABC234', 'creator'),
        createdAt: new Date(),
      })
    })

    const own = testEnvironment.authenticatedContext('device-a').firestore()
    const other = testEnvironment.authenticatedContext('device-b').firestore()

    await assertSucceeds(
      setDoc(doc(own, 'lobbies/ABC234/devices/device-a'), validDevice('device-a')),
    )
    await assertFails(
      setDoc(doc(other, 'lobbies/ABC234/devices/device-a'), validDevice('device-a')),
    )
    await assertSucceeds(getDocs(collection(own, 'lobbies/ABC234/devices')))
  })

  it('allows shared app state only below an existing lobby', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'lobbies/ABC234'), {
        ...validLobby('ABC234', 'creator'),
        createdAt: new Date(),
      })
    })
    const participant = testEnvironment.authenticatedContext('participant').firestore()

    await assertSucceeds(
      setDoc(doc(participant, 'lobbies/ABC234/apps/scoreboard/state/default'), {
        score: 2,
      }),
    )
    await assertFails(
      setDoc(doc(participant, 'lobbies/ZZZ999/apps/scoreboard/state/default'), {
        score: 2,
      }),
    )
  })

  it('allows a custom lobby to be archived but never hard-deleted', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'lobbies/ABC234'), {
        ...validLobby('ABC234', 'creator'),
        createdAt: new Date(),
      })
    })
    const creator = testEnvironment.authenticatedContext('creator').firestore()

    await assertSucceeds(
      updateDoc(doc(creator, 'lobbies/ABC234'), {
        deletedAt: serverTimestamp(),
        deletedAtClientIso: new Date().toISOString(),
        deletedByDeviceId: 'creator',
      }),
    )
    await assertFails(deleteDoc(doc(creator, 'lobbies/ABC234')))
    await assertFails(
      setDoc(doc(creator, 'lobbies/ABC234/apps/scoreboard/state/default'), {
        score: 3,
      }),
    )
  })

  it('never allows the global default lobby to be archived', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'lobbies/default'), {
        id: 'default',
        code: 'DEFAULT',
        name: 'Globale Lobby',
        kind: 'default',
        createdAt: new Date(),
        createdAtClientIso: new Date().toISOString(),
        createdByDeviceId: null,
      })
    })
    const user = testEnvironment.authenticatedContext('device-a').firestore()

    await assertFails(
      updateDoc(doc(user, 'lobbies/default'), {
        deletedAt: serverTimestamp(),
        deletedAtClientIso: new Date().toISOString(),
        deletedByDeviceId: 'device-a',
      }),
    )
  })
})

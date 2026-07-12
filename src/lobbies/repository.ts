import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'

import { getFirebaseServices } from '@/lib/firebase/client'
import { firebasePaths } from '@/lib/firebase/paths'
import { defaultLobby } from '@/lobbies/types'

export async function ensureDefaultLobbyDocument() {
  const services = getFirebaseServices()

  if (!services) return

  const reference = doc(services.db, firebasePaths.lobby(defaultLobby.id))

  await runTransaction(services.db, async (transaction) => {
    const snapshot = await transaction.get(reference)

    if (!snapshot.exists()) {
      transaction.set(reference, {
        ...defaultLobby,
        createdAt: serverTimestamp(),
      })
    }
  })
}

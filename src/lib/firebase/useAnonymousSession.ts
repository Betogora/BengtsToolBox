import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'

import {
  ensureAnonymousUser,
  getFirebaseServices,
  isFirebaseConfigured,
} from '@/lib/firebase/client'
import { getOrCreateLocalId } from '@/lib/firebase/localStore'

export function useAnonymousSession() {
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(!isFirebaseConfigured)
  const localUserId = useMemo(
    () => getOrCreateLocalId('app-hub:local-user-id'),
    [],
  )

  useEffect(() => {
    const services = getFirebaseServices()

    if (!services) {
      return undefined
    }

    const unsubscribe = onAuthStateChanged(services.auth, (authUser) => {
      setUser(authUser)
      setIsReady(true)
    })

    ensureAnonymousUser().catch(() => setIsReady(true))

    return unsubscribe
  }, [])

  return {
    isReady,
    user,
    userId: user?.uid ?? localUserId,
    isFirebaseConfigured,
  }
}

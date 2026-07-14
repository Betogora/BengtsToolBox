import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'

import {
  ensureAnonymousUser,
  getFirebaseServices,
  isFirebaseConfigured,
} from '@/lib/firebase/client'
import { getOrCreateLocalId } from '@/lib/firebase/localStore'
import { createSyncError, type SyncError } from '@/lib/firebase/syncError'

export function useAnonymousSession() {
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(!isFirebaseConfigured)
  const [authError, setAuthError] = useState<SyncError | null>(null)
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
      setAuthError(null)
      setIsReady(true)
    })

    ensureAnonymousUser().catch((error: unknown) => {
      setAuthError(createSyncError(error, 'auth', 'subscribe'))
      setIsReady(true)
    })

    return unsubscribe
  }, [])

  return {
    isReady,
    user,
    userId: user?.uid ?? localUserId.value,
    error: authError ?? (localUserId.ok ? null : localUserId.error),
    isFirebaseConfigured,
  }
}

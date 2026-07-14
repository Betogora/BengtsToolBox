import { useCallback, useState } from 'react'

import { localStore } from '@/lib/firebase/localStore'
import type { SyncError } from '@/lib/firebase/syncError'
import { defaultDeviceName, normalizeDeviceName } from '@/lobbies/domain'

const deviceNameKey = 'bengts-toolbox:device-name'

export function readDeviceName(deviceId = '') {
  return localStore.readText(deviceNameKey, defaultDeviceName(deviceId))
}

export function saveDeviceName(value: string) {
  const normalized = normalizeDeviceName(value)
  const result = localStore.writeText(deviceNameKey, normalized)
  return { ...result, value: normalized }
}

export function useDeviceName(deviceId: string) {
  const initial = readDeviceName(deviceId)
  const [deviceName, setDeviceNameState] = useState(initial.value)
  const [error, setError] = useState<SyncError | null>(
    initial.ok ? null : initial.error,
  )

  const setDeviceName = useCallback((value: string) => {
    const result = saveDeviceName(value)
    setDeviceNameState(result.value)
    setError(result.ok ? null : result.error)
    return result
  }, [])

  return { deviceName, error, setDeviceName }
}

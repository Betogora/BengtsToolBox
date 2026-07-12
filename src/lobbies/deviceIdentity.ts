import { useCallback, useState } from 'react'

import { defaultDeviceName, normalizeDeviceName } from '@/lobbies/domain'

const deviceNameKey = 'bengts-toolbox:device-name'

export function readDeviceName(deviceId = '') {
  try {
    return window.localStorage.getItem(deviceNameKey) || defaultDeviceName(deviceId)
  } catch {
    return defaultDeviceName(deviceId)
  }
}

export function saveDeviceName(value: string) {
  const normalized = normalizeDeviceName(value)
  window.localStorage.setItem(deviceNameKey, normalized)
  return normalized
}

export function useDeviceName(deviceId: string) {
  const [deviceName, setDeviceNameState] = useState(() => readDeviceName(deviceId))

  const setDeviceName = useCallback((value: string) => {
    const normalized = saveDeviceName(value)
    setDeviceNameState(normalized)
    return normalized
  }, [])

  return { deviceName, setDeviceName }
}

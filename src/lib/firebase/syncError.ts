import type { TranslationKey } from '@/lib/i18n'

export type SyncErrorSource =
  | 'local-storage'
  | 'auth'
  | 'snapshot'
  | 'firestore'

export type SyncOperation =
  | 'read'
  | 'write'
  | 'remove'
  | 'create-id'
  | 'subscribe'
  | 'save'
  | 'merge'
  | 'set-item'
  | 'save-items'
  | 'merge-item'
  | 'delete-item'
  | 'delete-items'
  | 'clear-items'
  | 'batch'
  | 'rollback'

export type SyncErrorCode =
  | 'storage-unavailable'
  | 'storage-quota'
  | 'storage-serialization'
  | 'id-generation'
  | 'authentication'
  | 'permission-denied'
  | 'network'
  | 'write-rejected'
  | 'snapshot-failed'
  | 'too-many-writes'
  | 'rollback-failed'
  | 'unknown'

export class SyncError extends Error {
  readonly name = 'SyncError'
  readonly source: SyncErrorSource
  readonly operation: SyncOperation
  readonly code: SyncErrorCode
  readonly retryable: boolean
  readonly cause?: unknown

  constructor(
    message: string,
    source: SyncErrorSource,
    operation: SyncOperation,
    code: SyncErrorCode,
    retryable: boolean,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause })
    this.source = source
    this.operation = operation
    this.code = code
    this.retryable = retryable
    this.cause = cause
  }
}

export type SyncResult<T = void> =
  | { ok: true; value: T; error: null }
  | { ok: false; value: T; error: SyncError }

export function syncSuccess<T>(value: T): SyncResult<T> {
  return { ok: true, value, error: null }
}

export function syncFailure<T>(value: T, error: SyncError): SyncResult<T> {
  return { ok: false, value, error }
}

export type SyncErrors = Partial<Record<SyncErrorSource, SyncError>>

const errorPriority: SyncErrorSource[] = [
  'firestore',
  'auth',
  'snapshot',
  'local-storage',
]

export function currentSyncError(errors: SyncErrors) {
  const rollbackError = Object.values(errors).find(
    (error) => error?.code === 'rollback-failed',
  )
  if (rollbackError) return rollbackError

  for (const source of errorPriority) {
    const error = errors[source]

    if (error) return error
  }

  return null
}

function errorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String(error.code)
  }

  return ''
}

export function createStorageError(
  error: unknown,
  operation: Extract<SyncOperation, 'read' | 'write' | 'remove' | 'create-id'>,
) {
  const name = error instanceof Error ? error.name : ''
  const code: SyncErrorCode =
    name === 'QuotaExceededError'
      ? 'storage-quota'
      : operation === 'create-id'
        ? 'id-generation'
        : name === 'SyntaxError' || name === 'TypeError'
          ? 'storage-serialization'
          : 'storage-unavailable'

  return new SyncError(
    error instanceof Error ? error.message : String(error),
    'local-storage',
    operation,
    code,
    code === 'storage-quota' || code === 'storage-unavailable',
    error,
  )
}

export function createSyncError(
  error: unknown,
  source: Exclude<SyncErrorSource, 'local-storage'>,
  operation: SyncOperation,
) {
  if (error instanceof SyncError) {
    return error
  }

  const nativeCode = errorCode(error)
  const code: SyncErrorCode =
    source === 'snapshot'
      ? 'snapshot-failed'
      : nativeCode.includes('permission-denied')
        ? 'permission-denied'
        : source === 'auth' || nativeCode.includes('unauthenticated')
          ? 'authentication'
          : nativeCode.includes('unavailable') || nativeCode.includes('network')
            ? 'network'
            : source === 'firestore'
              ? 'write-rejected'
              : 'unknown'

  return new SyncError(
    error instanceof Error ? error.message : String(error),
    source,
    operation,
    code,
    code === 'network',
    error,
  )
}

export function syncErrorMessageKey(error: SyncError): TranslationKey {
  switch (error.code) {
    case 'storage-unavailable':
      return 'common.syncError.storageUnavailable'
    case 'storage-quota':
      return 'common.syncError.storageQuota'
    case 'storage-serialization':
      return 'common.syncError.storageSerialization'
    case 'id-generation':
      return 'common.syncError.identity'
    case 'authentication':
      return 'common.syncError.authentication'
    case 'permission-denied':
      return 'common.syncError.permissionDenied'
    case 'network':
      return 'common.syncError.network'
    case 'snapshot-failed':
      return 'common.syncError.snapshot'
    case 'too-many-writes':
      return 'common.syncError.tooManyWrites'
    case 'rollback-failed':
      return 'common.syncError.rollbackFailed'
    default:
      return 'common.syncError.writeRejected'
  }
}

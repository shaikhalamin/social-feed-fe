import { ApiError } from '@/lib/api-error'

export function isConflictError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409
}

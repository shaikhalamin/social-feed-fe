import { ApiError } from "@/lib/api-error"

export type ExtractedError = {
  status: number | null
  message: string
}

const FALLBACK = "Something went wrong. Please try again."

export function extractApiError(err: unknown): ExtractedError {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string; error?: string } | null
    const message = body?.message ?? body?.error ?? err.message
    return { status: err.status, message }
  }
  if (err instanceof Error && err.message) {
    return { status: null, message: err.message }
  }
  return { status: null, message: FALLBACK }
}

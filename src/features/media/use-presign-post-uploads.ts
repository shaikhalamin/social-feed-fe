import { usePresignPostUploads } from '@/gen/api/hooks/usePresignPostUploads.ts'

export function usePresignPostUploadsMutation() {
  return usePresignPostUploads()
}

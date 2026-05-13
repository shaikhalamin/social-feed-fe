export type UploadProgress = (loaded: number, total: number) => void

export function uploadToR2(
  uploadUrl: string,
  file: File,
  contentType: string,
  signal?: AbortSignal,
  onProgress?: UploadProgress,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload aborted', 'AbortError'))
      return
    }
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', contentType)
    const onAbort = () => {
      xhr.abort()
    }
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort)
    }
    if (onProgress) {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) onProgress(evt.loaded, evt.total)
      }
    }
    xhr.onload = () => {
      cleanup()
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`R2 upload failed: HTTP ${xhr.status}`))
    }
    xhr.onerror = () => {
      cleanup()
      reject(new Error('R2 upload failed: network error'))
    }
    xhr.onabort = () => {
      cleanup()
      reject(new DOMException('Upload aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort)
    xhr.send(file)
  })
}

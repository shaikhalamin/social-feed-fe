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
    if (onProgress) {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) onProgress(evt.loaded, evt.total)
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`R2 upload failed: HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('R2 upload failed: network error'))
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'))
    const onAbort = () => {
      xhr.abort()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    xhr.onloadend = () => {
      signal?.removeEventListener('abort', onAbort)
    }
    xhr.send(file)
  })
}

export type ImageDimensions = { width: number; height: number }

export function readImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise<ImageDimensions>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const dims: ImageDimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      }
      URL.revokeObjectURL(url)
      if (dims.width === 0 || dims.height === 0) {
        reject(new Error('Could not read image dimensions'))
        return
      }
      resolve(dims)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

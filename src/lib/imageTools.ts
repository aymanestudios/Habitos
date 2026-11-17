// Herramientas de imagen en el navegador: comprobar, recortar, reducir y recomprimir.
// Al volver a dibujar la foto en un canvas se pierden los metadatos EXIF (incluida la ubicación GPS).
// Las funciones "puras" (sin navegador) están arriba para poder probarlas.

export const MAX_INPUT_BYTES = 15 * 1024 * 1024 // 15 MB antes de comprimir
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

/** Mensaje de error si el archivo no vale; null si vale. */
export function imageFileError(file: { type: string; size: number; name: string }): string | null {
  const type = file.type.toLowerCase()
  const looksHeic = /\.(heic|heif)$/i.test(file.name)
  if (!ACCEPTED.includes(type) && !(type === '' && looksHeic)) return 'Solo se aceptan fotos JPG, PNG o WebP.'
  if (file.size > MAX_INPUT_BYTES) return 'La foto es demasiado grande (máximo 15 MB).'
  if (file.size === 0) return 'El archivo está vacío.'
  return null
}

/** Tamaño para que el lado más largo no pase de max (sin agrandar nunca). */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export type SquareCrop = { x: number; y: number; size: number }

/**
 * Recorte cuadrado a partir de lo que se ve en el visor circular.
 * La imagen se muestra "cubriendo" un visor de lado view, ampliada zoom veces y movida offsetX/offsetY px.
 */
export function cropFromView(
  imageWidth: number,
  imageHeight: number,
  view: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
): SquareCrop {
  const scale = (view / Math.min(imageWidth, imageHeight)) * zoom // px de pantalla por px de imagen
  const size = view / scale
  const centerX = imageWidth / 2 - offsetX / scale
  const centerY = imageHeight / 2 - offsetY / scale
  const x = Math.min(Math.max(centerX - size / 2, 0), imageWidth - size)
  const y = Math.min(Math.max(centerY - size / 2, 0), imageHeight - size)
  return { x, y, size }
}

/** Límite de desplazamiento para que la imagen siempre cubra el visor. */
export function maxOffset(imageWidth: number, imageHeight: number, view: number, zoom: number) {
  const scale = (view / Math.min(imageWidth, imageHeight)) * zoom
  return {
    x: Math.max(0, (imageWidth * scale - view) / 2),
    y: Math.max(0, (imageHeight * scale - view) / 2),
  }
}

// ---------------------------------------------------------------------------
// Parte que necesita el navegador
// ---------------------------------------------------------------------------

export type LoadedImage = { source: CanvasImageSource; width: number; height: number; close: () => void }

/** Abre la foto respetando la orientación del móvil (fotos giradas). */
export async function loadImage(file: Blob): Promise<LoadedImage> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
  } catch {
    // Navegadores antiguos: con una etiqueta <img>
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
    } catch {
      throw new Error('No se pudo abrir la foto. Prueba con otra (JPG, PNG o WebP).')
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/** WebP si el navegador sabe crearlo (Safari a veces no); si no, JPEG. */
async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await toBlob(canvas, 'image/webp', 0.82)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.85)
  if (!jpeg) throw new Error('No se pudo preparar la foto.')
  return jpeg
}

function canvasOf(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Tu navegador no puede editar fotos.')
  context.imageSmoothingQuality = 'high'
  return [canvas, context]
}

/** Foto de perfil: recorte cuadrado de out × out px. */
export async function renderSquare(image: LoadedImage, crop: SquareCrop, out = 512): Promise<Blob> {
  const size = Math.min(out, Math.round(crop.size))
  const [canvas, context] = canvasOf(size, size)
  context.drawImage(image.source, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size)
  return encode(canvas)
}

/** Foto de hábito: misma proporción, lado largo como máximo max px. */
export async function renderResized(image: LoadedImage, max = 1600): Promise<Blob> {
  const { width, height } = fitWithin(image.width, image.height, max)
  const [canvas, context] = canvasOf(width, height)
  context.drawImage(image.source, 0, 0, width, height)
  return encode(canvas)
}

export function extensionFor(blob: Blob): 'webp' | 'jpg' | 'png' {
  if (blob.type === 'image/webp') return 'webp'
  if (blob.type === 'image/png') return 'png'
  return 'jpg'
}

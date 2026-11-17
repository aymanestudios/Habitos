import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { imageFileError } from '@/lib/imageTools'

type Options = {
  camera: 'user' | 'environment' // cámara frontal (selfie) o trasera
  onPick: (file: File) => void
  onError: (message: string) => void
}

// Dos selectores ocultos: "Hacer foto" (abre la cámara en el móvil) y "Galería / archivo".
// En el ordenador los dos abren el selector de archivos.
export function usePhotoPicker({ camera, onPick, onError }: Options) {
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  function handle(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // para poder elegir la misma foto otra vez
    if (!file) return // cancelado
    const problem = imageFileError(file)
    if (problem) onError(problem)
    else onPick(file)
  }

  const inputs = (
    <>
      <input ref={cameraInput} type="file" accept="image/*" capture={camera} onChange={handle} className="hidden" />
      <input ref={galleryInput} type="file" accept="image/*" onChange={handle} className="hidden" />
    </>
  )

  return {
    inputs,
    openCamera: () => cameraInput.current?.click(),
    openGallery: () => galleryInput.current?.click(),
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Camera, ImageUp, Loader2, X } from 'lucide-react'

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Camera permission denied. Allow camera access in your browser settings, upload a photo, or enter the barcode manually.'
    }
    if (error.name === 'NotFoundError') {
      return 'No camera found on this device. Upload a photo or enter the barcode manually.'
    }
    if (error.name === 'NotReadableError') {
      return 'Camera is in use by another app. Close it and try again.'
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Could not start the camera.'
}

function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

const INSECURE_CONTEXT_MESSAGE =
  'Camera access needs a secure connection (HTTPS) or localhost. On your phone, open the app via the https:// dev URL and accept the certificate warning, then try again. You can also upload a photo or enter the barcode manually.'

export function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (barcode: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(false)
  const finishedRef = useRef(false)
  const readingPhotoRef = useRef(false)
  const [starting, setStarting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readingPhoto, setReadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const finishScan = useCallback(
    (barcode: string) => {
      if (!mountedRef.current || finishedRef.current) return
      finishedRef.current = true
      onScan(barcode)
    },
    [onScan],
  )

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let controls: { stop: () => void } | null = null
    let stream: MediaStream | null = null
    let cancelled = false

    function cleanup() {
      controls?.stop()
      stream?.getTracks().forEach((track) => track.stop())
      controls = null
      stream = null
    }

    async function start() {
      if (!isCameraSupported()) {
        setError(
          window.isSecureContext === false
            ? INSECURE_CONTEXT_MESSAGE
            : 'This browser does not support camera access. Upload a photo or enter the barcode manually.',
        )
        setStarting(false)
        return
      }

      try {
        // Use getUserMedia with facingMode directly so we never call
        // enumerateDevices, which is unsupported in some mobile browsers and
        // insecure contexts ("can't enumerate devices, method not supported").
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })

        if (cancelled || finishedRef.current) {
          cleanup()
          return
        }

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        await video.play().catch(() => undefined)
        if (cancelled || finishedRef.current) {
          cleanup()
          return
        }

        controls = await reader.decodeFromVideoElement(video, (result) => {
          if (!result || cancelled || finishedRef.current || readingPhotoRef.current) return
          cleanup()
          finishScan(result.getText())
        })

        if (cancelled || finishedRef.current) {
          cleanup()
          return
        }

        setStarting(false)
      } catch (err) {
        cleanup()
        if (!cancelled && !finishedRef.current) {
          setError(getCameraErrorMessage(err))
          setStarting(false)
        }
      }
    }

    start()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [finishScan])

  function handleClose() {
    finishedRef.current = true
    onClose()
  }

  async function readPhoto(file: File) {
    if (finishedRef.current || readingPhotoRef.current) return
    readingPhotoRef.current = true
    setReadingPhoto(true)
    setPhotoError(null)

    let url: string | undefined
    let barcode: string | undefined
    let message = 'Could not open that photo. Try another image.'
    try {
      url = URL.createObjectURL(file)
      const image = new Image()
      image.src = url
      await image.decode()

      if (!mountedRef.current || finishedRef.current) return
      message = 'No barcode found in that photo. Try a clearer image.'
      barcode = new BrowserMultiFormatReader().decode(image).getText()
    } catch {
      if (mountedRef.current && !finishedRef.current) setPhotoError(message)
    } finally {
      if (url) URL.revokeObjectURL(url)
      readingPhotoRef.current = false
      if (mountedRef.current && !finishedRef.current) setReadingPhoto(false)
    }

    if (barcode !== undefined) finishScan(barcode)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-semibold text-foreground">Scan barcode</h2>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="cursor-pointer rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground"
          aria-label="Close scanner"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center bg-black p-4">
        {error ? (
          <div className="max-w-sm space-y-4 text-center">
            <p className="text-sm text-white/90">{error}</p>
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Enter barcode manually
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="max-h-[70dvh] min-h-0 w-full max-w-lg rounded-2xl object-cover"
              muted
              playsInline
              autoPlay
            />
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center p-8"
              aria-hidden="true"
            >
              <div className="h-40 w-full max-w-xs rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Starting camera" />
              </div>
            )}
            <p className="mt-4 text-center text-sm text-white/80">
              Point your camera at a product barcode
            </p>
          </>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {photoError && (
          <p role="alert" className="text-center text-sm text-fats">
            {photoError}
          </p>
        )}
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          disabled={readingPhoto}
          className="mx-auto flex w-full max-w-lg cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {readingPhoto ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImageUp className="h-4 w-4" aria-hidden="true" />
          )}
          {readingPhoto ? 'Reading photo…' : 'Upload barcode photo'}
        </button>
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) void readPhoto(file)
          }}
        />
      </div>
    </div>
  )
}

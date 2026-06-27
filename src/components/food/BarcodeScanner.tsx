import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Camera, Loader2, X } from 'lucide-react'

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Camera permission denied. Allow camera access in your browser settings, or enter the barcode manually.'
    }
    if (error.name === 'NotFoundError') {
      return 'No camera found on this device. Enter the barcode manually instead.'
    }
    if (error.name === 'NotReadableError') {
      return 'Camera is in use by another app. Close it and try again.'
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Could not start the camera.'
}

function pickCamera(devices: MediaDeviceInfo[]): string | undefined {
  const back = devices.find((device) =>
    /back|rear|environment/i.test(device.label),
  )
  return back?.deviceId ?? devices[0]?.deviceId
}

export function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (barcode: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannedRef = useRef(false)
  const [starting, setStarting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let controls: { stop: () => void } | null = null
    let cancelled = false

    async function start() {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()

        if (cancelled) return

        if (devices.length === 0) {
          setError('No camera found on this device.')
          setStarting(false)
          return
        }

        const deviceId = pickCamera(devices)
        const video = videoRef.current
        if (!video) return

        controls = await reader.decodeFromVideoDevice(deviceId, video, (result) => {
          if (!result || scannedRef.current) return
          scannedRef.current = true
          controls?.stop()
          onScan(result.getText())
        })

        if (!cancelled) setStarting(false)
      } catch (err) {
        if (!cancelled) {
          setError(getCameraErrorMessage(err))
          setStarting(false)
        }
      }
    }

    start()

    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-semibold text-foreground">Scan barcode</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground"
          aria-label="Close scanner"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-black p-4">
        {error ? (
          <div className="max-w-sm space-y-4 text-center">
            <p className="text-sm text-white/90">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Enter barcode manually
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="max-h-[70dvh] w-full max-w-lg rounded-2xl object-cover"
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
    </div>
  )
}

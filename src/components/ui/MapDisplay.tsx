import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import './map-display.css'

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as unknown as { __googleMapsLoaded?: boolean }).__googleMapsLoaded) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) {
      ;(window as unknown as { __googleMapsLoaded?: boolean }).__googleMapsLoaded = true
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => {
      ;(window as unknown as { __googleMapsLoaded?: boolean }).__googleMapsLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
}

type MapDisplayProps = {
  lat: number
  lng: number
  googleMapsApiKey: string
  className?: string
  /** Map height in pixels. Default 280. */
  height?: number
}

/**
 * Read-only map with a single marker at the given coordinates.
 * Renders nothing if the API key is missing or script fails to load.
 */
export function MapDisplay({
  lat,
  lng,
  googleMapsApiKey,
  className,
  height = 280,
}: MapDisplayProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!googleMapsApiKey || !mapRef.current) return
    loadGoogleMapsScript(googleMapsApiKey)
      .then(() => {
        if (!mapRef.current) return
        const center = { lat, lng }
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
        })
        new google.maps.Marker({
          position: center,
          map,
        })
      })
      .catch(() => setError('Map failed to load'))
  }, [googleMapsApiKey, lat, lng])

  if (error) {
    return (
      <div className={clsx('map-display', 'map-display--error', className)}>
        <p className="map-display__error">{error}</p>
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      className={clsx('map-display', className)}
      style={{ height: `${height}px` }}
      aria-hidden
    />
  )
}

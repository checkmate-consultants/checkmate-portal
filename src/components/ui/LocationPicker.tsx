import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from './Input.tsx'
import { Select } from './Select.tsx'
import { COUNTRIES } from '../../data/countries.ts'
import './location-picker.css'

export type LocationValue = {
  country: string
  city: string
  lat: number | null
  lng: number | null
}

type LocationPickerProps = {
  id: string
  value: LocationValue
  onChange: (value: LocationValue) => void
  hasError?: boolean
  countryError?: string
  cityError?: string
  /** When set, load Google Maps and show a map with a draggable pin to set location. */
  googleMapsApiKey?: string
}

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
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

export function LocationPicker({
  id,
  value,
  onChange,
  hasError = false,
  countryError,
  cityError,
  googleMapsApiKey,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const mapInstanceRef = useRef<unknown>(null)
  const markerRef = useRef<unknown>(null)
  const { t } = useTranslation()

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (typeof google === 'undefined' || !google.maps?.Geocoder) return
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results: unknown, status: string) => {
        const r = Array.isArray(results) ? results[0] as { address_components: { types: string[]; short_name: string; long_name: string }[] } : null
        if (status !== 'OK' || !r?.address_components) return
        let country = ''
        let city = ''
        for (const c of r.address_components) {
          if (c.types.includes('country')) country = c.short_name
          if (c.types.includes('locality')) city = c.long_name
          if (!city && c.types.includes('administrative_area_level_1')) city = c.long_name
        }
        const countryMatch = COUNTRIES.find((x) => x.code === country)
        onChange({
          country: countryMatch ? country : value.country,
          city: city || value.city,
          lat,
          lng,
        })
      })
    },
    [onChange, value.country, value.city],
  )

  useEffect(() => {
    if (!googleMapsApiKey || !mapRef.current) return
    loadGoogleMapsScript(googleMapsApiKey)
      .then(() => {
        if (!mapRef.current) return
        const center = { lat: value.lat ?? 20, lng: value.lng ?? 0 }
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 10,
          mapTypeControl: true,
          fullscreenControl: true,
        })
        const marker = new google.maps.Marker({
          position: center,
          map,
          draggable: true,
        })
        marker.addListener('dragend', () => {
          const pos = marker.getPosition()
          if (pos) {
            const lat = pos.lat()
            const lng = pos.lng()
            reverseGeocode(lat, lng)
          }
        })
        map.addListener('click', (e?: { latLng?: { lat: () => number; lng: () => number } }) => {
          const lat = e?.latLng?.lat() ?? 0
          const lng = e?.latLng?.lng() ?? 0
          marker.setPosition({ lat, lng })
          reverseGeocode(lat, lng)
        })
        mapInstanceRef.current = map
        markerRef.current = marker
        setMapReady(true)
      })
      .catch(() => setMapReady(false))
    return () => {
      markerRef.current = null
      mapInstanceRef.current = null
      setMapReady(false)
    }
  }, [googleMapsApiKey, value.lat, value.lng, reverseGeocode])

  return (
    <div className="location-picker">
      {googleMapsApiKey && (
        <div
          ref={mapRef}
          className="location-picker__map"
          style={{ minHeight: mapReady ? 200 : 0 }}
          aria-hidden
        />
      )}
      <div className="location-picker__fields">
        <div className="location-picker__field">
          <label htmlFor={`${id}-country`} className="location-picker__label">
            {t('shopperInfo.locationCountry')}
          </label>
          <Select
            id={`${id}-country`}
            value={value.country}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onChange({ ...value, country: e.target.value })
            }
            hasError={Boolean(countryError)}
          >
            <option value="">{t('shopperInfo.selectCountry')}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {t(`countries.${c.code}`) || c.name}
              </option>
            ))}
          </Select>
          {countryError && (
            <span className="location-picker__error">{countryError}</span>
          )}
        </div>
        <div className="location-picker__field">
          <label htmlFor={`${id}-city`} className="location-picker__label">
            {t('shopperInfo.locationCity')}
          </label>
          <Input
            id={`${id}-city`}
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder={t('shopperInfo.locationCity')}
            hasError={Boolean(cityError)}
          />
          {cityError && (
            <span className="location-picker__error">{cityError}</span>
          )}
        </div>
        <div className="location-picker__row">
          <div className="location-picker__field">
            <label htmlFor={`${id}-lat`} className="location-picker__label">
              {t('shopperInfo.locationLat')}
            </label>
            <Input
              id={`${id}-lat`}
              type="number"
              step="any"
              min={-90}
              max={90}
              value={value.lat ?? ''}
              onChange={(e) => {
                const v = e.target.value
                const n = v === '' ? null : Number(v)
                onChange({ ...value, lat: n })
              }}
              placeholder="e.g. 25.276987"
              hasError={hasError}
            />
          </div>
          <div className="location-picker__field">
            <label htmlFor={`${id}-lng`} className="location-picker__label">
              {t('shopperInfo.locationLng')}
            </label>
            <Input
              id={`${id}-lng`}
              type="number"
              step="any"
              min={-180}
              max={180}
              value={value.lng ?? ''}
              onChange={(e) => {
                const v = e.target.value
                const n = v === '' ? null : Number(v)
                onChange({ ...value, lng: n })
              }}
              placeholder="e.g. 55.296249"
              hasError={hasError}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

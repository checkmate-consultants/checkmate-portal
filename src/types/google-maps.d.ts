/**
 * Minimal types for Google Maps JavaScript API when used in LocationPicker.
 * For full types, add: npm i -D @types/google.maps
 */
declare global {
  interface Window {
    __googleMapsLoaded?: boolean
  }
  // eslint-disable-next-line no-var
  var google: {
    maps: {
      Map: new (el: HTMLElement, opts?: object) => {
        addListener: (event: string, fn: (e?: { latLng?: { lat: () => number; lng: () => number } }) => void) => void
      }
      Marker: new (opts: { position: { lat: number; lng: number }; map: unknown; draggable?: boolean }) => {
        getPosition: () => { lat: () => number; lng: () => number } | null
        setPosition: (p: { lat: number; lng: number }) => void
        addListener: (event: string, fn: () => void) => void
      }
      Geocoder: new () => {
        geocode: (request: object, callback: (results: unknown, status: string) => void) => void
      }
    }
  }
}

export {}

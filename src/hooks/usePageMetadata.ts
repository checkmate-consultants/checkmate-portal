import { useEffect } from 'react'

const DESCRIPTION_META_ID = 'meta-page-description'

/** Default image path for Open Graph / Twitter (must exist in public/). Use 1200×630 for best results. */
export const OG_IMAGE_PATH = '/og-image.webp'

const SITE_NAME = 'Checkmate Portal'

const OG_ATTR = 'property'
const TWITTER_ATTR = 'name'

type MetaTag = { attr: string; key: string; value: string }

function setOrCreateMeta(attr: string, key: string, value: string, id?: string): void {
  const selector = id
    ? `meta[id="${id}"]`
    : `meta[${attr}="${key}"], meta[name="${key}"]`
  let el = document.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    if (id) el.id = id
    if (attr === OG_ATTR) el.setAttribute('property', key)
    else el.setAttribute('name', key)
    document.head.appendChild(el)
  }
  el.content = value
}

/**
 * Sets document title, meta description, and Open Graph / Twitter Card tags
 * for the current page. Use in each page for tab titles, SEO, and rich link
 * previews (WhatsApp, Facebook, Twitter, etc.).
 */
export function usePageMetadata(
  title: string,
  description?: string,
  options?: { imagePath?: string },
): void {
  useEffect(() => {
    document.title = title

    const desc = description ?? ''
    if (desc) {
      setOrCreateMeta('name', 'description', desc, DESCRIPTION_META_ID)
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    const imagePath = options?.imagePath ?? OG_IMAGE_PATH
    const imageUrl = origin ? `${origin}${imagePath}` : ''

    const tags: MetaTag[] = [
      { attr: OG_ATTR, key: 'og:title', value: title },
      { attr: OG_ATTR, key: 'og:description', value: desc },
      { attr: OG_ATTR, key: 'og:type', value: 'website' },
      { attr: OG_ATTR, key: 'og:url', value: origin + pathname },
      { attr: OG_ATTR, key: 'og:site_name', value: SITE_NAME },
      { attr: TWITTER_ATTR, key: 'twitter:card', value: 'summary_large_image' },
      { attr: TWITTER_ATTR, key: 'twitter:title', value: title },
      { attr: TWITTER_ATTR, key: 'twitter:description', value: desc },
    ]

    if (imageUrl) {
      tags.push({ attr: OG_ATTR, key: 'og:image', value: imageUrl })
      tags.push({ attr: TWITTER_ATTR, key: 'twitter:image', value: imageUrl })
    }

    for (const { attr, key, value } of tags) {
      setOrCreateMeta(attr, key, value)
    }
  }, [title, description, options?.imagePath])
}

/**
 * Common languages and fluency levels for shopper profile.
 */
export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'other', name: 'Other' },
].sort((a, b) => a.name.localeCompare(b.name))

export const FLUENCY_LEVELS: { code: string; name: string }[] = [
  { code: 'native', name: 'Native' },
  { code: 'fluent', name: 'Fluent' },
  { code: 'advanced', name: 'Advanced' },
  { code: 'intermediate', name: 'Intermediate' },
  { code: 'basic', name: 'Basic' },
]

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function DirectionObserver() {
  const { i18n } = useTranslation()
  const dir = i18n.dir(i18n.language)

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir)
    document.body.setAttribute('dir', dir)
  }, [dir])

  return null
}


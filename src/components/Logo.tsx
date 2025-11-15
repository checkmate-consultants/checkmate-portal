import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import logoAsset from '../assets/brand/logo.webp'
import './logo.css'

type LogoProps = {
  size?: 'sm' | 'md'
  className?: string
  loading?: 'lazy' | 'eager'
}

const BASE_WIDTH = 260
const BASE_HEIGHT = 159
const SIZE_SCALE = {
  sm: 0.65,
  md: 0.85,
}

export function Logo({
  size = 'md',
  className,
  loading = 'lazy',
}: LogoProps) {
  const { t } = useTranslation()
  const brandName = t('brand.name')
  const scale = SIZE_SCALE[size] ?? SIZE_SCALE.md
  const width = Math.round(BASE_WIDTH * scale)
  const height = Math.round(BASE_HEIGHT * scale)

  return (
    <span className={clsx('logo', `logo--${size}`, className)}>
      <img
        src={logoAsset}
        alt={brandName}
        width={width}
        height={height}
        loading={loading}
        className="logo__image"
      />
      <span className="logo__sr">{brandName}</span>
    </span>
  )
}


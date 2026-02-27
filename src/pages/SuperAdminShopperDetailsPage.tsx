import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Select } from '../components/ui/Select.tsx'
import {
  fetchShopperById,
  updateShopperStatus,
  type ShopperStatus,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import { LANGUAGES, FLUENCY_LEVELS } from '../data/languages.ts'
import './super-admin-shopper-details-page.css'

function DetailRow({
  label,
  value,
  noValueLabel = '—',
}: {
  label: string
  value: string | null | undefined
  noValueLabel?: string
}) {
  const display = value?.trim() ? value : noValueLabel
  return (
    <div className="shopper-details__row">
      <dt className="shopper-details__label">{label}</dt>
      <dd className="shopper-details__value">{display}</dd>
    </div>
  )
}

export function SuperAdminShopperDetailsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { shopperId } = useParams<{ shopperId: string }>()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const queryClient = useQueryClient()

  const { data: shopper, isLoading, error } = useQuery({
    queryKey: ['shopper-details', shopperId],
    queryFn: () => fetchShopperById(shopperId!),
    enabled: Boolean(shopperId) && session.isSuperAdmin,
  })

  usePageMetadata(
    shopper
      ? `${shopper.fullName} | ${t('meta.superAdminShoppers.title')} | ${t('brand.name')}`
      : `${t('meta.superAdminShoppers.title')} | ${t('brand.name')}`,
    t('meta.superAdminShoppers.description'),
  )

  if (!session.isSuperAdmin) {
    navigate('/workspace/admin/overview', { replace: true })
    return null
  }

  if (isLoading) {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{t('superAdmin.loading')}</p>
        </Card>
      </div>
    )
  }

  if (error || !shopper) {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{t('superAdmin.shoppers.details.notFound')}</p>
          <Button type="button" variant="ghost" onClick={() => navigate('/workspace/admin/shoppers')}>
            {t('superAdmin.shoppers.details.back')}
          </Button>
        </Card>
      </div>
    )
  }

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ShopperStatus
    if (next === shopper.status) return
    await updateShopperStatus(shopper.id, next)
    queryClient.invalidateQueries({ queryKey: ['shopper-details', shopperId] })
  }

  return (
    <div className="super-admin-page shopper-details-page">
      <header className="super-admin-header">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="shopper-details-page__back"
            onClick={() => navigate('/workspace/admin/shoppers')}
          >
            ← {t('superAdmin.shoppers.details.back')}
          </Button>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1 className="shopper-details-page__title">{shopper.fullName}</h1>
          <p className="shopper-details-page__email">{shopper.email}</p>
        </div>
        <div className="shopper-details-page__status">
          <label htmlFor="shopper-status" className="shopper-details-page__status-label">
            {t('superAdmin.shoppers.details.statusLabel')}
          </label>
          <Select
            id="shopper-status"
            value={shopper.status}
            onChange={handleStatusChange}
            className="shopper-details-page__status-select"
          >
            <option value="pending">{t('shopperStatus.pending')}</option>
            <option value="under_review">{t('shopperStatus.under_review')}</option>
            <option value="confirmed">{t('shopperStatus.confirmed')}</option>
          </Select>
        </div>
      </header>

      <div className="shopper-details-page__grid">
        <Card className="shopper-details-card">
          <h2 className="shopper-details__section-title">
            {t('superAdmin.shoppers.details.personalInfo')}
          </h2>
          <dl className="shopper-details__list">
            <DetailRow label={t('shopperInfo.fullName')} value={shopper.fullName} />
            <DetailRow
              label={t('shopperInfo.dateOfBirth')}
              value={shopper.dateOfBirth ? formatDate(shopper.dateOfBirth) : null}
              noValueLabel={t('superAdmin.shoppers.details.noValue')}
            />
            <DetailRow
              label={t('shopperInfo.gender')}
              value={formatGender(shopper.gender, t)}
              noValueLabel={t('superAdmin.shoppers.details.noValue')}
            />
            <DetailRow
              label={t('shopperInfo.nationalities')}
              value={formatNationalities(shopper.nationalities, t)}
              noValueLabel={t('superAdmin.shoppers.details.noValue')}
            />
            <DetailRow
              label={t('shopperInfo.residentVisa')}
              value={formatResidentVisa(shopper.residentVisa, t)}
              noValueLabel={t('superAdmin.shoppers.details.noValue')}
            />
          </dl>
        </Card>

        <Card className="shopper-details-card">
          <h2 className="shopper-details__section-title">
            {t('superAdmin.shoppers.details.contactInfo')}
          </h2>
          <dl className="shopper-details__list">
            <DetailRow label={t('shopperInfo.contactEmail')} value={shopper.email} />
            <DetailRow
              label={t('shopperInfo.contactPhone')}
              value={shopper.phone}
              noValueLabel={t('superAdmin.shoppers.details.noValue')}
            />
          </dl>
        </Card>

        <Card className="shopper-details-card">
          <h2 className="shopper-details__section-title">
            {t('superAdmin.shoppers.details.location')}
          </h2>
          <dl className="shopper-details__list">
            <DetailRow
              label={t('shopperInfo.locationCountry')}
              value={shopper.locationCountry ? t(`countries.${shopper.locationCountry}`) : null}
              noValueLabel={t('superAdmin.shoppers.details.noValue')}
            />
            <DetailRow
              label={t('shopperInfo.locationCity')}
              value={shopper.locationCity}
              noValueLabel={t('superAdmin.shoppers.details.noValue')}
            />
            {(shopper.locationLat != null || shopper.locationLng != null) && (
              <DetailRow
                label={`${t('shopperInfo.locationLat')} / ${t('shopperInfo.locationLng')}`}
                value={
                  shopper.locationLat != null && shopper.locationLng != null
                    ? `${shopper.locationLat}, ${shopper.locationLng}`
                    : null
                }
                noValueLabel={t('superAdmin.shoppers.details.noValue')}
              />
            )}
          </dl>
        </Card>

        <Card className="shopper-details-card">
          <h2 className="shopper-details__section-title">
            {t('superAdmin.shoppers.details.languages')}
          </h2>
          <dl className="shopper-details__list">
            <DetailRow
              label={t('shopperInfo.nativeLanguage')}
              value={
                shopper.nativeLanguage
                  ? (LANGUAGES.find((l) => l.code === shopper.nativeLanguage)?.name ?? shopper.nativeLanguage)
                  : null
              }
              noValueLabel={t('superAdmin.shoppers.details.noValue')}
            />
            {shopper.languagesSpoken.length > 0 && (
              <div className="shopper-details__row">
                <dt className="shopper-details__label">{t('shopperInfo.otherLanguages')}</dt>
                <dd className="shopper-details__value">
                  <ul className="shopper-details__sublist">
                    {shopper.languagesSpoken
                      .filter((x) => x.language || x.fluency)
                      .map((x, i) => (
                        <li key={i}>
                          {LANGUAGES.find((l) => l.code === x.language)?.name ?? x.language} —{' '}
                          {FLUENCY_LEVELS.find((f) => f.code === x.fluency)?.name ?? x.fluency}
                        </li>
                      ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="shopper-details-card">
          <h2 className="shopper-details__section-title">
            {t('superAdmin.shoppers.details.family')}
          </h2>
          <dl className="shopper-details__list">
            <DetailRow
              label={t('shopperInfo.maritalStatus')}
              value={formatMaritalStatus(shopper.maritalStatus, t)}
              noValueLabel={t('superAdmin.shoppers.details.noValue')}
            />
            {shopper.children.length > 0 && (
              <div className="shopper-details__row">
                <dt className="shopper-details__label">{t('shopperInfo.children')}</dt>
                <dd className="shopper-details__value">
                  <ul className="shopper-details__sublist">
                    {shopper.children.map((c, i) => (
                      <li key={i}>
                        {c.date_of_birth ? formatDate(c.date_of_birth) : t('superAdmin.shoppers.details.noValue')}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="shopper-details-card">
          <h2 className="shopper-details__section-title">
            {t('superAdmin.shoppers.details.accessibility')}
          </h2>
          <dl className="shopper-details__list">
            <div className="shopper-details__row">
              <dt className="shopper-details__label">{t('shopperInfo.accessibilityNeeds')}</dt>
              <dd className="shopper-details__value">
                {shopper.accessibilityNeeds
                  ? t('shopperInfo.accessibilityNeedsYes')
                  : t('shopperInfo.accessibilityNeedsNo')}
              </dd>
            </div>
            {shopper.accessibilityNeeds && shopper.accessibilityNotes && (
              <DetailRow
                label={t('shopperInfo.accessibilitySpecify')}
                value={shopper.accessibilityNotes}
              />
            )}
          </dl>
        </Card>
      </div>

      <div className="shopper-details-page__meta">
        <p>
          {t('superAdmin.shoppers.table.created')}:{' '}
          {new Date(shopper.createdAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
        {shopper.infoSubmittedAt ? (
          <p>
            {t('superAdmin.shoppers.details.submittedAt')}:{' '}
            {new Date(shopper.infoSubmittedAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        ) : (
          <p>{t('superAdmin.shoppers.details.notSubmitted')}</p>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatGender(
  gender: string | null,
  t: (key: string) => string,
): string | null {
  if (!gender) return null
  const key = gender === 'non_binary' ? 'genderNonBinary' : `gender${gender.charAt(0).toUpperCase()}${gender.slice(1)}`
  return t(`shopperInfo.${key}`)
}

function formatResidentVisa(
  visa: string | null,
  t: (key: string) => string,
): string | null {
  if (!visa) return null
  if (visa === 'citizen') return t('shopperInfo.residentVisaCitizen')
  if (visa === 'yes') return t('shopperInfo.residentVisaYes')
  if (visa === 'no') return t('shopperInfo.residentVisaNo')
  return visa
}

function formatMaritalStatus(
  status: string | null,
  t: (key: string) => string,
): string | null {
  if (!status) return null
  const key = `marital${status.charAt(0).toUpperCase()}${status.slice(1)}`
  return t(`shopperInfo.${key}`)
}

function formatNationalities(
  codes: string[],
  t: (key: string) => string,
): string | null {
  if (!codes.length) return null
  return codes.map((c) => t(`countries.${c}`) || c).join(', ')
}

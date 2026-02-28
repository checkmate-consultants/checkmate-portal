import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabaseClient.ts'

export type FocusArea = {
  id: string
  name: string
  description: string
}

export type CompanyProperty = {
  id: string
  name: string
  city: string
  country: string
  latitude: number | null
  longitude: number | null
  focusAreas: FocusArea[]
}

export type AccountManagerProfile = {
  id: string
  email: string | null
  fullName: string | null
}

export type CompanySnapshot = {
  id: string
  name: string
  email: string | null
  address: string | null
  phone: string | null
  accountManager: AccountManagerProfile | null
  properties: CompanyProperty[]
}

export type PropertyDetailsResult = {
  property: CompanyProperty
  company: CompanySummary
}

type CompanySummary = {
  id: string
  name: string
}

type SupabaseFocusArea = {
  id: string
  name: string
  description: string
} | null

type SupabasePropertyRecord = {
  id: string
  name: string
  city: string
  country: string
  latitude: number | null
  longitude: number | null
  focus_areas?: SupabaseFocusArea[] | null
}

type SupabaseCompanyJoin = CompanySummary | CompanySummary[] | null

type SupabaseVisitFocusArea = {
  focus_area?: {
    id: string
    name: string
  } | null
} | null

type VisitFocusAreaReportRecord = {
  visit_id: string
  focus_area_id: string
  content: string
}

type CompanyDirectoryRecord = {
  id: string
  name: string
  created_at: string
  company_properties: { count: number }[] | null
}

export type CompanyDirectoryItem = {
  id: string
  name: string
  createdAt: string
  propertyCount: number
  accountManager: {
    id: string
    email: string | null
    fullName: string | null
  } | null
}

export type ShopperStatus = 'pending' | 'under_review' | 'confirmed'

type ShopperRecord = {
  id: string
  full_name: string
  email: string
  created_at: string
  status: ShopperStatus
  location_country?: string | null
  location_city?: string | null
}

export type Shopper = {
  id: string
  fullName: string
  email: string
  createdAt: string
  status: ShopperStatus
  locationCountry?: string | null
  locationCity?: string | null
}

export type FetchShoppersFilters = {
  status?: ShopperStatus
  country?: string | null
  city?: string | null
  /** Search by name or email (case-insensitive). */
  search?: string
  /** Only shoppers created in the last N days (e.g. 28 for "last 28 days"). */
  createdInLastDays?: number
}

/** Full shopper profile as submitted (for super admin details view). */
export type ShopperDetails = Shopper & {
  dateOfBirth: string | null
  gender: string | null
  nationalities: string[]
  locationCountry: string | null
  locationCity: string | null
  locationLat: number | null
  locationLng: number | null
  residentVisa: string | null
  phone: string | null
  nativeLanguage: string | null
  languagesSpoken: { language: string; fluency: string }[]
  maritalStatus: string | null
  children: { date_of_birth: string }[]
  accessibilityNeeds: boolean
  accessibilityNotes: string | null
  infoSubmittedAt: string | null
}

type ShopperDetailsRecord = ShopperRecord & {
  date_of_birth: string | null
  gender: string | null
  nationalities: string[] | null
  location_country: string | null
  location_city: string | null
  location_lat: number | null
  location_lng: number | null
  resident_visa: string | null
  phone: string | null
  native_language: string | null
  languages_spoken: { language?: string; fluency?: string }[] | null
  marital_status: string | null
  children: { date_of_birth?: string }[] | null
  accessibility_needs: boolean | null
  accessibility_notes: string | null
  info_submitted_at: string | null
}

type VisitRecord = {
  id: string
  scheduled_for: string
  notes: string | null
  status: string | null
  company: {
    id: string
    name: string
  } | null
  property: {
    id: string
    name: string
    city: string
    country: string
  } | null
  focus_areas?: SupabaseVisitFocusArea[] | null
  shopper: {
    id: string
    full_name: string
    email: string
  } | null
}

export type VisitStatus =
  | 'scheduled'
  | 'under_review'
  | 'report_submitted'
  | 'feedback_requested'
  | 'done'

export type Visit = {
  id: string
  scheduledFor: string
  notes: string | null
  status: VisitStatus
  company: {
    id: string
    name: string
  }
  property: {
    id: string
    name: string
    city: string
    country: string
  }
  shopper: {
    id: string
    fullName: string
    email: string
  } | null
  focusAreas: {
    id: string
    name: string
  }[]
}

export type VisitFocusAreaReport = {
  focusAreaId: string
  focusAreaName: string
  content: string
}

/** Question type for report templates and visit report questions */
export type ReportQuestionType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'single_choice'
  | 'multi_choice'
  | 'date'
  | 'rating'

export type ReportTemplateSection = {
  id: string
  name: string
  displayOrder: number
}

export type ReportTemplateQuestion = {
  id: string
  templateSectionId: string
  label: string
  questionType: ReportQuestionType
  options: { value: string; label?: string }[] | null
  required: boolean
  displayOrder: number
}

export type VisitReportSection = {
  id: string
  visitId: string
  focusAreaId: string
  sectionName: string
  displayOrder: number
  questions: VisitReportQuestion[]
}

export type VisitReportQuestion = {
  id: string
  visitReportSectionId: string
  label: string
  questionType: ReportQuestionType
  options: { value: string; label?: string }[] | null
  required: boolean
  displayOrder: number
}

export type VisitReportAnswer = {
  visitId: string
  focusAreaId: string
  questionId: string
  value: string | null
}

export type CreatePropertyInput = {
  companyId: string
  name: string
  city: string
  country: string
  latitude?: number
  longitude?: number
}

export type CreateFocusAreaInput = {
  propertyId: string
  name: string
  description: string
}

/** Template section IDs to attach per focus area when scheduling. Keys are focus_area_id. */
export type FocusAreaTemplateSectionIds = Record<string, string[]>

export type CreateVisitInput = {
  companyId: string
  propertyId: string
  /** Optional; shopper can be assigned later. */
  shopperId?: string | null
  scheduledFor: string
  focusAreaIds: string[]
  /** For each focus area id, optional list of report_template_sections ids to copy into the visit. */
  focusAreaTemplateSectionIds?: FocusAreaTemplateSectionIds
  notes?: string
}

export type CreateShopperInput = {
  fullName: string
  email: string
}

export const fetchCompanySnapshot = async (
  companyId: string,
): Promise<CompanySnapshot | null> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('companies')
    .select(
      `
        id,
        name,
        email,
        address,
        phone,
        account_manager_id,
        properties:company_properties (
          id,
          name,
          city,
          country,
          latitude,
          longitude,
          focus_areas:property_focus_areas (
            id,
            name,
            description
          )
        )
      `,
    )
    .eq('id', companyId)
    .maybeSingle()

  if (error && !isNoRowsError(error)) {
    throw error
  }

  if (!data) {
    return null
  }

  let accountManager: AccountManagerProfile | null = null
  const accountManagerId = (data as { account_manager_id?: string })
    .account_manager_id
  if (accountManagerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', accountManagerId)
      .maybeSingle()
    if (profile) {
      accountManager = {
        id: profile.id,
        email: profile.email ?? null,
        fullName: profile.full_name ?? null,
      }
    }
  }

  const row = data as {
    id: string
    name: string
    email?: string | null
    address?: string | null
    phone?: string | null
    properties?: SupabasePropertyRecord[] | null
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? null,
    address: row.address ?? null,
    phone: row.phone ?? null,
    accountManager,
    properties: mapProperties(row.properties),
  }
}

export const fetchAccountManagers = async (): Promise<
  AccountManagerProfile[]
> => {
  const supabase = getSupabaseClient()
  const { data: amRows, error: amError } = await supabase
    .from('account_managers')
    .select('user_id')

  if (amError) {
    throw amError
  }
  if (!amRows?.length) {
    return []
  }

  const userIds = amRows.map((r: { user_id: string }) => r.user_id)
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  if (profileError) {
    throw profileError
  }
  if (!profiles) {
    return []
  }

  return profiles.map((p: { id: string; email: string | null; full_name: string | null }) => ({
    id: p.id,
    email: p.email ?? null,
    fullName: p.full_name ?? null,
  }))
}

export type CompanyMember = {
  userId: string
  role: string
  email: string | null
  fullName: string | null
}

export const fetchCompanyMembers = async (
  companyId: string,
): Promise<CompanyMember[]> => {
  const supabase = getSupabaseClient()
  const { data: membersData, error: membersError } = await supabase
    .from('company_members')
    .select('user_id, role')
    .eq('company_id', companyId)
    .order('role', { ascending: true })

  if (membersError) {
    throw membersError
  }

  const members = (membersData ?? []) as Array<{ user_id: string; role: string }>
  if (members.length === 0) {
    return []
  }

  const userIds = members.map((m) => m.user_id)
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  if (profilesError) {
    throw profilesError
  }

  const profilesMap = new Map(
    (profilesData ?? []).map((p: { id: string; email: string | null; full_name: string | null }) => [
      p.id,
      { email: p.email, full_name: p.full_name },
    ]),
  )

  return members.map((m) => {
    const profile = profilesMap.get(m.user_id)
    return {
      userId: m.user_id,
      role: m.role,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? null,
    }
  })
}

export type InviteCompanyUserInput = {
  companyId: string
  email: string
  fullName?: string
}

export const inviteCompanyUser = async ({
  companyId,
  email,
  fullName,
}: InviteCompanyUserInput): Promise<{ authUserId: string; tempPassword?: string }> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('invite-company-user', {
    body: {
      companyId,
      email: email.trim().toLowerCase(),
      fullName: fullName?.trim() ?? undefined,
    },
  })

  if (error) {
    const message =
      error.message ||
      (error as { context?: { msg?: string } })?.context?.msg ||
      'Failed to invite user.'
    throw new Error(message)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.authUserId) {
    throw new Error('No data returned from invite-company-user')
  }

  return {
    authUserId: data.authUserId,
    ...(data.tempPassword && { tempPassword: data.tempPassword }),
  }
}

export const removeCompanyMember = async (
  companyId: string,
  userId: string,
): Promise<void> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export type ResetUserPasswordInput = {
  userId: string
  /** Required when caller is a company admin (to verify user is in their company). Optional for super admin. */
  companyId?: string
}

export const resetUserPassword = async ({
  userId,
  companyId,
}: ResetUserPasswordInput): Promise<{ tempPassword: string }> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke(
    'reset-user-password',
    {
      body: {
        userId,
        ...(companyId && { companyId }),
      },
    },
  )

  if (error) {
    const message =
      error.message ||
      (error as { context?: { msg?: string } })?.context?.msg ||
      'Failed to reset password.'
    throw new Error(message)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.tempPassword) {
    throw new Error('No temporary password returned from reset-user-password')
  }

  return { tempPassword: data.tempPassword }
}

export type CreateAccountManagerInput = {
  email: string
  fullName?: string
}

export const createAccountManager = async ({
  email,
  fullName,
}: CreateAccountManagerInput): Promise<{ authUserId: string; tempPassword?: string }> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('create-account-manager', {
    body: {
      email: email.trim().toLowerCase(),
      fullName: fullName?.trim() ?? undefined,
    },
  })

  if (error) {
    const message =
      error.message ||
      (error as { context?: { msg?: string } })?.context?.msg ||
      'Failed to create account manager.'
    throw new Error(message)
  }

  if (!data?.authUserId) {
    throw new Error(data?.error ?? 'No data returned from create-account-manager')
  }

  return {
    authUserId: data.authUserId,
    ...(data.tempPassword && { tempPassword: data.tempPassword }),
  }
}

export const removeAccountManager = async (userId: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('account_managers')
    .delete()
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export const createCompanyAsSuperAdmin = async (
  name: string,
): Promise<{ id: string }> => {
  const supabase = getSupabaseClient()
  const trimmed = name.trim()
  if (trimmed.length < 2) {
    throw new Error('Company name must be at least 2 characters.')
  }
  const { data, error } = await supabase.rpc('create_company_as_super_admin', {
    company_name: trimmed,
  })
  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('No company id returned')
  }
  return { id: data as string }
}

export const updateCompanyAccountManager = async (
  companyId: string,
  accountManagerId: string | null,
): Promise<void> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('companies')
    .update({ account_manager_id: accountManagerId })
    .eq('id', companyId)

  if (error) {
    throw new Error(error.message)
  }
}

export const updateCompanyProfile = async (
  companyId: string,
  profile: { email?: string | null; address?: string | null; phone?: string | null },
): Promise<void> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('companies')
    .update({
      ...(profile.email !== undefined && { email: profile.email }),
      ...(profile.address !== undefined && { address: profile.address }),
      ...(profile.phone !== undefined && { phone: profile.phone }),
    })
    .eq('id', companyId)

  if (error) {
    throw new Error(error.message)
  }
}

export const fetchCompanyDirectory = async (): Promise<
  CompanyDirectoryItem[]
> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, created_at, account_manager_id, company_properties(count)')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  if (!data) {
    return []
  }

  const records = data as (CompanyDirectoryRecord & { account_manager_id?: string | null })[]
  const managerIds = [
    ...new Set(
      records
        .map((r) => r.account_manager_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  let profileMap = new Map<string, { email: string | null; fullName: string | null }>()
  if (managerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', managerIds)
    if (profiles) {
      profileMap = new Map(
        profiles.map((p: { id: string; email: string | null; full_name: string | null }) => [
          p.id,
          { email: p.email ?? null, fullName: p.full_name ?? null },
        ]),
      )
    }
  }

  return records.map((record) => {
    const manager = record.account_manager_id
      ? profileMap.get(record.account_manager_id)
      : undefined
    return {
      id: record.id,
      name: record.name,
      createdAt: record.created_at,
      propertyCount: record.company_properties?.[0]?.count ?? 0,
      accountManager: record.account_manager_id
        ? {
            id: record.account_manager_id,
            email: manager?.email ?? null,
            fullName: manager?.fullName ?? null,
          }
        : null,
    }
  })
}

/** Filter by report lifecycle (matches overview stats: last 28 days). */
export type VisitReportFilter =
  | 'submittedLast28'
  | 'reviewedLast28'
  | 'submittedToClientLast28'

export type FetchVisitsFilters = {
  status?: VisitStatus
  /** Report lifecycle filter: limits to visits in that stage within last 28 days. */
  reportFilter?: VisitReportFilter
}

export const fetchVisits = async (
  filters?: FetchVisitsFilters,
): Promise<Visit[]> => {
  const supabase = getSupabaseClient()
  let builder = supabase
    .from('visits')
    .select(
      `
        id,
        status,
        company:companies (
          id,
          name
        ),
        scheduled_for,
        notes,
        property:company_properties (
          id,
          name,
          city,
          country
        ),
        focus_areas:visit_focus_areas (
          focus_area:property_focus_areas (
            id,
            name
          )
        ),
        shopper:shoppers (
          id,
          full_name,
          email
        )
      `,
    )
    .order('scheduled_for', { ascending: false })

  if (filters?.status) {
    builder = builder.eq('status', filters.status)
  }
  if (filters?.reportFilter) {
    const since = new Date()
    since.setDate(since.getDate() - 28)
    const sinceIso = since.toISOString()
    switch (filters.reportFilter) {
      case 'submittedLast28':
        builder = builder.gte('under_review_at', sinceIso)
        break
      case 'reviewedLast28':
        builder = builder.gte('reviewed_at', sinceIso)
        break
      case 'submittedToClientLast28':
        builder = builder.gte('report_submitted_at', sinceIso)
        break
    }
  }

  const { data, error } = await builder

  if (error) {
    throw error
  }

  if (!data) {
    return []
  }

  const records = data as unknown as VisitRecord[]

  return records
    .filter((record) => Boolean(record.property && record.company))
    .map((record) => ({
      id: record.id,
      scheduledFor: record.scheduled_for,
      notes: record.notes,
      status: (record.status as VisitStatus | null) ?? 'scheduled',
      company: {
        id: record.company!.id,
        name: record.company!.name,
      },
      property: {
        id: record.property!.id,
        name: record.property!.name,
        city: record.property!.city,
        country: record.property!.country,
      },
      focusAreas:
        record.focus_areas
          ?.map((wrapper) => wrapper?.focus_area)
          .filter(
            (focus): focus is { id: string; name: string } => Boolean(focus),
          ) ?? [],
      shopper: record.shopper
        ? {
            id: record.shopper.id,
            fullName: record.shopper.full_name,
            email: record.shopper.email,
          }
        : null,
    }))
}

export const createVisit = async ({
  companyId,
  propertyId,
  shopperId,
  scheduledFor,
  focusAreaIds,
  focusAreaTemplateSectionIds,
  notes,
}: CreateVisitInput) => {
  const supabase = getSupabaseClient()
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('visits')
    .insert({
      company_id: companyId,
      property_id: propertyId,
      shopper_id: shopperId?.trim() || null,
      scheduled_for: scheduledFor,
      notes: notes?.trim() ? notes.trim() : null,
      created_by: userData.user?.id ?? null,
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw error ?? new Error('Unable to create visit')
  }

  if (focusAreaIds.length > 0) {
    const { error: focusError } = await supabase
      .from('visit_focus_areas')
      .insert(
        focusAreaIds.map((focusAreaId) => ({
          visit_id: data.id,
          focus_area_id: focusAreaId,
        })),
      )

    if (focusError) {
      throw focusError
    }

    // Copy template sections/questions into visit snapshot so template changes don't affect this visit
    const sectionIdsByFocus = focusAreaTemplateSectionIds ?? {}
    for (const focusAreaId of focusAreaIds) {
      const templateSectionIds = sectionIdsByFocus[focusAreaId] ?? []
      if (templateSectionIds.length > 0) {
        await copyTemplateSectionsToVisit(data.id, focusAreaId, templateSectionIds)
      }
    }
  }
}

export type UpdateVisitInput = {
  propertyId: string
  shopperId: string
  scheduledFor: string
  focusAreaIds: string[]
  /** For each focus area id, optional list of report_template_sections ids to copy into the visit. */
  focusAreaTemplateSectionIds?: FocusAreaTemplateSectionIds
  notes?: string
}

export const updateVisit = async (
  visitId: string,
  {
    propertyId,
    shopperId,
    scheduledFor,
    focusAreaIds,
    focusAreaTemplateSectionIds,
    notes,
  }: UpdateVisitInput,
) => {
  const supabase = getSupabaseClient()
  const { error: updateError } = await supabase
    .from('visits')
    .update({
      property_id: propertyId,
      shopper_id: shopperId,
      scheduled_for: scheduledFor,
      notes: notes?.trim() ? notes.trim() : null,
    })
    .eq('id', visitId)

  if (updateError) {
    throw updateError
  }

  await deleteVisitReportSectionsForVisit(visitId)

  const { error: deleteError } = await supabase
    .from('visit_focus_areas')
    .delete()
    .eq('visit_id', visitId)

  if (deleteError) {
    throw deleteError
  }

  if (focusAreaIds.length > 0) {
    const { error: insertError } = await supabase
      .from('visit_focus_areas')
      .insert(
        focusAreaIds.map((focusAreaId) => ({
          visit_id: visitId,
          focus_area_id: focusAreaId,
        })),
      )

    if (insertError) {
      throw insertError
    }

    const sectionIdsByFocus = focusAreaTemplateSectionIds ?? {}
    for (const focusAreaId of focusAreaIds) {
      const templateSectionIds = sectionIdsByFocus[focusAreaId] ?? []
      if (templateSectionIds.length > 0) {
        await copyTemplateSectionsToVisit(visitId, focusAreaId, templateSectionIds)
      }
    }
  }
}

/** Assign or change the shopper for a visit. Pass null to unassign. */
export const assignVisitShopper = async (
  visitId: string,
  shopperId: string | null,
) => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('visits')
    .update({ shopper_id: shopperId })
    .eq('id', visitId)

  if (error) {
    throw error
  }
}

export const updateVisitStatus = async (
  visitId: string,
  status: VisitStatus,
) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('visits')
    .update({ status })
    .eq('id', visitId)
    .select('id')
    .single()

  if (error || !data) {
    throw error ?? new Error('Unable to update visit status')
  }
}

export const shopperSubmitVisitReport = async (visitId: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('shopper_submit_visit_report', {
    p_visit_id: visitId,
  })
  if (error) {
    throw error
  }
}

export const fetchVisitStatus = async (
  visitId: string,
): Promise<VisitStatus> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('visits')
    .select('status')
    .eq('id', visitId)
    .single()

  if (error || !data) {
    throw error ?? new Error('Visit not found')
  }

  return (data.status as VisitStatus) ?? 'scheduled'
}

export const fetchVisitReports = async (
  visitId: string,
): Promise<VisitFocusAreaReport[]> => {
  const supabase = getSupabaseClient()
  const { data: focusRows, error: focusError } = await supabase
    .from('visit_focus_areas')
    .select(
      `
        focus_area:property_focus_areas (
          id,
          name
        )
      `,
    )
    .eq('visit_id', visitId)

  if (focusError) {
    throw focusError
  }

  const { data: reportRows, error: reportError } = await supabase
    .from('visit_focus_area_reports')
    .select('focus_area_id, content')
    .eq('visit_id', visitId)

  if (reportError) {
    throw reportError
  }

  const reportMap = new Map<string, string>()
  for (const row of (reportRows ?? []) as VisitFocusAreaReportRecord[]) {
    reportMap.set(row.focus_area_id, row.content)
  }

  if (!focusRows) {
    return []
  }

  return (focusRows as any[])
    .map((row) => row.focus_area)
    .filter((fa): fa is { id: string; name: string } => Boolean(fa))
    .map((fa) => ({
      focusAreaId: fa.id as string,
      focusAreaName: fa.name as string,
      content: reportMap.get(fa.id as string) ?? '',
    }))
}

export const saveVisitFocusAreaReport = async (
  visitId: string,
  focusAreaId: string,
  content: string,
) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('visit_focus_area_reports')
    .upsert(
      {
        visit_id: visitId,
        focus_area_id: focusAreaId,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'visit_id,focus_area_id' },
    )
    .select('visit_id')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

// --- Report templates (super admin) ---

export const fetchReportTemplateSections = async (): Promise<
  ReportTemplateSection[]
> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('report_template_sections')
    .select('id, name, display_order')
    .order('display_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map((r: { id: string; name: string; display_order: number }) => ({
    id: r.id,
    name: r.name,
    displayOrder: r.display_order,
  }))
}

export const fetchReportTemplateQuestionsBySectionIds = async (
  sectionIds: string[],
): Promise<ReportTemplateQuestion[]> => {
  if (sectionIds.length === 0) return []
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('report_template_questions')
    .select('id, template_section_id, label, question_type, options, required, display_order')
    .in('template_section_id', sectionIds)
    .order('display_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map(
    (q: {
      id: string
      template_section_id: string
      label: string
      question_type: string
      options: unknown
      required: boolean
      display_order: number
    }) => ({
      id: q.id,
      templateSectionId: q.template_section_id,
      label: q.label,
      questionType: q.question_type as ReportQuestionType,
      options: (q.options as { value: string; label?: string }[] | null) ?? null,
      required: q.required,
      displayOrder: q.display_order,
    }),
  )
}

export const createReportTemplateSection = async (name: string) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('report_template_sections')
    .insert({ name, display_order: 0 })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export const updateReportTemplateSection = async (
  id: string,
  { name, displayOrder }: { name?: string; displayOrder?: number },
) => {
  const supabase = getSupabaseClient()
  const payload: { name?: string; display_order?: number; updated_at?: string } = {
    updated_at: new Date().toISOString(),
  }
  if (name !== undefined) payload.name = name
  if (displayOrder !== undefined) payload.display_order = displayOrder
  const { error } = await supabase
    .from('report_template_sections')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

export const deleteReportTemplateSection = async (id: string) => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('report_template_sections')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export const createReportTemplateQuestion = async (input: {
  templateSectionId: string
  label: string
  questionType: ReportQuestionType
  options?: { value: string; label?: string }[] | null
  required?: boolean
  displayOrder?: number
}) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('report_template_questions')
    .insert({
      template_section_id: input.templateSectionId,
      label: input.label,
      question_type: input.questionType,
      options: input.options ?? null,
      required: input.required ?? true,
      display_order: input.displayOrder ?? 0,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export const updateReportTemplateQuestion = async (
  id: string,
  input: {
    label?: string
    questionType?: ReportQuestionType
    options?: { value: string; label?: string }[] | null
    required?: boolean
    displayOrder?: number
  },
) => {
  const supabase = getSupabaseClient()
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.label !== undefined) payload.label = input.label
  if (input.questionType !== undefined) payload.question_type = input.questionType
  if (input.options !== undefined) payload.options = input.options
  if (input.required !== undefined) payload.required = input.required
  if (input.displayOrder !== undefined) payload.display_order = input.displayOrder
  const { error } = await supabase
    .from('report_template_questions')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

export const deleteReportTemplateQuestion = async (id: string) => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('report_template_questions')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Copy template sections and their questions into the visit (snapshot). Called when scheduling. */
export const copyTemplateSectionsToVisit = async (
  visitId: string,
  focusAreaId: string,
  templateSectionIds: string[],
) => {
  if (templateSectionIds.length === 0) return
  const supabase = getSupabaseClient()
  const sections = await supabase
    .from('report_template_sections')
    .select('id, name, display_order')
    .in('id', templateSectionIds)
    .order('display_order', { ascending: true })

  if (sections.error || !sections.data?.length) return

  const sectionIds = sections.data.map((s) => s.id)
  const questions = await supabase
    .from('report_template_questions')
    .select('id, template_section_id, label, question_type, options, required, display_order')
    .in('template_section_id', sectionIds)
    .order('display_order', { ascending: true })

  if (questions.error) throw questions.error

  type SectionRow = { id: string; name: string; display_order: number }
  type QuestionRow = {
    id: string
    template_section_id?: string
    templateSectionId?: string
    label: string
    question_type: string
    options: unknown
    required: boolean
    display_order: number
  }
  const sectionRows = sections.data as SectionRow[]
  const questionRows = (questions.data ?? []) as QuestionRow[]

  /** Get template section id from row (Supabase may return snake_case or camelCase). */
  const getTemplateSectionId = (q: QuestionRow): string =>
    q.template_section_id ?? q.templateSectionId ?? ''

  for (let i = 0; i < sectionRows.length; i++) {
    const sec = sectionRows[i]
    if (!sec) continue
    const { data: insertedSection, error: sectionError } = await supabase
      .from('visit_report_sections')
      .insert({
        visit_id: visitId,
        focus_area_id: focusAreaId,
        section_name: sec.name,
        display_order: i,
      })
      .select('id')
      .single()

    if (sectionError || !insertedSection) throw sectionError ?? new Error('Failed to insert visit report section')

    const sectionQuestions = questionRows.filter(
      (q) => getTemplateSectionId(q) === sec.id,
    )
    for (let j = 0; j < sectionQuestions.length; j++) {
      const q = sectionQuestions[j]
      if (!q) continue
      const qAny = q as Record<string, unknown>
      const questionType =
        q.question_type ?? qAny.questionType ?? 'short_text'
      const { error: questionError } = await supabase
        .from('visit_report_questions')
        .insert({
          visit_report_section_id: insertedSection.id,
          label: q.label ?? '',
          question_type: questionType,
          options: q.options ?? null,
          required: q.required ?? true,
          display_order: j,
        })
      if (questionError) throw questionError
    }
  }
}

/** Delete all visit report sections (and cascade questions/answers) for a visit. Used when updating visit focus areas. */
export const deleteVisitReportSectionsForVisit = async (visitId: string) => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('visit_report_sections')
    .delete()
    .eq('visit_id', visitId)
  if (error) throw error
}

/** Add a section to a visit report (for a focus area). Used when editing report form after scheduling. */
export const createVisitReportSection = async (
  visitId: string,
  focusAreaId: string,
  input: { sectionName: string; displayOrder?: number },
) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('visit_report_sections')
    .insert({
      visit_id: visitId,
      focus_area_id: focusAreaId,
      section_name: input.sectionName.trim(),
      display_order: input.displayOrder ?? 0,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Update a visit report section. */
export const updateVisitReportSection = async (
  sectionId: string,
  input: { sectionName?: string; displayOrder?: number },
) => {
  const supabase = getSupabaseClient()
  const payload: Record<string, unknown> = {}
  if (input.sectionName !== undefined) payload.section_name = input.sectionName.trim()
  if (input.displayOrder !== undefined) payload.display_order = input.displayOrder
  if (Object.keys(payload).length === 0) return
  const { error } = await supabase
    .from('visit_report_sections')
    .update(payload)
    .eq('id', sectionId)
  if (error) throw error
}

/** Delete a visit report section (cascades to questions and answers). */
export const deleteVisitReportSection = async (sectionId: string) => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('visit_report_sections')
    .delete()
    .eq('id', sectionId)
  if (error) throw error
}

/** Add a question to a visit report section. */
export const createVisitReportQuestion = async (
  sectionId: string,
  input: {
    label: string
    questionType: ReportQuestionType
    options?: { value: string; label?: string }[] | null
    required?: boolean
    displayOrder?: number
  },
) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('visit_report_questions')
    .insert({
      visit_report_section_id: sectionId,
      label: input.label.trim(),
      question_type: input.questionType,
      options: input.options ?? null,
      required: input.required ?? true,
      display_order: input.displayOrder ?? 0,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Update a visit report question. */
export const updateVisitReportQuestion = async (
  questionId: string,
  input: {
    label?: string
    questionType?: ReportQuestionType
    options?: { value: string; label?: string }[] | null
    required?: boolean
    displayOrder?: number
  },
) => {
  const supabase = getSupabaseClient()
  const payload: Record<string, unknown> = {}
  if (input.label !== undefined) payload.label = input.label.trim()
  if (input.questionType !== undefined) payload.question_type = input.questionType
  if (input.options !== undefined) payload.options = input.options
  if (input.required !== undefined) payload.required = input.required
  if (input.displayOrder !== undefined) payload.display_order = input.displayOrder
  if (Object.keys(payload).length === 0) return
  const { error } = await supabase
    .from('visit_report_questions')
    .update(payload)
    .eq('id', questionId)
  if (error) throw error
}

/** Delete a visit report question (and its answers). */
export const deleteVisitReportQuestion = async (questionId: string) => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('visit_report_questions')
    .delete()
    .eq('id', questionId)
  if (error) throw error
}

/** Fetch sections and questions for a visit (for shopper form and report view). Grouped by focus area. */
export type VisitReportFormFocusArea = {
  focusAreaId: string
  focusAreaName: string
  sections: VisitReportSection[]
  /** Current answer value per question id (for this focus area) */
  answers: Record<string, string | null>
  /** Legacy free-text content if no sections (backward compat) */
  legacyContent: string
}

export const fetchVisitReportFormData = async (
  visitId: string,
): Promise<VisitReportFormFocusArea[]> => {
  const supabase = getSupabaseClient()
  const [focusRes, sectionsRes, answersRes] = await Promise.all([
    supabase
      .from('visit_focus_areas')
      .select('focus_area:property_focus_areas(id, name)')
      .eq('visit_id', visitId),
    supabase
      .from('visit_report_sections')
      .select('id, visit_id, focus_area_id, section_name, display_order')
      .eq('visit_id', visitId)
      .order('display_order', { ascending: true }),
    supabase
      .from('visit_report_answers')
      .select('focus_area_id, question_id, value')
      .eq('visit_id', visitId),
  ])

  if (focusRes.error) throw focusRes.error
  if (sectionsRes.error) throw sectionsRes.error
  if (answersRes.error) throw answersRes.error

  const focusRows = (focusRes.data ?? []) as { focus_area: { id: string; name: string } | { id: string; name: string }[] | null }[]
  const focusAreas = focusRows
    .map((r) => {
      const fa = r.focus_area
      if (!fa) return null
      return Array.isArray(fa) ? fa[0] ?? null : fa
    })
    .filter((fa): fa is { id: string; name: string } => Boolean(fa))

  const reportRows = await supabase
    .from('visit_focus_area_reports')
    .select('focus_area_id, content')
    .eq('visit_id', visitId)

  const reportMap = new Map<string, string>()
  for (const row of (reportRows.data ?? []) as { focus_area_id: string; content: string }[]) {
    reportMap.set(row.focus_area_id, row.content)
  }

  type SectionRow = {
    id: string
    visit_id: string
    focus_area_id: string
    section_name: string
    display_order: number
  }
  type QuestionRow = {
    id: string
    visit_report_section_id: string
    label: string
    question_type: string
    options: unknown
    required: boolean
    display_order: number
  }

  const sectionRows = (sectionsRes.data ?? []) as SectionRow[]
  const sectionIds = sectionRows.map((s) => s.id)

  let questionsData: QuestionRow[] = []
  if (sectionIds.length > 0) {
    const questionsRes = await supabase
      .from('visit_report_questions')
      .select('id, visit_report_section_id, label, question_type, options, required, display_order')
      .in('visit_report_section_id', sectionIds)
      .order('display_order', { ascending: true })
    if (!questionsRes.error) {
      questionsData = (questionsRes.data ?? []) as QuestionRow[]
    }
  }

  const questionsBySectionId = new Map<string, QuestionRow[]>()
  for (const q of questionsData) {
    const list = questionsBySectionId.get(q.visit_report_section_id) ?? []
    list.push(q)
    questionsBySectionId.set(q.visit_report_section_id, list)
  }

  const answers = (answersRes.data ?? []) as { focus_area_id: string; question_id: string; value: string | null }[]
  const answerMap = new Map<string, string | null>()
  for (const a of answers) {
    answerMap.set(`${a.focus_area_id}:${a.question_id}`, a.value)
  }

  const sectionsByFocus = new Map<string, VisitReportSection[]>()
  for (const row of sectionRows) {
    const sectionQuestions = (questionsBySectionId.get(row.id) ?? []).sort(
      (a, b) => a.display_order - b.display_order,
    )
    const questions: VisitReportQuestion[] = sectionQuestions.map((q) => ({
      id: q.id,
      visitReportSectionId: q.visit_report_section_id,
      label: q.label,
      questionType: q.question_type as ReportQuestionType,
      options: (q.options as { value: string; label?: string }[] | null) ?? null,
      required: q.required,
      displayOrder: q.display_order,
    }))
    sectionsByFocus.set(row.focus_area_id, [
      ...(sectionsByFocus.get(row.focus_area_id) ?? []),
      {
        id: row.id,
        visitId: row.visit_id,
        focusAreaId: row.focus_area_id,
        sectionName: row.section_name,
        displayOrder: row.display_order,
        questions,
      },
    ])
  }

  for (const list of sectionsByFocus.values()) {
    list.sort((a, b) => a.displayOrder - b.displayOrder)
  }

  return focusAreas.map((fa) => {
    const focusAnswers: Record<string, string | null> = {}
    for (const [key, value] of answerMap) {
      const [fid, qid] = key.split(':')
      if (fid === fa.id) focusAnswers[qid] = value
    }
    return {
      focusAreaId: fa.id,
      focusAreaName: fa.name,
      sections: sectionsByFocus.get(fa.id) ?? [],
      answers: focusAnswers,
      legacyContent: reportMap.get(fa.id) ?? '',
    }
  })
}

export const saveVisitReportAnswers = async (
  visitId: string,
  focusAreaId: string,
  answers: { questionId: string; value: string | null }[],
) => {
  const supabase = getSupabaseClient()
  const now = new Date().toISOString()
  for (const { questionId, value } of answers) {
    const { error } = await supabase
      .from('visit_report_answers')
      .upsert(
        {
          visit_id: visitId,
          focus_area_id: focusAreaId,
          question_id: questionId,
          value,
          updated_at: now,
        },
        { onConflict: 'visit_id,focus_area_id,question_id' },
      )
    if (error) throw error
  }
}

export const fetchCompanyVisits = async (
  companyId: string,
): Promise<Visit[]> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('visits')
    .select(
      `
        id,
        status,
        company:companies (
          id,
          name
        ),
        scheduled_for,
        notes,
        property:company_properties (
          id,
          name,
          city,
          country
        ),
        focus_areas:visit_focus_areas (
          focus_area:property_focus_areas (
            id,
            name
          )
        ),
        shopper:shoppers (
          id,
          full_name,
          email
        )
      `,
    )
    .eq('company_id', companyId)
    .order('scheduled_for', { ascending: false })

  if (error) {
    throw error
  }

  if (!data) {
    return []
  }

  const records = data as unknown as VisitRecord[]

  return records
    .filter((record) => Boolean(record.property && record.company))
    .map((record) => ({
      id: record.id,
      scheduledFor: record.scheduled_for,
      notes: record.notes,
      status: (record.status as VisitStatus | null) ?? 'scheduled',
      company: {
        id: record.company!.id,
        name: record.company!.name,
      },
      property: {
        id: record.property!.id,
        name: record.property!.name,
        city: record.property!.city,
        country: record.property!.country,
      },
      focusAreas:
        record.focus_areas
          ?.map((wrapper) => wrapper?.focus_area)
          .filter(
            (focus): focus is { id: string; name: string } => Boolean(focus),
          ) ?? [],
      shopper: record.shopper
        ? {
            id: record.shopper.id,
            fullName: record.shopper.full_name,
            email: record.shopper.email,
          }
        : null,
    }))
}

export const fetchVisitsAssignedToShopper = async (
  shopperId: string,
): Promise<Visit[]> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('visits')
    .select(
      `
        id,
        status,
        company:companies (
          id,
          name
        ),
        scheduled_for,
        notes,
        property:company_properties (
          id,
          name,
          city,
          country
        ),
        focus_areas:visit_focus_areas (
          focus_area:property_focus_areas (
            id,
            name
          )
        ),
        shopper:shoppers (
          id,
          full_name,
          email
        )
      `,
    )
    .eq('shopper_id', shopperId)
    .order('scheduled_for', { ascending: false })

  if (error) {
    throw error
  }

  if (!data) {
    return []
  }

  const records = data as unknown as VisitRecord[]

  return records
    .filter((record) => Boolean(record.property && record.company))
    .map((record) => ({
      id: record.id,
      scheduledFor: record.scheduled_for,
      notes: record.notes,
      status: (record.status as VisitStatus | null) ?? 'scheduled',
      company: {
        id: record.company!.id,
        name: record.company!.name,
      },
      property: {
        id: record.property!.id,
        name: record.property!.name,
        city: record.property!.city,
        country: record.property!.country,
      },
      focusAreas:
        record.focus_areas
          ?.map((wrapper) => wrapper?.focus_area)
          .filter(
            (focus): focus is { id: string; name: string } => Boolean(focus),
          ) ?? [],
      shopper: record.shopper
        ? {
            id: record.shopper.id,
            fullName: record.shopper.full_name,
            email: record.shopper.email,
          }
        : null,
    }))
}

export type SuperAdminOverviewStats = {
  reportsSubmittedByShoppersLast28Days: number
  reportsReviewedLast28Days: number
  reportsSubmittedToClientLast28Days: number
  shoppersCreatedLast28Days: number
}

export const fetchSuperAdminOverviewStats =
  async (): Promise<SuperAdminOverviewStats> => {
    const supabase = getSupabaseClient()
    const since = new Date()
    since.setDate(since.getDate() - 28)
    const sinceIso = since.toISOString()

    const [
      submittedByShoppersResult,
      reviewedResult,
      submittedToClientResult,
      shoppersResult,
    ] = await Promise.all([
      supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .gte('under_review_at', sinceIso),
      supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .gte('reviewed_at', sinceIso),
      supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .gte('report_submitted_at', sinceIso),
      supabase
        .from('shoppers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceIso),
    ])

    if (submittedByShoppersResult.error) throw submittedByShoppersResult.error
    if (reviewedResult.error) throw reviewedResult.error
    if (submittedToClientResult.error) throw submittedToClientResult.error
    if (shoppersResult.error) throw shoppersResult.error

    return {
      reportsSubmittedByShoppersLast28Days:
        submittedByShoppersResult.count ?? 0,
      reportsReviewedLast28Days: reviewedResult.count ?? 0,
      reportsSubmittedToClientLast28Days: submittedToClientResult.count ?? 0,
      shoppersCreatedLast28Days: shoppersResult.count ?? 0,
    }
  }

export const fetchShoppers = async (
  filters?: FetchShoppersFilters,
): Promise<Shopper[]> => {
  const supabase = getSupabaseClient()
  let builder = supabase
    .from('shoppers')
    .select('id, full_name, email, created_at, status, location_country, location_city')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    builder = builder.eq('status', filters.status)
  }
  if (filters?.country != null && filters.country !== '') {
    builder = builder.eq('location_country', filters.country)
  }
  if (filters?.city != null && filters.city !== '') {
    builder = builder.eq('location_city', filters.city)
  }
  if (filters?.search?.trim()) {
    const sanitized = filters.search.trim()
    builder = builder.or(
      `full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`,
    )
  }
  if (filters?.createdInLastDays != null && filters.createdInLastDays > 0) {
    const since = new Date()
    since.setDate(since.getDate() - filters.createdInLastDays)
    builder = builder.gte('created_at', since.toISOString())
  }

  const { data, error } = await builder

  if (error) {
    throw error
  }

  if (!data) {
    return []
  }

  const records = data as unknown as ShopperRecord[]
  return records.map((record) => ({
    id: record.id,
    fullName: record.full_name,
    email: record.email,
    createdAt: record.created_at,
    status: record.status,
    locationCountry: record.location_country ?? null,
    locationCity: record.location_city ?? null,
  }))
}

/** Returns distinct city values from shoppers (non-null, sorted). Used to populate city filter. */
export const fetchShopperCities = async (): Promise<string[]> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('shoppers')
    .select('location_city')
    .not('location_city', 'is', null)

  if (error) throw error
  if (!data?.length) return []

  const cities = [
    ...new Set(
      (data as { location_city: string | null }[])
        .map((r) => r.location_city?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return cities
}

export const searchShoppers = async (
  query: string,
  limit = 20,
  options?: { status?: ShopperStatus },
): Promise<Shopper[]> => {
  const supabase = getSupabaseClient()
  let builder = supabase
    .from('shoppers')
    .select('id, full_name, email, created_at, status')
    .order('full_name', { ascending: true })
    .limit(limit)

  if (options?.status) {
    builder = builder.eq('status', options.status)
  }

  if (query.trim()) {
    const sanitized = query.trim()
    builder = builder.or(
      `full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`,
    )
  }

  const { data, error } = await builder

  if (error) {
    throw error
  }

  if (!data) {
    return []
  }

  const records = data as unknown as ShopperRecord[]
  return records.map((record) => ({
    id: record.id,
    fullName: record.full_name,
    email: record.email,
    createdAt: record.created_at,
    status: record.status,
  }))
}

export const updateShopperStatus = async (
  shopperId: string,
  status: ShopperStatus,
): Promise<void> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('shoppers')
    .update({ status })
    .eq('id', shopperId)
  if (error) throw error
}

export const fetchShopperById = async (
  shopperId: string,
): Promise<ShopperDetails | null> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('shoppers')
    .select(
      'id, full_name, email, created_at, status, date_of_birth, gender, nationalities, location_country, location_city, location_lat, location_lng, resident_visa, phone, native_language, languages_spoken, marital_status, children, accessibility_needs, accessibility_notes, info_submitted_at',
    )
    .eq('id', shopperId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const r = data as unknown as ShopperDetailsRecord
  return {
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    createdAt: r.created_at,
    status: r.status,
    dateOfBirth: r.date_of_birth ?? null,
    gender: r.gender ?? null,
    nationalities: r.nationalities ?? [],
    locationCountry: r.location_country ?? null,
    locationCity: r.location_city ?? null,
    locationLat: r.location_lat ?? null,
    locationLng: r.location_lng ?? null,
    residentVisa: r.resident_visa ?? null,
    phone: r.phone ?? null,
    nativeLanguage: r.native_language ?? null,
    languagesSpoken: (r.languages_spoken ?? []).map((x) => ({
      language: x?.language ?? '',
      fluency: x?.fluency ?? '',
    })),
    maritalStatus: r.marital_status ?? null,
    children: (r.children ?? []).map((x) => ({
      date_of_birth: x?.date_of_birth ?? '',
    })),
    accessibilityNeeds: r.accessibility_needs ?? false,
    accessibilityNotes: r.accessibility_notes ?? null,
    infoSubmittedAt: r.info_submitted_at ?? null,
  }
}

export const createShopper = async ({
  fullName,
  email,
}: CreateShopperInput) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('create-shopper', {
    body: {
      fullName,
      email,
    },
  })

  if (error) {
    console.error('Error invoking create-shopper function:', error)
    // Extract more detailed error message if available
    const errorMessage =
      error.message ||
      (error as { context?: { msg?: string } })?.context?.msg ||
      'Failed to create shopper. Please check if the Edge Function is deployed.'
    throw new Error(errorMessage)
  }

  if (!data) {
    throw new Error('No data returned from create-shopper function')
  }

  return data as { authUserId: string; tempPassword: string }
}

export const fetchPropertyDetails = async (
  propertyId: string,
): Promise<PropertyDetailsResult | null> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('company_properties')
    .select(
      `
        id,
        name,
        city,
        country,
        latitude,
        longitude,
        company:companies (
          id,
          name
        ),
        focus_areas:property_focus_areas (
          id,
          name,
          description
        )
      `,
    )
    .eq('id', propertyId)
    .maybeSingle()

  if (error && !isNoRowsError(error)) {
    throw error
  }

  if (!data) {
    return null
  }

  const companyRecord = normalizeCompany(data.company)

  if (!companyRecord) {
    return null
  }

  return {
    company: companyRecord,
    property: mapPropertyRecord(data),
  }
}

export const createCompanyProperty = async ({
  companyId,
  name,
  city,
  country,
  latitude,
  longitude,
}: CreatePropertyInput) => {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('company_properties').insert({
    company_id: companyId,
    name: name.trim(),
    city: city.trim(),
    country: country.trim(),
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export const createFocusArea = async ({
  propertyId,
  name,
  description,
}: CreateFocusAreaInput) => {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('property_focus_areas').insert({
    property_id: propertyId,
    name: name.trim(),
    description: description.trim(),
  })

  if (error) {
    throw new Error(error.message)
  }
}

export const deleteCompanyProperty = async (propertyId: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('company_properties')
    .delete()
    .eq('id', propertyId)

  if (error) {
    throw new Error(error.message)
  }
}

export const deleteFocusArea = async (focusAreaId: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('property_focus_areas')
    .delete()
    .eq('id', focusAreaId)

  if (error) {
    throw new Error(error.message)
  }
}

const mapProperties = (
  records?: SupabasePropertyRecord[] | null,
): CompanyProperty[] => {
  if (!records) return []
  return records.map(mapPropertyRecord)
}

const mapPropertyRecord = (
  record: SupabasePropertyRecord,
): CompanyProperty => ({
  id: record.id,
  name: record.name,
  city: record.city,
  country: record.country,
  latitude: record.latitude ?? null,
  longitude: record.longitude ?? null,
  focusAreas: mapFocusAreas(record.focus_areas),
})

const mapFocusAreas = (records?: SupabaseFocusArea[] | null): FocusArea[] => {
  if (!records) return []
  return records
    .filter((area): area is NonNullable<SupabaseFocusArea> => Boolean(area))
    .map((area) => ({
      id: area.id,
      name: area.name,
      description: area.description,
    }))
}

const isNoRowsError = (error: PostgrestError | null) =>
  Boolean(
    error &&
      (error.code === 'PGRST116' ||
        error.details?.includes('Results contain 0 rows')),
  )

const normalizeCompany = (
  company: SupabaseCompanyJoin,
): CompanySummary | null => {
  if (!company) return null
  if (Array.isArray(company)) {
    return company[0] ?? null
  }
  return company
}


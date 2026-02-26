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

type ShopperRecord = {
  id: string
  full_name: string
  email: string
  created_at: string
}

export type Shopper = {
  id: string
  fullName: string
  email: string
  createdAt: string
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

export type CreateVisitInput = {
  companyId: string
  propertyId: string
  shopperId: string
  scheduledFor: string
  focusAreaIds: string[]
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

export const fetchVisits = async (): Promise<Visit[]> => {
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

export const createVisit = async ({
  companyId,
  propertyId,
  shopperId,
  scheduledFor,
  focusAreaIds,
  notes,
}: CreateVisitInput) => {
  const supabase = getSupabaseClient()
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('visits')
    .insert({
      company_id: companyId,
      property_id: propertyId,
      shopper_id: shopperId,
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
  }
}

export type UpdateVisitInput = {
  propertyId: string
  shopperId: string
  scheduledFor: string
  focusAreaIds: string[]
  notes?: string
}

export const updateVisit = async (
  visitId: string,
  { propertyId, shopperId, scheduledFor, focusAreaIds, notes }: UpdateVisitInput,
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

export const fetchShoppers = async (): Promise<Shopper[]> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('shoppers')
    .select('id, full_name, email, created_at')
    .order('created_at', { ascending: false })

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
  }))
}

export const searchShoppers = async (
  query: string,
  limit = 20,
): Promise<Shopper[]> => {
  const supabase = getSupabaseClient()
  const builder = supabase
    .from('shoppers')
    .select('id, full_name, email, created_at')
    .order('full_name', { ascending: true })
    .limit(limit)

  if (query.trim()) {
    const sanitized = query.trim()
    builder.or(
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
  }))
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


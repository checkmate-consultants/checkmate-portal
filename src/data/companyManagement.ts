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

export type CompanySnapshot = {
  id: string
  name: string
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
}

type VisitRecord = {
  id: string
  scheduled_for: string
  notes: string | null
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
}

export type Visit = {
  id: string
  scheduledFor: string
  notes: string | null
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
  focusAreas: {
    id: string
    name: string
  }[]
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
  scheduledFor: string
  focusAreaIds: string[]
  notes?: string
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

  return {
    id: data.id,
    name: data.name,
    properties: mapProperties(data.properties),
  }
}

export const fetchCompanyDirectory = async (): Promise<
  CompanyDirectoryItem[]
> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, created_at, company_properties(count)')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  if (!data) {
    return []
  }

  return data.map((record: CompanyDirectoryRecord) => ({
    id: record.id,
    name: record.name,
    createdAt: record.created_at,
    propertyCount: record.company_properties?.[0]?.count ?? 0,
  }))
}

export const fetchVisits = async (): Promise<Visit[]> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('visits')
    .select(
      `
        id,
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
    }))
}

export const createVisit = async ({
  companyId,
  propertyId,
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
      scheduled_for: scheduledFor,
      notes: notes?.trim() ? notes.trim() : null,
      created_by: userData.user?.id ?? null,
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


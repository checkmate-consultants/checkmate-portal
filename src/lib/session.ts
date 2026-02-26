import type { PostgrestError, User } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient.ts'

export type CompanyMembership = {
  company_id: string
  role: string
}

export type SessionContext = {
  user: User | null
  membership: CompanyMembership | null
  isSuperAdmin: boolean
  isAccountManager: boolean
  isShopper: boolean
  shopperId: string | null
}

type SessionOptions = {
  autoProvision?: boolean
}

export const getSessionContext = async (
  options: SessionOptions = {},
): Promise<SessionContext> => {
  const { autoProvision: _autoProvision = true } = options
  const supabase = getSupabaseClient()
  // Refresh session so we have latest user_metadata (e.g. pending_company_name, signup_type) after email confirm
  await supabase.auth.refreshSession()
  const { data: userResult, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const user = userResult.user ?? null

  if (!user) {
    return {
      user: null,
      membership: null,
      isSuperAdmin: false,
      isAccountManager: false,
      isShopper: false,
      shopperId: null,
    }
  }

  const membership = await fetchMembership(user.id)
  let [isSuperAdmin, isAccountManager, shopperRow] = await Promise.all([
    fetchSuperAdminFlag(user.id),
    fetchAccountManagerFlag(user.id),
    fetchShopperRow(user.id),
  ])

  // Self-signup shoppers: create shoppers row on first load after email confirm if not yet present
  const signupType = user.user_metadata?.signup_type as string | undefined
  if (!shopperRow && signupType === 'shopper') {
    const supabase = getSupabaseClient()
    const { error } = await supabase.rpc('create_shopper_self')
    if (!error) {
      shopperRow = await fetchShopperRow(user.id)
    }
  }

  return {
    user,
    membership,
    isSuperAdmin,
    isAccountManager,
    isShopper: Boolean(shopperRow),
    shopperId: shopperRow?.id ?? null,
  }
}

const fetchMembership = async (userId: string) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error && !isNoRowsError(error)) {
    throw error
  }

  return data ?? null
}

const fetchSuperAdminFlag = async (userId: string) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error && !isNoRowsError(error)) {
    throw error
  }

  return Boolean(data)
}

const fetchAccountManagerFlag = async (userId: string) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('account_managers')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error && !isNoRowsError(error)) {
    throw error
  }

  return Boolean(data)
}

const fetchShopperRow = async (userId: string) => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('shoppers')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (error && !isNoRowsError(error)) {
    throw error
  }

  return data as { id: string } | null
}

const isNoRowsError = (error: PostgrestError) =>
  error.code === 'PGRST116' || error.details?.includes('Results contain 0 rows')


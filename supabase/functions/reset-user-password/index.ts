// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type Payload = {
  userId?: string
  companyId?: string
}

const generatePassword = () => {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) =>
    (byte % 36).toString(36),
  )
    .join('')
    .replace(/0/g, 'x')
    .replace(/1/g, 'y')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })

const errorResponse = (message: string, status = 400) =>
  jsonResponse({ error: message }, status)

const handler = async (req: Request): Promise<Response> => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      })
    }

    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authHeader) {
      return errorResponse('Missing Authorization header', 401)
    }

    let payload: Payload
    try {
      payload = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 400)
    }

    const userId = payload.userId?.trim()
    const companyId = payload.companyId?.trim()
    if (!userId) {
      return errorResponse('User ID is required', 422)
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !caller) {
      return errorResponse('Unauthorized', 401)
    }

    const { data: isSuperAdmin, error: rpcError } = await supabase.rpc(
      'is_super_admin',
    )
    if (!rpcError && isSuperAdmin) {
      // Super admin can reset any user; no companyId needed
    } else if (companyId) {
      // Company admin: must be company_admin for this company and target user must be a member
      const { data: membership, error: memberError } = await supabase
        .from('company_members')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', caller.id)
        .maybeSingle()
      if (memberError || !membership || membership.role !== 'company_admin') {
        return errorResponse('Forbidden', 403)
      }
      const { data: targetMember } = await supabase
        .from('company_members')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .maybeSingle()
      if (!targetMember) {
        return errorResponse('User is not a member of this company', 403)
      }
    } else {
      return errorResponse('Company ID is required for company admins', 422)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const tempPassword = generatePassword()
    const { error: updateError } = await admin.auth.admin.updateUserById(
      userId,
      { password: tempPassword },
    )

    if (updateError) {
      return errorResponse(
        updateError.message ?? 'Failed to update password',
        400,
      )
    }

    return jsonResponse({ tempPassword })
  } catch (error) {
    console.error('Unexpected error in reset-user-password:', error)
    return errorResponse(
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
    )
  }
}

Deno.serve(handler)

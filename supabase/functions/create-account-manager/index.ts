// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type Payload = {
  email?: string
  fullName?: string
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

const verifySuperAdmin = async (authHeader: string) => {
  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  })
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return { ok: false, error: 'Unauthorized' }
  }
  const { data: isSuperAdmin, error: roleError } = await supabase.rpc(
    'is_super_admin',
  )
  if (roleError || !isSuperAdmin) {
    return { ok: false, error: 'Forbidden' }
  }
  return { ok: true, user }
}

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

    const verification = await verifySuperAdmin(authHeader)
    if (!verification.ok) {
      const status = verification.error === 'Unauthorized' ? 401 : 403
      return errorResponse(verification.error, status)
    }

    let payload: Payload
    try {
      payload = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 400)
    }

    const email = payload.email?.trim()?.toLowerCase()
    const fullName = payload.fullName?.trim()
    if (!email) {
      return errorResponse('Email is required', 422)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    let userId: string
    let tempPassword: string | null = null

    const temporaryPassword = generatePassword()
    const { data: createdUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName ?? email.split('@')[0],
          role: 'account_manager',
        },
      })

    if (createdUser?.user) {
      userId = createdUser.user.id
      tempPassword = temporaryPassword
    } else if (createError?.message?.includes('already registered')) {
      const { data: listData } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
      const existing = listData?.users?.find(
        (u: { email?: string }) => u.email?.toLowerCase() === email,
      )
      if (!existing) {
        return errorResponse('User already exists but could not be found', 409)
      }
      userId = existing.id
    } else {
      return errorResponse(
        createError?.message ?? 'Unable to create user',
        400,
      )
    }

    const { error: insertError } = await admin.from('account_managers').insert({
      user_id: userId,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return errorResponse('This user is already an account manager', 409)
      }
      return errorResponse(insertError.message, 400)
    }

    return jsonResponse({
      authUserId: userId,
      ...(tempPassword && { tempPassword }),
    })
  } catch (error) {
    console.error('Unexpected error in create-account-manager:', error)
    return errorResponse(
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
    )
  }
}

Deno.serve(handler)

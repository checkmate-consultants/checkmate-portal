// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type ShopperPayload = {
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse('Unauthorized', 401)
  }

  const verification = await verifySuperAdmin(authHeader)
  if (!verification.ok) {
    const status = verification.error === 'Unauthorized' ? 401 : 403
    return errorResponse(verification.error, status)
  }

  let payload: ShopperPayload
  try {
    payload = await req.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  const { email, fullName } = payload
  if (!email || !fullName) {
    return errorResponse('Missing required fields', 422)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const temporaryPassword = generatePassword()
  const { data: createdUser, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        role: 'shopper',
      },
    })

  if (createError || !createdUser?.user) {
    const status =
      createError?.message?.includes('already registered') ? 409 : 400
    return errorResponse(createError?.message ?? 'Unable to create user', status)
  }

  const userId = createdUser.user.id

  const { error: shopperError } = await admin.from('shoppers').insert({
    auth_user_id: userId,
    full_name: fullName.trim(),
    email: email.toLowerCase(),
    created_by: verification.user.id,
  })

  if (shopperError) {
    return errorResponse(shopperError.message, 400)
  }

  return jsonResponse({
    authUserId: userId,
    tempPassword: temporaryPassword,
  })
}

Deno.serve(handler)


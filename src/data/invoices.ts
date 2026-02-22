import { getSupabaseClient } from '../lib/supabaseClient.ts'

/** Extract a display message from an unknown error (Supabase/PostgrestError or Error). */
export function getInvoiceErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return fallback
}

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'void'

export type Invoice = {
  id: string
  companyId: string
  companyName: string
  invoiceNumber: string
  amountCents: number
  currency: string
  status: InvoiceStatus
  dueDate: string | null
  issuedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CompanyInvoiceSummary = {
  totalInvoicedLast12MonthsCents: number
  pendingCount: number
  pendingTotalCents: number
}

type InvoiceRecord = {
  id: string
  company_id: string
  invoice_number: string
  amount_cents: number
  currency: string
  status: string
  due_date: string | null
  issued_at: string | null
  created_at: string
  updated_at: string
  company?: { id: string; name: string } | null
}

function mapRecord(record: InvoiceRecord): Invoice {
  return {
    id: record.id,
    companyId: record.company_id,
    companyName: record.company?.name ?? '',
    invoiceNumber: record.invoice_number,
    amountCents: record.amount_cents,
    currency: record.currency,
    status: record.status as InvoiceStatus,
    dueDate: record.due_date,
    issuedAt: record.issued_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

/** Fetch all invoices (super admin). */
export async function fetchInvoices(): Promise<Invoice[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('invoices')
    .select(
      `
      id,
      company_id,
      invoice_number,
      amount_cents,
      currency,
      status,
      due_date,
      issued_at,
      created_at,
      updated_at,
      company:companies ( id, name )
    `,
    )
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!data) return []

  return (data as unknown as InvoiceRecord[]).map(mapRecord)
}

/** Fetch invoices for a single company (excludes draft – customer-facing only). */
export async function fetchCompanyInvoices(
  companyId: string,
): Promise<Invoice[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('invoices')
    .select(
      `
      id,
      company_id,
      invoice_number,
      amount_cents,
      currency,
      status,
      due_date,
      issued_at,
      created_at,
      updated_at,
      company:companies ( id, name )
    `,
    )
    .eq('company_id', companyId)
    .neq('status', 'draft')
    .neq('status', 'void')
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!data) return []

  return (data as unknown as InvoiceRecord[]).map(mapRecord)
}

/** Get summary for company portal: last 12 months total + pending count & total. */
export async function fetchCompanyInvoiceSummary(
  companyId: string,
): Promise<CompanyInvoiceSummary> {
  const supabase = getSupabaseClient()
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const fromIso = twelveMonthsAgo.toISOString()

  const { data: last12Rows, error: e12 } = await supabase
    .from('invoices')
    .select('amount_cents, status')
    .eq('company_id', companyId)
    .gte('created_at', fromIso)

  if (e12) throw e12

  const last12Issued = (last12Rows ?? []).filter(
    (r: { status: string }) =>
      r.status !== 'void' && r.status !== 'draft',
  )
  const totalInvoicedLast12MonthsCents = last12Issued.reduce(
    (sum, r) => sum + Number(r.amount_cents),
    0,
  )

  const { data: pendingRows, error: ePending } = await supabase
    .from('invoices')
    .select('amount_cents')
    .eq('company_id', companyId)
    .eq('status', 'pending')

  if (ePending) throw ePending

  const pendingCount = pendingRows?.length ?? 0
  const pendingTotalCents =
    (pendingRows ?? []).reduce((sum, r) => sum + Number(r.amount_cents), 0) ?? 0

  return {
    totalInvoicedLast12MonthsCents,
    pendingCount,
    pendingTotalCents,
  }
}

export type CreateInvoiceInput = {
  companyId: string
  invoiceNumber: string
  amountCents: number
  currency?: string
  status?: InvoiceStatus
  dueDate?: string | null
  issuedAt?: string | null
}

export async function createInvoice(input: CreateInvoiceInput): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('invoices').insert({
    company_id: input.companyId,
    invoice_number: input.invoiceNumber.trim(),
    amount_cents: input.amountCents,
    currency: input.currency ?? 'USD',
    status: input.status ?? 'draft',
    due_date: input.dueDate?.trim() || null,
    issued_at: input.issuedAt?.trim() || null,
  })

  if (error) throw error
}

export type UpdateInvoiceInput = {
  status?: InvoiceStatus
  amountCents?: number
  currency?: string
  dueDate?: string | null
  issuedAt?: string | null
}

export async function updateInvoice(
  invoiceId: string,
  input: UpdateInvoiceInput,
): Promise<void> {
  const supabase = getSupabaseClient()
  const payload: Record<string, unknown> = {}
  if (input.status !== undefined) payload.status = input.status
  if (input.amountCents !== undefined) payload.amount_cents = input.amountCents
  if (input.currency !== undefined) payload.currency = input.currency
  if (input.dueDate !== undefined) payload.due_date = input.dueDate || null
  if (input.issuedAt !== undefined) payload.issued_at = input.issuedAt || null

  if (Object.keys(payload).length === 0) return

  const { error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('id', invoiceId)

  if (error) throw error
}

/** Generate next suggested invoice number for a company (e.g. INV-0001). */
export async function suggestNextInvoiceNumber(
  companyId: string,
): Promise<string> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  const numbers = (data ?? [])
    .map((r: { invoice_number: string }) => r.invoice_number)
    .filter((n) => /^INV-\d+$/i.test(n))
  const maxNum = numbers.reduce((max, n) => {
    const num = parseInt(n.replace(/^INV-/i, ''), 10)
    return Number.isNaN(num) ? max : Math.max(max, num)
  }, 0)

  return `INV-${String(maxNum + 1).padStart(4, '0')}`
}

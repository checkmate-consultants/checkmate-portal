import { getSupabaseClient } from '../lib/supabaseClient.ts'

export type ActionPlanStatus = 'pending' | 'in_progress' | 'completed'

export type ActionPlanItem = {
  id: string
  companyId: string
  issue: string
  suggestedAction: string
  responsible: string
  deadline: string | null
  status: ActionPlanStatus
  createdAt: string
  updatedAt: string
}

type ActionPlanItemRow = {
  id: string
  company_id: string
  issue: string
  suggested_action: string
  responsible: string
  deadline: string | null
  status: ActionPlanStatus
  created_at: string
  updated_at: string
}

function mapRow(row: ActionPlanItemRow): ActionPlanItem {
  return {
    id: row.id,
    companyId: row.company_id,
    issue: row.issue,
    suggestedAction: row.suggested_action,
    responsible: row.responsible,
    deadline: row.deadline,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchActionPlanItems(
  companyId: string,
): Promise<ActionPlanItem[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('action_plan_items')
    .select('id, company_id, issue, suggested_action, responsible, deadline, status, created_at, updated_at')
    .eq('company_id', companyId)
    .order('deadline', { ascending: true, nullsFirst: false })

  if (error) throw error
  if (!data) return []

  return (data as ActionPlanItemRow[]).map(mapRow)
}

export type CreateActionPlanItemInput = {
  companyId: string
  issue: string
  suggestedAction: string
  responsible: string
  deadline?: string | null
  status?: ActionPlanStatus
}

export type UpdateActionPlanItemInput = {
  issue?: string
  suggestedAction?: string
  responsible?: string
  deadline?: string | null
  status?: ActionPlanStatus
}

export async function createActionPlanItem(
  input: CreateActionPlanItemInput,
): Promise<ActionPlanItem> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('action_plan_items')
    .insert({
      company_id: input.companyId,
      issue: input.issue.trim(),
      suggested_action: input.suggestedAction.trim(),
      responsible: input.responsible.trim(),
      deadline: input.deadline?.trim() || null,
      status: input.status ?? 'pending',
    })
    .select('id, company_id, issue, suggested_action, responsible, deadline, status, created_at, updated_at')
    .single()

  if (error) throw error
  return mapRow(data as ActionPlanItemRow)
}

export async function updateActionPlanItem(
  id: string,
  input: UpdateActionPlanItemInput,
): Promise<ActionPlanItem> {
  const supabase = getSupabaseClient()
  const payload: Record<string, unknown> = {}
  if (input.issue !== undefined) payload.issue = input.issue.trim()
  if (input.suggestedAction !== undefined)
    payload.suggested_action = input.suggestedAction.trim()
  if (input.responsible !== undefined)
    payload.responsible = input.responsible.trim()
  if (input.deadline !== undefined)
    payload.deadline = input.deadline?.trim() || null
  if (input.status !== undefined) payload.status = input.status

  const { data, error } = await supabase
    .from('action_plan_items')
    .update(payload)
    .eq('id', id)
    .select('id, company_id, issue, suggested_action, responsible, deadline, status, created_at, updated_at')
    .single()

  if (error) throw error
  return mapRow(data as ActionPlanItemRow)
}

export async function deleteActionPlanItem(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('action_plan_items')
    .delete()
    .eq('id', id)

  if (error) throw error
}

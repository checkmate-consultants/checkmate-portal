import { Navigate, useOutletContext } from 'react-router-dom'
import type { WorkspaceOutletContext } from './WorkspaceShell.tsx'

/**
 * When the user is at /workspace (no subpath), redirect to the right default:
 * shoppers and reviewers -> /workspace/visits, everyone else -> /workspace/company.
 */
export function WorkspaceIndexRedirect() {
  const { session } = useOutletContext<WorkspaceOutletContext>()
  if (session?.isShopper || session?.membership?.role === 'reviewer') {
    return <Navigate to="visits" replace />
  }
  return <Navigate to="company" replace />
}

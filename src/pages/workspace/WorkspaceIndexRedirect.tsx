import { Navigate, useOutletContext } from 'react-router-dom'
import type { WorkspaceOutletContext } from './WorkspaceShell.tsx'

/**
 * When the user is at /workspace (no subpath), redirect to the right default:
 * shoppers -> /workspace/visits, everyone else -> /workspace/company.
 * Avoids sending shoppers to company first and then redirecting to visits.
 */
export function WorkspaceIndexRedirect() {
  const { session } = useOutletContext<WorkspaceOutletContext>()
  if (session?.isShopper) {
    return <Navigate to="visits" replace />
  }
  return <Navigate to="company" replace />
}

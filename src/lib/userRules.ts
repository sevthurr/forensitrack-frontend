import type { Role, User } from './types'

export interface UserChange { name: string; email: string; role: Role; status: User['status'] }
export interface UserCheck { error?: string; confirm?: string }

const label = (r: Role) => (r === 'admin' ? 'Administrator' : 'Investigator')

// Mirrors the rules the FastAPI backend must enforce; the UI check is advisory only.
export function checkUserChange(users: User[], meId: string | null, target: User | undefined, next: UserChange): UserCheck {
  if (!target) return {}
  const roleChanged = target.role !== next.role
  const deactivating = target.status === 'Active' && next.status === 'Inactive'
  const wasActiveAdmin = target.role === 'admin' && target.status === 'Active'

  if (target.id === meId && target.role === 'admin' && roleChanged) return { error: 'You cannot change your own Administrator role. Ask another Administrator to do this.' }
  if (target.id === meId && deactivating) return { error: 'You cannot deactivate your own account.' }

  const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'Active').length
  const losesAdmin = wasActiveAdmin && (next.role !== 'admin' || next.status === 'Inactive')
  if (losesAdmin && activeAdmins <= 1) return { error: 'At least one active Administrator must remain. Promote or activate another Administrator first.' }

  if (roleChanged) {
    return { confirm: `Change ${target.name} from ${label(target.role)} to ${label(next.role)}?${next.role === 'admin' ? ' Administrators can manage users, all cases and all evidence.' : ' They will lose administrative access.'}` }
  }
  return {}
}

export function checkNewUser(next: UserChange): UserCheck {
  return next.role === 'admin' ? { confirm: `Create ${next.name} as an Administrator? Administrators can manage users, all cases and all evidence.` } : {}
}

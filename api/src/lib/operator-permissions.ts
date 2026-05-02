import { OperatorRole } from '@prisma/client'

/**
 * Section permissions for the operator dashboard.
 * Each section lists the roles that can access it.
 * GLOBAL_ADMIN always has access to everything regardless of this map.
 * If a section has an empty array or is not listed, it is inaccessible.
 */
export const SECTION_PERMISSIONS: Record<string, OperatorRole[]> = {
  tenants: ['HELPDESK', 'ACCOUNTING', 'GLOBAL_ADMIN'],
  audit: ['GLOBAL_ADMIN'],
  operators: ['GLOBAL_ADMIN'],
  discounts: ['ACCOUNTING', 'GLOBAL_ADMIN'],
  templates: ['GLOBAL_ADMIN'],
}

export function getAccessibleSections(role: OperatorRole): string[] {
  if (role === 'GLOBAL_ADMIN') {
    return Object.keys(SECTION_PERMISSIONS)
  }
  return Object.entries(SECTION_PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([section]) => section)
}

export function canAccessSection(role: OperatorRole, section: string): boolean {
  if (role === 'GLOBAL_ADMIN') return true
  const allowed = SECTION_PERMISSIONS[section]
  if (!allowed || allowed.length === 0) return false
  return allowed.includes(role)
}

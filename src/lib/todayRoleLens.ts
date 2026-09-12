import type { DailyWorkRow, MovementCandidateRow } from './operatingRepository'

export type AppRole = 'ADMIN' | 'COMMERCIAL' | 'OPERATIONS' | 'VIEWER' | string | null

export interface TodayRoleLens {
  label: string
  explanation: string
  focusDomains: Set<string> | null
  workTypes: Set<string> | null
  showSales: boolean
  showCapacity: boolean
  showRelationships: boolean
  showNextUp: boolean
  showUnassignedUrgent: boolean
}

export function getTodayRoleLens(role: AppRole): TodayRoleLens {
  switch (role) {
    case 'COMMERCIAL':
      return {
        label: 'Commercial lens',
        explanation: 'Emphasizes demand, follow-up, payment and relationship movement while preserving the same shared business truth.',
        focusDomains: new Set(['DEMAND', 'RELATIONSHIP', 'ECONOMICS']),
        workTypes: new Set(['FOLLOW_UP', 'PAYMENT']),
        showSales: true,
        showCapacity: false,
        showRelationships: true,
        showNextUp: true,
        showUnassignedUrgent: true,
      }
    case 'OPERATIONS':
      return {
        label: 'Operations lens',
        explanation: 'Emphasizes delivery, coordination, preparation and capacity while preserving the same shared business truth.',
        focusDomains: new Set(['DELIVERY', 'COORDINATION', 'KNOWLEDGE']),
        workTypes: new Set(['PREP', 'DELIVERY']),
        showSales: false,
        showCapacity: true,
        showRelationships: false,
        showNextUp: true,
        showUnassignedUrgent: true,
      }
    case 'VIEWER':
      return {
        label: 'Viewer lens',
        explanation: 'Shows the shared operating picture without claiming that unassigned work belongs to this user.',
        focusDomains: null,
        workTypes: null,
        showSales: true,
        showCapacity: true,
        showRelationships: true,
        showNextUp: true,
        showUnassignedUrgent: false,
      }
    case 'ADMIN':
    default:
      return {
        label: role === 'ADMIN' ? 'Admin lens' : 'Shared lens',
        explanation: 'Shows the broad operating picture across commercial, delivery, capacity, relationships and economics.',
        focusDomains: null,
        workTypes: null,
        showSales: true,
        showCapacity: true,
        showRelationships: true,
        showNextUp: true,
        showUnassignedUrgent: true,
      }
  }
}

export function workMatchesLens(item: DailyWorkRow, lens: TodayRoleLens) {
  return lens.workTypes == null || lens.workTypes.has(item.action_type)
}

export function focusMatchesLens(item: MovementCandidateRow, lens: TodayRoleLens) {
  return lens.focusDomains == null || lens.focusDomains.has(item.focus_domain)
}

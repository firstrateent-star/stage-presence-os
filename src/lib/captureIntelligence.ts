import type { TeamMemberOption, AssignmentRole, ScheduleType } from './operationsReality'
import type { CommitmentCandidate } from './resourceCommitments'

export type CaptureAuthority = 'OBSERVE' | 'SUGGEST' | 'REVERSIBLE' | 'CONSEQUENTIAL'
export type CaptureConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type CaptureProposalKind = 'CREW_CONFIRMATION' | 'SCHEDULE' | 'RESOURCE_RESERVATION' | 'PAYMENT_REPORT'

export type CaptureProposal =
  | {
      id: string
      kind: 'CREW_CONFIRMATION'
      title: string
      detail: string
      authority: 'CONSEQUENTIAL'
      confidence: CaptureConfidence
      requiresHumanReview: true
      payload: { teamMemberId: string; roleCode: AssignmentRole; assignmentState: 'CONFIRMED' }
    }
  | {
      id: string
      kind: 'SCHEDULE'
      title: string
      detail: string
      authority: 'REVERSIBLE'
      confidence: CaptureConfidence
      requiresHumanReview: true
      payload: { scheduleType: ScheduleType; label: string; startAt: string | null; startDate: string | null }
    }
  | {
      id: string
      kind: 'RESOURCE_RESERVATION'
      title: string
      detail: string
      authority: 'CONSEQUENTIAL'
      confidence: CaptureConfidence
      requiresHumanReview: true
      payload: { engagementResourceLinkId: string; commitmentType: 'RESERVATION'; commitmentState: 'CONFIRMED' }
    }
  | {
      id: string
      kind: 'PAYMENT_REPORT'
      title: string
      detail: string
      authority: 'SUGGEST'
      confidence: CaptureConfidence
      requiresHumanReview: true
      payload: { amount: number | null; paymentDateText: string | null }
    }

export interface CaptureInterpretation {
  interpreter: 'DETERMINISTIC_V0_1'
  proposals: CaptureProposal[]
  unknowns: string[]
  notes: string[]
}

export function interpretCapture(input: {
  text: string
  eventDate?: string | null
  teamMembers: TeamMemberOption[]
  resourceCandidates: CommitmentCandidate[]
}): CaptureInterpretation {
  const raw = input.text.trim()
  const normalized = normalize(raw)
  const proposals: CaptureProposal[] = []
  const unknowns: string[] = []
  const notes: string[] = []

  if (!raw) return { interpreter: 'DETERMINISTIC_V0_1', proposals, unknowns: ['No text was supplied for interpretation.'], notes }

  const confirmationLanguage = /\b(confirm(?:ed)?|booked|locked\s+in|definitely\s+working)\b/i.test(raw)
  if (confirmationLanguage) {
    for (const member of input.teamMembers) {
      const primaryRole = normalize(member.primary_role || '')
      if (primaryRole.includes('sales')) continue
      const aliases = [member.display_name, member.username].filter(Boolean).map(value => normalize(String(value)))
      if (!aliases.some(alias => alias && containsPhrase(normalized, alias))) continue
      const roleCode = inferRole(member)
      proposals.push({
        id: `crew:${member.id}`,
        kind: 'CREW_CONFIRMATION',
        title: `${member.display_name || member.username} confirmed`,
        detail: `Proposed confirmed ${human(roleCode)} assignment. This changes crew commitment and requires explicit approval.`,
        authority: 'CONSEQUENTIAL',
        confidence: 'HIGH',
        requiresHumanReview: true,
        payload: { teamMemberId: member.id, roleCode, assignmentState: 'CONFIRMED' },
      })
    }
  }

  const schedule = extractSchedule(raw, input.eventDate ?? null)
  if (schedule) proposals.push(schedule)

  const resourceCommitmentLanguage = /\b(taking|bringing|using|reserve|reserved|booked|allocated|deploy(?:ing|ed)?|send(?:ing)?|going\s+with)\b/i.test(raw)
  if (resourceCommitmentLanguage) {
    for (const candidate of input.resourceCandidates) {
      const name = candidate.resource?.name
      if (!name || !resourceMentioned(normalized, normalize(name))) continue
      proposals.push({
        id: `resource:${candidate.link_id}`,
        kind: 'RESOURCE_RESERVATION',
        title: `Reserve ${name}`,
        detail: 'The text appears to commit this represented Resource. A confirmed reservation is consequential and is never created without explicit approval.',
        authority: 'CONSEQUENTIAL',
        confidence: 'MEDIUM',
        requiresHumanReview: true,
        payload: { engagementResourceLinkId: candidate.link_id, commitmentType: 'RESERVATION', commitmentState: 'CONFIRMED' },
      })
    }
  }

  const payment = extractPayment(raw)
  if (payment.detected) {
    proposals.push({
      id: 'payment:reported',
      kind: 'PAYMENT_REPORT',
      title: payment.amount == null ? 'Payment reportedly received' : `Payment reportedly received · $${payment.amount.toLocaleString()}`,
      detail: 'This is only a report from the Capture source. It must not become VERIFIED collection evidence until accounting or processor evidence is checked.',
      authority: 'SUGGEST',
      confidence: payment.amount == null ? 'MEDIUM' : 'HIGH',
      requiresHumanReview: true,
      payload: { amount: payment.amount, paymentDateText: payment.dateText },
    })
    if (payment.amount == null) unknowns.push('Reported payment amount is not explicit.')
    unknowns.push('Accounting / processor verification for the reported payment is not represented.')
  }

  if (!proposals.length) notes.push('No governed operating command was confidently recognized. Preserve the text as source evidence or use manual structured Capture.')

  return { interpreter: 'DETERMINISTIC_V0_1', proposals, unknowns: unique(unknowns), notes }
}

function extractSchedule(raw: string, eventDate: string | null): CaptureProposal | null {
  const patterns: Array<{ type: ScheduleType; label: string; regex: RegExp }> = [
    { type: 'LOAD_IN', label: 'Load-in', regex: /\bload[ -]?in\b[^\d]{0,16}(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i },
    { type: 'SETUP', label: 'Setup', regex: /\bsetup\b[^\d]{0,16}(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i },
    { type: 'SHOW', label: 'Show', regex: /\bshow(?:time)?\b[^\d]{0,16}(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i },
    { type: 'STRIKE', label: 'Strike', regex: /\bstrike\b[^\d]{0,16}(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i },
    { type: 'LOAD_OUT', label: 'Load-out', regex: /\bload[ -]?out\b[^\d]{0,16}(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i },
  ]
  for (const pattern of patterns) {
    const match = raw.match(pattern.regex)
    if (!match) continue
    const clock = parseClock(match[1])
    const startAt = eventDate && clock ? `${eventDate}T${clock}:00` : null
    return {
      id: `schedule:${pattern.type}`,
      kind: 'SCHEDULE',
      title: `${pattern.label} ${match[1].trim()}`,
      detail: startAt ? `Proposed ${pattern.label.toLowerCase()} timing on the represented Engagement date.` : `A ${pattern.label.toLowerCase()} time was detected, but the Engagement date is unavailable; preserve the time without inventing a date.`,
      authority: 'REVERSIBLE',
      confidence: startAt ? 'HIGH' : 'MEDIUM',
      requiresHumanReview: true,
      payload: { scheduleType: pattern.type, label: pattern.label, startAt, startDate: startAt ? null : eventDate },
    }
  }
  return null
}

function extractPayment(raw: string) {
  const detected = /\b(paid|payment|balance\s+(?:came|is)\s+in|balance\s+paid|received\s+(?:the\s+)?(?:balance|payment)|deposit\s+(?:came|is)\s+in)\b/i.test(raw)
  if (!detected) return { detected: false, amount: null as number | null, dateText: null as string | null }
  const amountMatch = raw.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/)
  const amount = amountMatch ? Number(amountMatch[1].replaceAll(',', '')) : null
  const dateMatch = raw.match(/\b(yesterday|today|tomorrow|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i)
  return { detected: true, amount: Number.isFinite(amount) ? amount : null, dateText: dateMatch?.[1] ?? null }
}

function inferRole(member: TeamMemberOption): AssignmentRole {
  const role = normalize(member.primary_role || '')
  if (role.includes('a1')) return 'A1'
  if (role.includes('a2')) return 'A2'
  if (role.includes('audio')) return 'AUDIO_TECH'
  if (role.includes('video')) return 'VIDEO_TECH'
  if (role.includes('led')) return 'LED_TECH'
  if (role.includes('project') || role.includes('pm')) return 'PROJECT_MANAGER'
  if (role.includes('driver')) return 'DRIVER'
  if (role.includes('install')) return 'INSTALLER'
  if (role.includes('labor')) return 'LABOR'
  return 'OTHER'
}

function resourceMentioned(text: string, resource: string) {
  if (containsPhrase(text, resource)) return true
  const textTokens = new Set(tokens(text))
  const resourceTokens = tokens(resource).filter(token => token.length > 2 || /\d/.test(token))
  if (!resourceTokens.length) return false
  const matches = resourceTokens.filter(token => textTokens.has(token)).length
  const hasDistinctiveDimension = resourceTokens.some(token => /\d+x\d+/.test(token) && textTokens.has(token))
  return hasDistinctiveDimension && matches / resourceTokens.length >= 0.5
}

function parseClock(value: string) {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] ?? '0')
  const meridiem = match[3]
  if (minute > 59 || hour > 23) return null
  if (meridiem) {
    if (hour < 1 || hour > 12) return null
    if (meridiem === 'pm' && hour !== 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function normalize(value: string) { return value.toLowerCase().replaceAll('×', 'x').replace(/[^a-z0-9]+/g, ' ').trim() }
function tokens(value: string) { return normalize(value).split(/\s+/).filter(Boolean) }
function containsPhrase(text: string, phrase: string) { return ` ${text} `.includes(` ${phrase} `) }
function human(value: string) { return value.replaceAll('_', ' ').toLowerCase() }
function unique(values: string[]) { return [...new Set(values)] }

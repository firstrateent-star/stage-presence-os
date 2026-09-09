import type { DecisionGap, DecisionSignal, ResolutionOwner } from './decisionResolver'

export type ExceptionDisposition =
  | 'SYSTEM_RESOLVABLE'
  | 'SOURCE_RECOVERABLE'
  | 'GROUP_RESOLVABLE'
  | 'DELEGATED'
  | 'FOUNDER_EXCEPTION'

export type AttentionBand = 'NOW' | 'DELEGATED' | 'WATCHING' | 'HANDLED'

export interface ExceptionItem {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  decision_label: string
  code: string
  label: string
  owner: ResolutionOwner
  severity: DecisionGap['severity']
  strategy: DecisionGap['resolution_strategy']
  disposition: ExceptionDisposition
  attention_band: AttentionBand
  resolution_hint: string
  score: number
}

export interface ExceptionGroup {
  key: string
  code: string
  label: string
  owner: ResolutionOwner
  disposition: ExceptionDisposition
  attention_band: AttentionBand
  count: number
  engagement_ids: string[]
  highest_score: number
}

export interface AttentionSummary {
  now: ExceptionGroup[]
  delegated: ExceptionGroup[]
  watching: ExceptionGroup[]
  handled: ExceptionGroup[]
  greg_now_count: number
  total_raw_gaps: number
  compressed_groups: number
}

function dispositionFor(gap: DecisionGap): ExceptionDisposition {
  if (gap.owner === 'GREG') return 'FOUNDER_EXCEPTION'
  if (gap.resolution_strategy === 'REUSE_EVIDENCE') return 'SYSTEM_RESOLVABLE'
  if (gap.resolution_strategy === 'SOURCE_RECOVERY') return 'SOURCE_RECOVERABLE'
  if (gap.resolution_strategy === 'OWNER_CONFIRMATION') return 'GROUP_RESOLVABLE'
  return 'DELEGATED'
}

function attentionBandFor(gap: DecisionGap, disposition: ExceptionDisposition, dueLabel: string): AttentionBand {
  if (disposition === 'SYSTEM_RESOLVABLE') return 'HANDLED'
  if (gap.severity === 'WATCH') return 'WATCHING'
  if (disposition === 'FOUNDER_EXCEPTION') return 'NOW'
  if (dueLabel === 'Today' || dueLabel === 'Within 24h') return 'NOW'
  return 'DELEGATED'
}

export function buildExceptionItems(decisions: DecisionSignal[]): ExceptionItem[] {
  const items: ExceptionItem[] = []

  for (const decision of decisions) {
    if (decision.decision === 'LEARN_RESOLVE') continue

    for (const gap of decision.gaps) {
      const disposition = dispositionFor(gap)
      const attentionBand = attentionBandFor(gap, disposition, decision.due_label)
      const severityWeight = gap.severity === 'BLOCKING' ? 30 : gap.severity === 'MATERIAL' ? 15 : 3
      const founderWeight = gap.owner === 'GREG' ? 200 : 0
      const nowWeight = attentionBand === 'NOW' ? 100 : 0

      items.push({
        engagement_id: decision.engagement.id,
        engagement_number: decision.engagement.engagement_number,
        engagement_name: decision.engagement.name,
        decision_label: decision.decision_label,
        code: gap.code,
        label: gap.label,
        owner: gap.owner,
        severity: gap.severity,
        strategy: gap.resolution_strategy,
        disposition,
        attention_band: attentionBand,
        resolution_hint: gap.resolution_hint,
        score: decision.score + severityWeight + founderWeight + nowWeight,
      })
    }
  }

  return items.sort((a, b) => b.score - a.score || a.engagement_name.localeCompare(b.engagement_name))
}

export function compressExceptions(items: ExceptionItem[]): ExceptionGroup[] {
  const groups = new Map<string, ExceptionGroup>()

  for (const item of items) {
    // Same exception type, owner, disposition and attention band can usually be
    // reasoned about together before opening individual Engagements.
    const key = [item.attention_band, item.owner, item.disposition, item.code].join(':')
    const current = groups.get(key)
    if (current) {
      current.count += 1
      current.highest_score = Math.max(current.highest_score, item.score)
      if (!current.engagement_ids.includes(item.engagement_id)) current.engagement_ids.push(item.engagement_id)
      continue
    }

    groups.set(key, {
      key,
      code: item.code,
      label: item.label,
      owner: item.owner,
      disposition: item.disposition,
      attention_band: item.attention_band,
      count: 1,
      engagement_ids: [item.engagement_id],
      highest_score: item.score,
    })
  }

  return [...groups.values()].sort((a, b) => b.highest_score - a.highest_score || b.count - a.count || a.label.localeCompare(b.label))
}

export function buildAttentionSummary(decisions: DecisionSignal[]): AttentionSummary {
  const items = buildExceptionItems(decisions)
  const groups = compressExceptions(items)
  const byBand = (band: AttentionBand) => groups.filter((group) => group.attention_band === band)

  return {
    now: byBand('NOW'),
    delegated: byBand('DELEGATED'),
    watching: byBand('WATCHING'),
    handled: byBand('HANDLED'),
    greg_now_count: groups
      .filter((group) => group.attention_band === 'NOW' && group.owner === 'GREG')
      .reduce((sum, group) => sum + group.count, 0),
    total_raw_gaps: items.length,
    compressed_groups: groups.length,
  }
}

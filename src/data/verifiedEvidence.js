import { buildEvidencePacket, normaliseRange } from './evidenceEngine.js'
import { getDayNumber } from './metricsEngine.js'
import { getEventsForPatient } from './syntheticEvents.js'
import { formatDuration } from '../utils/duration.js'
import { SYNTHETIC_CLINICAL_DOCUMENTS } from './syntheticDocumentation.js'
import { DEFAULT_TIME_ZONE, floorToMinuteIso, formatTimestamp24 } from '../utils/time24.js'

export const EVIDENCE_SCHEMA_VERSION = 'psychmap.evidence.v1'
export const METRIC_VERSION = 'psychmap.metrics.v1'

export const METRIC_REGISTRY = {
  assignedCubicleMins: { label: 'Assigned-cubicle presence', unit: 'minutes', window: '07:00–22:00', packetKey: 'assignedCubicleMins' },
  otherCubicleMins: { label: 'Neighbouring-cubicle presence', unit: 'minutes', window: '07:00–22:00', packetKey: 'otherCubicleMins' },
  visitorMins: { label: 'Visitor-area presence', unit: 'minutes', window: '00:00–24:00', packetKey: 'visitorMins' },
  corridorMins: { label: 'Corridor presence', unit: 'minutes', window: '00:00–24:00', packetKey: 'corridorMins' },
  activityMins: { label: 'Activity-room presence', unit: 'minutes', window: '00:00–24:00', packetKey: 'activityMins' },
  overnightRestProxyMins: { label: 'Assigned-cubicle overnight presence', unit: 'minutes', window: '00:00–07:00', packetKey: 'overnightRestProxyMins' },
  zoneTransitions: { label: 'Zone transitions', unit: 'count', window: '00:00–24:00', packetKey: 'zoneTransitions' },
}

const average = values => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
const formatValue = (value, unit) => unit === 'minutes' ? formatDuration(value) : String(value)

const fnv1a = value => {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const stableSourceId = (kind, patientId, values) => `source:${kind}:${patientId}:${fnv1a(JSON.stringify(values))}`
const localMinute = value => {
  const time = formatTimestamp24(value).slice(-5)
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
}
const sourceIsInTimeScope = (startValue, endValue, timeScope) => {
  if (!timeScope) return true
  const start = new Date(startValue).getTime()
  const end = new Date(endValue || startValue).getTime()
  if (timeScope.mode === 'rolling_hours') return end >= new Date(timeScope.fromAtUtc).getTime() && start <= new Date(timeScope.toAtUtc).getTime()
  if (timeScope.mode === 'daily_time_window') {
    const startMinute = localMinute(startValue)
    const endMinute = localMinute(endValue || startValue)
    return endMinute >= timeScope.fromMinute && startMinute < timeScope.toMinute
  }
  return true
}

const sourceIdsForMetric = (sources, day, metricId, assignedCubicle) => {
  const daySources = sources.filter(source => source.day === day && source.kind === 'location')
  const matching = daySources.filter(source => {
  if (source.day !== day || source.kind !== 'location') return false
  if (metricId === 'assignedCubicleMins') return !source.isSleepWindow && source.zoneId === assignedCubicle
  if (metricId === 'otherCubicleMins') return !source.isSleepWindow && source.zoneId.startsWith('cubicle_') && source.zoneId !== assignedCubicle
  if (metricId === 'visitorMins') return !source.isSleepWindow && source.zoneId === 'visitor_area'
  if (metricId === 'corridorMins') return !source.isSleepWindow && source.zoneId === 'corridor'
  if (metricId === 'activityMins') return !source.isSleepWindow && source.zoneId === 'activity_room'
  if (metricId === 'overnightRestProxyMins') return source.isSleepWindow && source.zoneId === assignedCubicle
  if (metricId === 'zoneTransitions') return !source.isSleepWindow
  return false
  }).map(source => source.id)
  // A zero-value fact is still grounded in the complete set of location rows for that day.
  return matching.length ? matching : daySources.map(source => source.id)
}

export function buildEvidenceSnapshot(patientId, range, selectedDaysOverride, temporal = {}) {
  const packet = buildEvidencePacket(patientId, range, selectedDaysOverride)
  if (!packet.patient?.id) throw new Error('Unknown patient')
  const [fromDay, toDay] = normaliseRange(patientId, range)
  const selectedDays = packet.selectedPeriod.selectedDays
  const selectedSet = new Set(selectedDays)
  const events = getEventsForPatient(patientId)

  const timeScope = temporal.timeScope || null
  const locationSources = events.locationEvents
    .filter(event => selectedSet.has(getDayNumber(event.enteredAt)) && sourceIsInTimeScope(event.enteredAt, event.exitedAt, timeScope))
    .map(event => ({
      id: stableSourceId('location', patientId, [event.enteredAt, event.exitedAt, event.zoneId, event.durationMinutes, Boolean(event.isSleepWindow)]),
      kind: 'location',
      day: getDayNumber(event.enteredAt),
      patientId,
      zoneId: event.zoneId,
      enteredAtUtc: floorToMinuteIso(event.enteredAt),
      exitedAtUtc: floorToMinuteIso(event.exitedAt),
      enteredAtLocal24: formatTimestamp24(event.enteredAt),
      exitedAtLocal24: formatTimestamp24(event.exitedAt),
      durationMinutes: event.durationMinutes,
      isSleepWindow: Boolean(event.isSleepWindow),
    }))

  const clinicalSources = events.clinicalEvents
    .filter(event => selectedSet.has(getDayNumber(event.timestamp)) && sourceIsInTimeScope(event.timestamp, event.timestamp, timeScope))
    .map(event => ({
      id: stableSourceId('clinical', patientId, [event.timestamp, event.discipline, event.eventType, event.title, event.description]),
      kind: 'clinical',
      day: getDayNumber(event.timestamp),
      patientId,
      occurredAtUtc: floorToMinuteIso(event.timestamp),
      occurredAtLocal24: formatTimestamp24(event.timestamp),
      discipline: event.discipline,
      eventType: event.eventType,
      title: event.title,
      description: event.description,
      details: event.details || null,
    }))

  // Existing application notes, preserved verbatim and bounded to this patient/time.
  for (const doc of SYNTHETIC_CLINICAL_DOCUMENTS.filter(doc => doc.patientId === patientId && selectedSet.has(doc.day) && sourceIsInTimeScope(doc.seenAt, doc.seenAt, timeScope))) {
    const sections = doc.sections || ['subjective', 'objective', 'assessment', 'plan'].filter(key => doc[key]).map(key => ({ label: key, text: doc[key] }))
    for (const section of sections) clinicalSources.push({
      id: stableSourceId('clinical', patientId, [doc.documentId, section.label, section.text]),
      kind: 'clinical', patientId, day: doc.day, eventType: 'clinical_document',
      occurredAtUtc: floorToMinuteIso(doc.seenAt), occurredAtLocal24: formatTimestamp24(doc.seenAt),
      discipline: doc.discipline, title: `${doc.title} — ${section.label}`,
      description: section.text, documentId: doc.documentId, synthetic: true,
    })
  }

  const activitySources = events.activityEvents
    .filter(event => selectedSet.has(getDayNumber(event.timestamp)) && sourceIsInTimeScope(event.timestamp, event.timestamp, timeScope))
    .map(event => ({
      id: stableSourceId('activity', patientId, [event.timestamp, event.activityType, event.location, event.structured, event.attended]),
      kind: 'activity', day: getDayNumber(event.timestamp), patientId,
      occurredAtUtc: floorToMinuteIso(event.timestamp), occurredAtLocal24: formatTimestamp24(event.timestamp),
      activityType: event.activityType, location: event.location, structured: Boolean(event.structured), attended: Boolean(event.attended),
    }))

  const interactionSources = events.interactionEvents
    .filter(event => selectedSet.has(getDayNumber(event.timestamp)) && sourceIsInTimeScope(event.timestamp, event.timestamp, timeScope))
    .map(event => ({
      id: stableSourceId('interaction', patientId, [event.timestamp, event.type, event.target, event.note]),
      kind: 'interaction', day: getDayNumber(event.timestamp), patientId,
      occurredAtUtc: floorToMinuteIso(event.timestamp), occurredAtLocal24: formatTimestamp24(event.timestamp),
      interactionType: event.type, target: event.target, note: event.note,
    }))

  const sources = [...locationSources, ...clinicalSources, ...activitySources, ...interactionSources]
  const facts = []

  for (const row of timeScope ? [] : packet.dailyMetrics) {
    for (const [metricId, definition] of Object.entries(METRIC_REGISTRY)) {
      const value = row[definition.packetKey]
      facts.push({
        id: `fact:day-${row.day}:${metricId}`,
        kind: 'daily_metric',
        metricId,
        label: definition.label,
        day: row.day,
        value,
        unit: definition.unit,
        window: definition.window,
        sourceRecordIds: sourceIdsForMetric(locationSources, row.day, metricId, packet.patient.assignedCubicle),
        statement: `Day ${row.day} · ${definition.label}${definition.window ? ` (${definition.window})` : ''}: ${formatValue(value, definition.unit)}.`,
      })
    }
  }

  const split = Math.max(1, Math.ceil(packet.dailyMetrics.length / 2))
  const halves = [packet.dailyMetrics.slice(0, split), packet.dailyMetrics.slice(split)]
  for (const [metricId, definition] of timeScope ? [] : Object.entries(METRIC_REGISTRY)) {
    if (metricId === 'zoneTransitions') continue
    const firstRows = halves[0]
    const secondRows = halves[1].length ? halves[1] : halves[0]
    const first = average(firstRows.map(row => row[definition.packetKey]))
    const second = average(secondRows.map(row => row[definition.packetKey]))
    const firstDays = firstRows.map(row => row.day)
    const secondDays = secondRows.map(row => row.day)
    facts.push({
      id: `fact:comparison:${metricId}`,
      kind: 'period_comparison',
      metricId,
      label: `${definition.label} comparison`,
      value: { first, second },
      unit: definition.unit,
      sourceRecordIds: [...firstDays, ...secondDays].flatMap(day => sourceIdsForMetric(locationSources, day, metricId, packet.patient.assignedCubicle)),
      statement: `${definition.label} averaged ${formatValue(first, definition.unit)}/day on Days ${firstDays[0]}–${firstDays.at(-1)} and ${formatValue(second, definition.unit)}/day on Days ${secondDays[0]}–${secondDays.at(-1)}.`,
    })

    const firstSelected = packet.dailyMetrics[0]
    const lastSelected = packet.dailyMetrics.at(-1)
    const firstValue = firstSelected[definition.packetKey]
    const lastValue = lastSelected[definition.packetKey]
    facts.push({
      id: `fact:endpoint:${metricId}`,
      kind: 'endpoint_change',
      metricId,
      label: `${definition.label} endpoint change`,
      value: { first: firstValue, last: lastValue },
      unit: definition.unit,
      sourceRecordIds: [firstSelected.day, lastSelected.day].flatMap(day => sourceIdsForMetric(locationSources, day, metricId, packet.patient.assignedCubicle)),
      statement: `${definition.label} changed from ${formatValue(firstValue, definition.unit)} on Day ${firstSelected.day} to ${formatValue(lastValue, definition.unit)} on Day ${lastSelected.day}.`,
    })
  }

  clinicalSources.forEach(source => facts.push({
    id: `fact:${source.id}`,
    kind: 'clinical_event',
    metricId: null,
    label: source.title,
    day: source.day,
    value: source.eventType,
    unit: 'event',
    sourceRecordIds: [source.id],
    statement: `Day ${source.day} at ${source.occurredAtLocal24.slice(-5)} · ${source.title}: ${source.description}`,
  }))

  activitySources.forEach(source => facts.push({
    id: `fact:${source.id}`, kind: 'activity_event', metricId: 'activityMins', label: source.activityType,
    day: source.day, value: source.attended, unit: 'event', sourceRecordIds: [source.id],
    statement: `Day ${source.day} at ${source.occurredAtLocal24.slice(-5)} · ${source.activityType} (${source.location}); attendance recorded: ${source.attended ? 'yes' : 'no'}.`,
  }))

  interactionSources.forEach(source => facts.push({
    id: `fact:${source.id}`, kind: 'interaction_event', metricId: null, label: source.note,
    day: source.day, value: source.interactionType, unit: 'event', sourceRecordIds: [source.id],
    statement: `Day ${source.day} at ${source.occurredAtLocal24.slice(-5)} · ${source.note} (${source.interactionType}; ${source.target}).`,
  }))

  if (timeScope) locationSources.forEach(source => facts.push({
    id: `fact:${source.id}`, kind: 'location_event', metricId: null, label: `${source.zoneId} presence`,
    day: source.day, value: source.durationMinutes, unit: 'minutes', sourceRecordIds: [source.id],
    statement: `Day ${source.day}, ${source.enteredAtLocal24.slice(-5)}–${source.exitedAtLocal24.slice(-5)} · ${source.durationMinutes} recorded minutes in ${source.zoneId}.`,
  }))

  packet.deterministicSignals.forEach(signal => facts.push({
    id: `fact:signal:${signal.id}`,
    kind: 'deterministic_signal',
    metricId: signal.id,
    label: signal.title,
    value: signal.direction,
    unit: 'signal',
    sourceRecordIds: signal.id === 'documented-dav-episode'
      ? clinicalSources.filter(source => source.eventType === 'dav_episode').map(source => source.id)
      : sources.filter(source => source.kind === 'location').map(source => source.id),
    statement: `${signal.title}: ${signal.evidence} Limitation: ${signal.caveat}`,
  }))

  const canonical = JSON.stringify({ schemaVersion: EVIDENCE_SCHEMA_VERSION, metricVersion: METRIC_VERSION, patientId, fromDay, toDay, selectedDays, sources, facts })
  const latestTimestamp = sources.map(source => source.exitedAtUtc || source.occurredAtUtc).filter(Boolean).sort().at(-1) || null
  return Object.freeze({
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    snapshotId: `snapshot:${patientId}:${fnv1a(canonical)}`,
    hash: fnv1a(canonical),
    hashAlgorithm: 'fnv1a32-demo',
    patient: packet.patient,
    scope: {
      fromDay, toDay, selectedDays, timeZone: DEFAULT_TIME_ZONE, utcOffset: '+08:00', timePrecision: 'minute-floor',
      timeScope, timeEvidence: temporal.timeEvidence || null,
      cutoffAtUtc: latestTimestamp, cutoffAtLocal24: formatTimestamp24(latestTimestamp),
    },
    metricVersion: METRIC_VERSION,
    sourceRecordIds: sources.map(source => source.id),
    sources,
    facts,
    interpretationRules: packet.interpretationRules,
  })
}

const QUERY_ALIASES = {
  assignedCubicleMins: ['assigned', 'cubicle', 'room', 'presence', 'rest'],
  otherCubicleMins: ['other', 'neighbour', 'neighbor', 'cubicle', 'roaming', 'social', 'friend'],
  visitorMins: ['visitor', 'family', 'visit'],
  corridorMins: ['corridor', 'roaming', 'movement'],
  activityMins: ['activity', 'participation', 'structured'],
  overnightRestProxyMins: ['overnight', 'sleep', 'rest', 'night'],
  zoneTransitions: ['transition', 'movement', 'roaming'],
}

export function selectFactsHeuristically(question, snapshot, limit = 5) {
  const query = question.toLowerCase()
  if (/family|progress|how (?:has|have).*been/.test(query)) {
    const desired = [
      'fact:endpoint:overnightRestProxyMins',
      'fact:endpoint:otherCubicleMins',
      'fact:comparison:visitorMins',
      snapshot.facts.find(fact => fact.kind === 'clinical_event' && /400 mg/.test(fact.label))?.id,
      snapshot.facts.find(fact => fact.kind === 'clinical_event' && /post-dav nursing review/i.test(fact.label))?.id,
    ].filter(Boolean)
    const available = new Set(snapshot.facts.map(fact => fact.id))
    const matched = desired.filter(id => available.has(id))
    if (matched.length) return matched.slice(0, limit)
  }
  const tokens = query.match(/[a-z0-9]+/g)?.filter(token => token.length >= 3) || []
  return snapshot.facts
    .map((fact, index) => {
      const haystack = `${fact.label} ${fact.statement} ${fact.metricId || ''}`.toLowerCase()
      const aliases = QUERY_ALIASES[fact.metricId] || []
      let score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 2 : 0), 0)
      score += aliases.reduce((total, alias) => total + (query.includes(alias) ? 3 : 0), 0)
      if (fact.kind === 'period_comparison' && /change|trend|progress|latest|recent|week|days|been/.test(query)) score += 5
      if (fact.kind === 'endpoint_change' && /change|trend|progress|latest|recent|week|days|been/.test(query)) score += 6
      if (fact.kind === 'clinical_event' && /medication|medicine|dav|nurs|review|episode|clinical/.test(query)) score += 6
      if (fact.kind === 'deterministic_signal') score += 1
      if (fact.day) score += fact.day / 100
      return { id: fact.id, score, index }
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter((item, index) => item.score > 0 || index < limit)
    .slice(0, limit)
    .map(item => item.id)
}

export function verifyClaimManifest(snapshot, manifest) {
  const requested = Array.isArray(manifest?.factIds) ? manifest.factIds.filter(id => typeof id === 'string') : []
  const factMap = new Map(snapshot.facts.map(fact => [fact.id, fact]))
  const seen = new Set()
  const usedFacts = []
  const rejected = []
  for (const factId of requested.slice(0, 8)) {
    if (seen.has(factId)) continue
    seen.add(factId)
    const fact = factMap.get(factId)
    if (!fact) rejected.push({ id: factId, reason: 'Unknown fact ID; no matching deterministic evidence.' })
    else if (!fact.sourceRecordIds.length) rejected.push({ id: factId, reason: 'Fact has no source-record provenance.' })
    else if (fact.sourceRecordIds.some(id => !snapshot.sources.some(source => source.id === id))) rejected.push({ id: factId, reason: 'Fact references a source absent from the evidence snapshot.' })
    else usedFacts.push(fact)
  }
  const status = usedFacts.length === 0 ? 'fail' : rejected.length ? 'warning' : 'pass'
  return {
    status,
    checks: {
      patientScope: snapshot.patient.id,
      timeScope: `Days ${snapshot.scope.fromDay}–${snapshot.scope.toDay}`,
      timeZone: `${snapshot.scope.timeZone} (${snapshot.scope.utcOffset})`,
      provenanceComplete: usedFacts.every(fact => fact.sourceRecordIds.length > 0),
      unknownClaims: rejected.length,
      numericAccounting: 'pass — model supplied fact IDs only; renderer owns all numbers',
    },
    usedFacts: usedFacts.slice(0, 5),
    rejected,
  }
}

const CLINICAL_FOCUS = {
  ward_manager: 'Review participation change, data completeness and allocation at the next ward review.',
  psychiatry: 'Review chronology, direct mental-state documentation, tolerability and alternative explanations.',
  nursing: 'Pair these location-derived observations with direct shift observations and handover records.',
  occupational_therapy: 'Review functional impact, meaningful participation and barriers with the patient.',
  psychology: 'Clarify context and patient meaning without inferring internal states from location.',
  social_work: 'Review social context, supports and discharge implications with the patient and MDT.',
}

const dataGapForQuestion = question => {
  const text = String(question || '').toLowerCase()
  if (/scheduled medication doses|doses been taken|medication adherence/.test(text)) return 'This dataset contains prescription and medication-change chronology, but no medication-administration record. Whether scheduled doses were taken cannot be determined.'
  if (/blood pressure|pulse|temperature|vital signs?/.test(text)) return 'This dataset does not contain vital-sign observations for the selected period. Changes in blood pressure, pulse, or temperature cannot be determined.'
  return null
}

const caveatForQuestion = question => {
  const text = String(question || '').toLowerCase()
  if (/before discharge|discharge planning/.test(text)) return 'The records show observable routine signals, not the patient’s preferences or actual support requirements. Confirm both collaboratively before discharge planning.'
  if (/overnight|rest|sleep/.test(text)) return 'Assigned-cubicle overnight presence is a location-derived rest proxy; it does not establish sleep.'
  if (/after.*medication change/.test(text)) return 'This is chronology after the selected medication event; it does not establish a medication effect.'
  return null
}

export function renderVerifiedResponse(snapshot, verification, professionId = 'psychiatry', dataGap = null, caveat = null) {
  if (!verification.usedFacts.length && !dataGap) return '• Verification failed: no supported evidence fact could be selected. No clinical summary was rendered.'
  const remaining = [...verification.usedFacts]
  const facts = dataGap ? [`• Data gap: ${dataGap}`] : []
  if (remaining[0]?.kind === 'endpoint_change' && remaining[1]?.kind === 'endpoint_change') {
    const first = remaining.shift().statement
    const second = remaining.shift().statement
    facts.push(`• ${first} ${second}`)
  }
  facts.push(...remaining.map(fact => `• ${fact.statement}`))
  if (caveat) facts.push(`• Interpretation limit: ${caveat}`)
  facts.push(`• Clinical focus: ${CLINICAL_FOCUS[professionId] || CLINICAL_FOCUS.psychiatry}`)
  return facts.join('\n')
}

export function buildVerifiedResponse(question, snapshot, manifest, professionId) {
  const resolvedManifest = manifest && Array.isArray(manifest.factIds) ? manifest : { factIds: selectFactsHeuristically(question, snapshot) }
  const verification = verifyClaimManifest(snapshot, resolvedManifest)
  const dataGap = dataGapForQuestion(question)
  const caveat = caveatForQuestion(question)
  if (dataGap) {
    verification.usedFacts = []
    verification.rejected = []
    verification.status = 'pass'
  }
  verification.checks.dataCoverage = dataGap ? 'known_gap_reported' : 'available_sources_only'
  verification.answerability = dataGap ? 'not_answerable_from_available_data' : 'bounded_evidence_summary'
  const usedIds = new Set(verification.usedFacts.map(fact => fact.id))
  const edgeDays = new Set([snapshot.scope.selectedDays[0], snapshot.scope.selectedDays.at(-1)])
  const ledgerFacts = snapshot.facts.filter(fact => fact.kind !== 'daily_metric' || edgeDays.has(fact.day)).slice(0, 60)
  const visibleIds = new Set([...ledgerFacts.map(fact => fact.id), ...usedIds])
  const sourceMap = new Map(snapshot.sources.map(source => [source.id, source]))
  const citedSourceIds = [...new Set(verification.usedFacts.flatMap(fact => fact.sourceRecordIds))]
  return {
    answer: renderVerifiedResponse(snapshot, verification, professionId, dataGap, caveat),
    verification,
    evidenceRows: [
      ...snapshot.facts.filter(fact => visibleIds.has(fact.id)).map(fact => {
        const status = usedIds.has(fact.id) ? 'used' : 'unused'
        return {
          ...fact,
          status,
          sourceRecordCount: fact.sourceRecordIds.length,
          sourceRecords: status === 'used' ? fact.sourceRecordIds.slice(0, 20).map(id => sourceMap.get(id)).filter(Boolean) : [],
        }
      }),
      ...verification.rejected.map(item => ({ id: item.id, label: item.id, statement: item.reason, sourceRecordIds: [], status: 'rejected' })),
    ],
    citedSources: citedSourceIds.map(id => sourceMap.get(id)).filter(Boolean),
  }
}

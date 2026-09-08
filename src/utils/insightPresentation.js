const stripBullet = value => String(value || '').replace(/^\s*[•*-]\s*/, '').trim()

const REGION_LABELS = [
  [/assigned[- ]cubicle overnight|overnight rest/i, 'Overnight rest'],
  [/assigned[- ]cubicle|home cubicle/i, 'Assigned cubicle'],
  [/other|neighbou?r(?:ing)?[- ]cubicle/i, 'Other cubicles'],
  [/activity[- ]room|activity room/i, 'Activity room'],
  [/visitor[- ]area|visitor area/i, 'Visitor area'],
  [/dining[- ]area|dining area/i, 'Dining area'],
  [/corridor/i, 'Corridor'],
  [/balcony/i, 'Balcony'],
  [/shower|ensuite/i, 'Shower area'],
  [/toilet/i, 'Toilet'],
  [/blood pressure|systolic|diastolic/i, 'Blood pressure'],
  [/heart rate|pulse/i, 'Heart rate'],
  [/medication|dose|risperidone|sertraline|quetiapine/i, 'Medication'],
  [/dav|aggress|violen|incident/i, 'Documented event'],
  [/participation|occupational/i, 'Participation'],
]

export const inferInsightRegion = statement => REGION_LABELS.find(([pattern]) => pattern.test(statement))?.[1] || 'Clinical context'

export function parseInsightAnswer(answer) {
  const lines = String(answer || '').split('\n').map(stripBullet).filter(Boolean)
  const result = { changes: [], context: [], cautions: [], clinicalFocus: [] }

  for (const line of lines) {
    if (/^(clinical focus|review focus|next step):/i.test(line)) {
      result.clinicalFocus.push(line.replace(/^[^:]+:\s*/i, ''))
      continue
    }
    if (/^(interpretation limit|limitation|data gap|caution):/i.test(line)) {
      result.cautions.push(line.replace(/^[^:]+:\s*/i, ''))
      continue
    }

    const changed = line.match(/^(.+?) changed from (.+?) on (Day \d+) to (.+?) on (Day \d+)\.?$/i)
    if (changed) {
      result.changes.push({ region: inferInsightRegion(changed[1]), label: changed[1], fromValue: changed[2], fromPeriod: changed[3], toValue: changed[4], toPeriod: changed[5] })
      continue
    }

    const averaged = line.match(/^(.+?) averaged (.+?) on (Days? [\d–-]+) and (.+?) on (Days? [\d–-]+)\.?$/i)
    if (averaged) {
      result.changes.push({ region: inferInsightRegion(averaged[1]), label: averaged[1], fromValue: averaged[2], fromPeriod: averaged[3], toValue: averaged[4], toPeriod: averaged[5] })
      continue
    }

    result.context.push({ region: inferInsightRegion(line), text: line })
  }

  return result
}

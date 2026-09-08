import test from 'node:test'
import assert from 'node:assert/strict'
import { inferInsightRegion, parseInsightAnswer } from '../src/utils/insightPresentation.js'

test('groups verified prose into compact region change cards', () => {
  const result = parseInsightAnswer(`• Activity-room presence changed from 0 min on Day 3 to 2h 15m on Day 7.
• Visitor-area presence averaged 10 min/day on Days 3–5 and 45 min/day on Days 6–7.
• Clinical focus: Review participation with the treating MDT.
• Limitation: Location presence does not establish activity.`)

  assert.deepEqual(result.changes[0], {
    region: 'Activity room', label: 'Activity-room presence', fromValue: '0 min', fromPeriod: 'Day 3', toValue: '2h 15m', toPeriod: 'Day 7',
  })
  assert.equal(result.changes[1].region, 'Visitor area')
  assert.deepEqual(result.clinicalFocus, ['Review participation with the treating MDT.'])
  assert.deepEqual(result.cautions, ['Location presence does not establish activity.'])
})

test('labels unstructured facts by the most relevant region', () => {
  assert.equal(inferInsightRegion('Assigned-cubicle overnight presence reduced.'), 'Overnight rest')
  assert.equal(inferInsightRegion('Risperidone dose reviewed.'), 'Medication')
  assert.equal(inferInsightRegion('A general observation was recorded.'), 'Clinical context')
})

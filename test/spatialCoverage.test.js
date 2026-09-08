import test from 'node:test'
import assert from 'node:assert/strict'
import { computeDailyMetrics } from '../src/data/metricsEngine.js'
import { applyLayerVisibility, MINUTES_PER_DAY, SPATIAL_LAYER_SERIES, to24HourLayerRow } from '../src/data/spatialCoverage.js'

test('layered location mode preserves a truthful flat 24-hour total', () => {
  for (const patientId of ['PT-001', 'PT-002', 'PT-003']) {
    const rows = computeDailyMetrics(patientId).map(to24HourLayerRow)
    assert.ok(rows.length > 0)
    for (const row of rows) {
      assert.equal(row.coverageOverflowMins, 0)
      assert.equal(SPATIAL_LAYER_SERIES.reduce((sum, layer) => sum + row[layer.key], 0), MINUTES_PER_DAY)
    }

    const visibility = Object.fromEntries(SPATIAL_LAYER_SERIES.map(layer => [layer.key, !['activityMins', 'diningMins'].includes(layer.key)]))
    for (const row of rows.map(item => applyLayerVisibility(item, visibility))) {
      const visibleTotal = SPATIAL_LAYER_SERIES.reduce((sum, layer) => sum + row[layer.key], 0)
      assert.equal(visibleTotal + row.hiddenLayerMins, MINUTES_PER_DAY)
    }
  }
})

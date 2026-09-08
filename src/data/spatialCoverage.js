export const MINUTES_PER_DAY = 24 * 60

export const SPATIAL_LAYER_SERIES = [
  { key: 'assigned24hMins', label: 'Assigned cubicle', color: '#475569' },
  { key: 'otherCubicleMins', label: 'Other cubicles', color: '#be185d' },
  { key: 'diningMins', label: 'Dining area', color: '#c2410c' },
  { key: 'activityMins', label: 'Activity room', color: '#047857' },
  { key: 'balconyMins', label: 'Balcony', color: '#4d7c0f' },
  { key: 'visitorMins', label: 'Visitor area', color: '#0f766e' },
  { key: 'corridorMins', label: 'Corridor', color: '#4338ca' },
  { key: 'ensuiteMins', label: 'Shower', color: '#0284c7' },
  { key: 'toiletMins', label: 'Toilet', color: '#7c3aed' },
  { key: 'overnightAwayMins', label: 'Other area overnight', color: '#a16207' },
  { key: 'otherRecordedMins', label: 'Other recorded area', color: '#64748b' },
  { key: 'unrecordedMins', label: 'Unrecorded', color: '#dbe2ea' },
]

const minutes = input => Number.isFinite(Number(input)) ? Number(input) : 0

export function to24HourLayerRow(row) {
  const layers = {
    assigned24hMins: minutes(row.homeCubicleMins) + minutes(row.sleepWindowMins),
    otherCubicleMins: minutes(row.otherCubicleMins),
    diningMins: minutes(row.diningMins),
    activityMins: minutes(row.activityMins),
    balconyMins: minutes(row.balconyMins),
    visitorMins: minutes(row.visitorMins),
    corridorMins: minutes(row.corridorMins),
    ensuiteMins: minutes(row.ensuiteMins),
    toiletMins: minutes(row.toiletMins),
    overnightAwayMins: minutes(row.overnightAwayMins),
    otherRecordedMins: minutes(row.staffZoneMins) + minutes(row.quietMins),
  }
  const recordedMins = Object.values(layers).reduce((sum, value) => sum + value, 0)
  return {
    ...row,
    ...layers,
    recordedMins,
    unrecordedMins: Math.max(0, MINUTES_PER_DAY - recordedMins),
    coveragePct: Math.round(recordedMins / MINUTES_PER_DAY * 100),
    coverageOverflowMins: Math.max(0, recordedMins - MINUTES_PER_DAY),
  }
}

export function applyLayerVisibility(row, visibleKeys) {
  let hiddenLayerMins = 0
  const result = { ...row }
  for (const key of Object.keys(visibleKeys)) {
    if (!visibleKeys[key]) {
      hiddenLayerMins += minutes(result[key])
      result[key] = 0
    }
  }
  return { ...result, hiddenLayerMins }
}

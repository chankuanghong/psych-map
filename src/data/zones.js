// Ward 4B spatial model reconstructed from the labelled owner-provided sketch.
// Coordinates share one 760 × 840 SVG viewBox. Patient-accessible shapes are disjoint.

const room = (id, name, shortName, type, shape, label, extra = {}) => ({
  id, name, shortName, type, shape, label, ...extra,
})

export const ZONES = [
  room('cubicle_4', 'Cubicle #4', 'Cubicle #4', 'cubicle',
    { kind: 'rect', x: 258, y: 54, width: 112, height: 96, rx: 4 }, { x: 314, y: 104 }),
  room('cubicle_2', 'Cubicle #2', 'Cubicle #2', 'cubicle',
    { kind: 'rect', x: 258, y: 236, width: 112, height: 100, rx: 4 }, { x: 314, y: 286 }),
  room('cubicle_3', 'Cubicle #3', 'Cubicle #3', 'cubicle',
    { kind: 'rect', x: 440, y: 142, width: 122, height: 94, rx: 4 }, { x: 501, y: 189 }),
  room('cubicle_1', 'Cubicle #1', 'Cubicle #1', 'assigned_cubicle',
    { kind: 'rect', x: 440, y: 236, width: 122, height: 100, rx: 4 }, { x: 501, y: 286 }, { assigned: true }),

  room('sink', 'Sink / Brush Teeth', 'Sink', 'routine',
    { kind: 'rect', x: 440, y: 30, width: 122, height: 34, rx: 3 }, { x: 501, y: 49 }),
  room('upper_toilet', 'Upper Toilet', 'Toilet', 'routine',
    { kind: 'rect', x: 440, y: 64, width: 42, height: 76, rx: 3 }, { x: 461, y: 103 }),
  room('shower_1', 'Shower 1', 'S1', 'routine',
    { kind: 'rect', x: 482, y: 64, width: 27, height: 76, rx: 2 }, { x: 495.5, y: 103 }),
  room('shower_2', 'Shower 2', 'S2', 'routine',
    { kind: 'rect', x: 509, y: 64, width: 27, height: 76, rx: 2 }, { x: 522.5, y: 103 }),
  room('shower_3', 'Shower 3', 'S3', 'routine',
    { kind: 'rect', x: 536, y: 64, width: 26, height: 76, rx: 2 }, { x: 549, y: 103 }),

  room('corridor', 'Main Corridor', 'Corridor', 'transitional',
    { kind: 'path', d: 'M370 30 H440 V336 H466 V386 H440 V596 H414 V650 H370 Z' },
    { x: 405, y: 435, rotate: -90 }),
  room('activity_room', 'Activity Room', 'Activity', 'structured',
    { kind: 'rect', x: 258, y: 430, width: 112, height: 150, rx: 3 }, { x: 314, y: 505 }),
  room('balcony', 'Balcony', 'Balcony', 'shared',
    { kind: 'path', d: 'M54 430 H258 V580 H76 Q54 580 54 558 Z' }, { x: 156, y: 505 }),
  room('dining', 'Dining Area', 'Dining Area', 'shared',
    { kind: 'path', d: 'M116 580 H370 V714 H142 Q116 714 116 688 Z' }, { x: 243, y: 650 }),
  room('lower_toilet', 'Dining Area Toilet', 'Toilet', 'routine',
    { kind: 'path', d: 'M38 650 H116 V714 H142 V790 H58 Q38 790 38 770 Z' }, { x: 84, y: 731 }),
  room('visitor_area', 'Visitor Area', 'Visitor Area', 'shared',
    { kind: 'path', d: 'M466 336 H562 V590 H440 V386 H466 Z' }, { x: 512, y: 476 }),
]

// Architectural areas are drawn for orientation but are excluded from patient heat data.
export const ARCHITECTURAL_AREAS = [
  room('nursing_counter', 'Nursing Counter', 'Nursing Counter', 'out_of_bounds',
    { kind: 'rect', x: 258, y: 150, width: 112, height: 86, rx: 4 }, { x: 314, y: 187 }, { note: 'Out of bounds to patients' }),
  room('medication_counter', 'Medication Counter', 'Medication', 'out_of_bounds',
    { kind: 'rect', x: 208, y: 212, width: 50, height: 48, rx: 3 }, { x: 233, y: 237 }, { note: 'Out of bounds to patients' }),
  room('consult_room', 'Consult Room', 'Consult Room', 'out_of_bounds',
    { kind: 'rect', x: 258, y: 336, width: 112, height: 94, rx: 3 }, { x: 314, y: 379 }, { note: 'Out of bounds except during supervised consultation' }),
]

export const WARD_BOUNDARIES = [
  { id: 'upper-ward', d: 'M244 18 H578 V350 H466 V386 H440 V336 H244 Z', label: 'CUBICLE & WET AREA', labelPos: { x: 411, y: 15 } },
  { id: 'lower-spine', d: 'M244 336 H440 V590 H562 V604 H440 V650 H370 V730 H142 V804 H26 V636 H102 V580 H42 V416 H244 Z', label: 'SHARED & CLINICAL AREAS', labelPos: { x: 238, y: 826 } },
]

export const ENTRANCE = { x: 405, y: 620, label: 'ENTRANCE' }

export const getZoneById = id => ZONES.find(zone => zone.id === id) || ARCHITECTURAL_AREAS.find(zone => zone.id === id)

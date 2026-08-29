// Keep the first member home clear of persistent UI at the smallest supported
// desktop and mobile viewports. These are conservative visual footprints, not
// interaction coordinates: the CSS still owns the rendered size.
export const homeSpots = [
  { x: 72, y: 23 }, { x: 72, y: 21 }, { x: 13, y: 61 }, { x: 76, y: 59 },
  { x: 34, y: 70 }, { x: 55, y: 72 }, { x: 34, y: 15 }, { x: 57, y: 14 },
  { x: 6, y: 39 }, { x: 84, y: 39 }, { x: 23, y: 74 }, { x: 68, y: 76 },
]

const persistentUi = {
  desktop: [
    { left: 0, top: 0, right: 28, bottom: 48 },
    { left: 24, top: 76, right: 76, bottom: 100 },
  ],
  mobile: [
    { left: 0, top: 0, right: 46, bottom: 30 },
    { left: 0, top: 82, right: 100, bottom: 100 },
  ],
}

const footprint = viewport => viewport === 'mobile'
  ? { width: 30, height: 13 }
  : { width: 16, height: 26 }

export function memberHomeIsClearOfPersistentUi(spot, viewport) {
  const size = footprint(viewport)
  const rect = { left: spot.x - size.width / 2, right: spot.x + size.width / 2, top: spot.y - size.height / 2, bottom: spot.y + size.height / 2 }
  return persistentUi[viewport].every(zone => rect.right <= zone.left || rect.left >= zone.right || rect.bottom <= zone.top || rect.top >= zone.bottom)
}

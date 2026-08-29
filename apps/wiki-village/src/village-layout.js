// Keep the first member home clear of persistent UI at the smallest supported
// desktop and mobile viewports. These are conservative visual footprints, not
// interaction coordinates: the CSS still owns the rendered size.
export const homeSpots = [
  { x: 72, y: 23 }, { x: 89, y: 10 }, { x: 89, y: 28 }, { x: 89, y: 44 },
  { x: 89, y: 60 }, { x: 89, y: 74 }, { x: 10, y: 62 }, { x: 28, y: 62 },
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
  const x = spot.x ?? spot.left; const y = spot.y ?? spot.top
  const rect = { left: x - size.width / 2, right: x + size.width / 2, top: y - size.height / 2, bottom: y + size.height / 2 }
  return persistentUi[viewport].every(zone => rect.right <= zone.left || rect.left >= zone.right || rect.bottom <= zone.top || rect.top >= zone.bottom)
}

export function memberHomePosition(index) {
  const spot = homeSpots[index % homeSpots.length]
  const ring = Math.floor(index / homeSpots.length)
  return { left: Math.min(92, spot.x + ring * 2), top: Math.min(78, spot.y + ring * 2) }
}

export const formatDuration = value => {
  const minutes = Math.round(Number(value) || 0)
  if (minutes <= 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

export const formatDurationPerDay = value => `${formatDuration(value)}/day`

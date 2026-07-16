export const GHANA_REGIONS = [
  'Ahafo',
  'Ashanti',
  'Bono',
  'Bono East',
  'Central',
  'Eastern',
  'Greater Accra',
  'North East',
  'Northern',
  'Oti',
  'Savannah',
  'Upper East',
  'Upper West',
  'Volta',
  'Western',
  'Western North',
] as const

export const GHANA_REGION_OPTIONS = GHANA_REGIONS.map((region) => ({
  label: region,
  value: region,
}))

export function canonicalGhanaRegion(value?: string) {
  const trimmedValue = value?.trim() || ''
  if (!trimmedValue) return ''

  return GHANA_REGIONS.find((region) => region.toLowerCase() === trimmedValue.toLowerCase()) || trimmedValue
}

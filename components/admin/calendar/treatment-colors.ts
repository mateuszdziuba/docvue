export interface TreatmentColor {
  solid: string
  wash: string
  softBorder: string
}

const HUES = [345, 18, 35, 52, 95, 130, 160, 185, 210, 235, 265, 295]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function treatmentColor(treatmentId: string | null | undefined): TreatmentColor {
  if (!treatmentId) {
    return {
      solid: 'hsl(20 8% 45%)',
      wash: 'hsl(20 8% 45% / 0.12)',
      softBorder: 'hsl(20 8% 45% / 0.30)',
    }
  }
  const hue = HUES[hashString(treatmentId) % HUES.length]
  return {
    solid: `hsl(${hue} 58% 45%)`,
    wash: `hsl(${hue} 62% 48% / 0.16)`,
    softBorder: `hsl(${hue} 58% 45% / 0.35)`,
  }
}

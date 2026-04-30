export type UnitSystem = 'metric' | 'imperial'

// ── Display ───────────────────────────────────────────────

export function displayWeight(grams: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const totalOz = grams / 28.3495
    const lbs = Math.floor(totalOz / 16)
    const oz = Math.round(totalOz % 16)
    const correctedOz = oz === 16 ? 0 : oz
    const correctedLbs = oz === 16 ? lbs + 1 : lbs
    return correctedLbs > 0 ? `${correctedLbs} lbs ${correctedOz} oz` : `${correctedOz} oz`
  }
  return `${(grams / 1000).toFixed(2)} kg`
}

export function displayLength(cm: number, system: UnitSystem): string {
  if (system === 'imperial') return `${(cm / 2.54).toFixed(1)} in`
  return `${cm} cm`
}

// ── Input → stored value ──────────────────────────────────

export function weightToGrams(userValue: number, system: UnitSystem): number {
  return system === 'imperial' ? userValue * 453.592 : userValue * 1000
}

export function lengthToCm(userValue: number, system: UnitSystem): number {
  return system === 'imperial' ? userValue * 2.54 : userValue
}

// ── Stored value → input default ─────────────────────────

export function gramsToInputValue(grams: number, system: UnitSystem): number {
  return system === 'imperial' ? +(grams / 453.592).toFixed(2) : +(grams / 1000).toFixed(2)
}

export function cmToInputValue(cm: number, system: UnitSystem): number {
  return system === 'imperial' ? +(cm / 2.54).toFixed(1) : cm
}

// ── Form helpers ──────────────────────────────────────────

export function weightLabel(system: UnitSystem) { return system === 'imperial' ? 'Weight (lbs)' : 'Weight (kg)' }
export function lengthLabel(system: UnitSystem) { return system === 'imperial' ? 'Length (in)' : 'Length (cm)' }
export function headCircLabel(system: UnitSystem) { return system === 'imperial' ? 'Head (in)' : 'Head (cm)' }
export function weightStep(system: UnitSystem) { return system === 'imperial' ? '0.1' : '0.01' }
export function lengthStep(_system: UnitSystem) { return '0.1' }
export function weightPlaceholder(system: UnitSystem) { return system === 'imperial' ? 'e.g. 9.5' : 'e.g. 4.2' }
export function lengthPlaceholder(system: UnitSystem) { return system === 'imperial' ? 'e.g. 21.5' : 'e.g. 55' }
export function headCircPlaceholder(system: UnitSystem) { return system === 'imperial' ? 'e.g. 14.5' : 'e.g. 37' }

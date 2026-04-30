import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '../lib/api'
import type { UnitSystem } from '../lib/units'

interface UnitsContextValue {
  unitSystem: UnitSystem
  streamEnabled: boolean
  setUnitSystem: (s: UnitSystem) => void
  setStreamEnabled: (v: boolean) => void
}

const UnitsContext = createContext<UnitsContextValue>({
  unitSystem: 'metric',
  streamEnabled: false,
  setUnitSystem: () => {},
  setStreamEnabled: () => {},
})

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric')
  const [streamEnabled, setStreamEnabled] = useState(false)

  useEffect(() => {
    api.settings.get()
      .then(s => {
        setUnitSystem((s.unitSystem as UnitSystem) ?? 'metric')
        setStreamEnabled(s.streamEnabled ?? false)
      })
      .catch(() => {})
  }, [])

  return (
    <UnitsContext.Provider value={{ unitSystem, streamEnabled, setUnitSystem, setStreamEnabled }}>
      {children}
    </UnitsContext.Provider>
  )
}

export function useUnits() {
  return useContext(UnitsContext)
}

import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
const UnitsContext = createContext({
    unitSystem: 'metric',
    streamEnabled: false,
    setUnitSystem: () => { },
    setStreamEnabled: () => { },
});
export function UnitsProvider({ children }) {
    const [unitSystem, setUnitSystem] = useState('metric');
    const [streamEnabled, setStreamEnabled] = useState(false);
    useEffect(() => {
        api.settings.get()
            .then(s => {
            setUnitSystem(s.unitSystem ?? 'metric');
            setStreamEnabled(s.streamEnabled ?? false);
        })
            .catch(() => { });
    }, []);
    return (_jsx(UnitsContext.Provider, { value: { unitSystem, streamEnabled, setUnitSystem, setStreamEnabled }, children: children }));
}
export function useUnits() {
    return useContext(UnitsContext);
}

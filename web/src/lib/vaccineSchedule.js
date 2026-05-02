export const VACCINE_SCHEDULE = [
    { vaccine: 'HepB', dose: 1, minAgeDays: 0, maxAgeDays: 3, ageLabel: 'Birth' },
    { vaccine: 'HepB', dose: 2, minAgeDays: 28, maxAgeDays: 60, ageLabel: '1–2 months' },
    { vaccine: 'DTaP', dose: 1, minAgeDays: 60, maxAgeDays: 75, ageLabel: '2 months' },
    { vaccine: 'Hib', dose: 1, minAgeDays: 60, maxAgeDays: 75, ageLabel: '2 months' },
    { vaccine: 'IPV', dose: 1, minAgeDays: 60, maxAgeDays: 75, ageLabel: '2 months' },
    { vaccine: 'PCV', dose: 1, minAgeDays: 60, maxAgeDays: 75, ageLabel: '2 months' },
    { vaccine: 'RV', dose: 1, minAgeDays: 60, maxAgeDays: 75, ageLabel: '2 months' },
    { vaccine: 'DTaP', dose: 2, minAgeDays: 120, maxAgeDays: 135, ageLabel: '4 months' },
    { vaccine: 'Hib', dose: 2, minAgeDays: 120, maxAgeDays: 135, ageLabel: '4 months' },
    { vaccine: 'IPV', dose: 2, minAgeDays: 120, maxAgeDays: 135, ageLabel: '4 months' },
    { vaccine: 'PCV', dose: 2, minAgeDays: 120, maxAgeDays: 135, ageLabel: '4 months' },
    { vaccine: 'RV', dose: 2, minAgeDays: 120, maxAgeDays: 135, ageLabel: '4 months' },
    { vaccine: 'DTaP', dose: 3, minAgeDays: 180, maxAgeDays: 195, ageLabel: '6 months' },
    { vaccine: 'Hib', dose: 3, minAgeDays: 180, maxAgeDays: 195, ageLabel: '6 months' },
    { vaccine: 'IPV', dose: 3, minAgeDays: 180, maxAgeDays: 195, ageLabel: '6 months' },
    { vaccine: 'PCV', dose: 3, minAgeDays: 180, maxAgeDays: 195, ageLabel: '6 months' },
    { vaccine: 'HepB', dose: 3, minAgeDays: 180, maxAgeDays: 195, ageLabel: '6 months' },
    { vaccine: 'Flu', dose: 1, minAgeDays: 180, maxAgeDays: 365, ageLabel: '6 months+' },
    { vaccine: 'MMR', dose: 1, minAgeDays: 365, maxAgeDays: 455, ageLabel: '12–15 months' },
    { vaccine: 'Varicella', dose: 1, minAgeDays: 365, maxAgeDays: 455, ageLabel: '12–15 months' },
    { vaccine: 'HepA', dose: 1, minAgeDays: 365, maxAgeDays: 455, ageLabel: '12–15 months' },
    { vaccine: 'Hib', dose: 4, minAgeDays: 365, maxAgeDays: 455, ageLabel: '12–15 months' },
    { vaccine: 'PCV', dose: 4, minAgeDays: 365, maxAgeDays: 455, ageLabel: '12–15 months' },
    { vaccine: 'DTaP', dose: 4, minAgeDays: 455, maxAgeDays: 548, ageLabel: '15–18 months' },
    { vaccine: 'HepA', dose: 2, minAgeDays: 548, maxAgeDays: 730, ageLabel: '18–24 months' },
    { vaccine: 'DTaP', dose: 5, minAgeDays: 1460, maxAgeDays: 2190, ageLabel: '4–6 years' },
    { vaccine: 'MMR', dose: 2, minAgeDays: 1460, maxAgeDays: 2190, ageLabel: '4–6 years' },
    { vaccine: 'Varicella', dose: 2, minAgeDays: 1460, maxAgeDays: 2190, ageLabel: '4–6 years' },
    { vaccine: 'IPV', dose: 4, minAgeDays: 1460, maxAgeDays: 2190, ageLabel: '4–6 years' },
];
export function computeSchedule(dob, loggedVaccines) {
    const dobDate = new Date(dob);
    const now = new Date();
    const soon = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
    return VACCINE_SCHEDULE.map(entry => {
        const dueDate = new Date(dobDate.getTime() + entry.minAgeDays * 24 * 60 * 60 * 1000);
        const overdueDate = new Date(dobDate.getTime() + entry.maxAgeDays * 24 * 60 * 60 * 1000);
        const isComplete = loggedVaccines.some(v => v.vaccineName.toLowerCase() === entry.vaccine.toLowerCase() && v.doseNumber === entry.dose);
        let status;
        if (isComplete) {
            status = 'complete';
        }
        else if (now > overdueDate) {
            status = 'overdue';
        }
        else if (now >= dueDate || dueDate <= soon) {
            status = 'due';
        }
        else {
            status = 'upcoming';
        }
        return { ...entry, status, dueDate };
    });
}

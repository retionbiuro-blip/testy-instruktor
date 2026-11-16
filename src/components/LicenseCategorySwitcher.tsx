import { Car } from 'lucide-react';
import { LicenseCategoryFilter, Question } from '../types';

interface LicenseCategorySwitcherProps {
  questions: Question[];
  value: LicenseCategoryFilter;
  onChange: (next: LicenseCategoryFilter) => void;
  compact?: boolean;
}

const BASE_TABS: { key: LicenseCategoryFilter; label: string }[] = [
  { key: 'B', label: 'Kat. B' },
  { key: 'A', label: 'Kat. A' },
  { key: 'C', label: 'Kat. C' },
  { key: 'D', label: 'Kat. D' },
  { key: 'T', label: 'Kat. T' }
];

export function LicenseCategorySwitcher({
  questions,
  value,
  onChange,
  compact = false
}: LicenseCategorySwitcherProps) {
  const hasTramQuestions = questions.some((q) => q.licenseCategory === 'TRAM');
  const tabs: { key: LicenseCategoryFilter; label: string }[] = [
    ...BASE_TABS,
    ...(hasTramQuestions ? [{ key: 'TRAM' as const, label: 'Tramwaj' }] : []),
    { key: 'ALL_LICENSES', label: 'Wszystkie' }
  ];

  return (
    <div
      role="region"
      aria-label="Wybór kategorii prawa jazdy"
      className={
        compact
          ? 'flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800'
          : 'flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900'
      }
    >
      {!compact && (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400">
            <Car className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Kategoria prawa jazdy
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Pytania wspólne (np. dydaktyka, psychologia) wchodzą w skład każdej kategorii.
            </p>
          </div>
        </div>
      )}

      <div
        className={
          compact
            ? 'flex flex-wrap items-center gap-1'
            : 'flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800'
        }
      >
        {tabs.map((tab) => {
          const isActive = value === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(tab.key)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-700 text-white shadow-sm dark:bg-blue-600'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

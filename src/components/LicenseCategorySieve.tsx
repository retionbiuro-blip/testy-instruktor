import { ArrowLeft, CheckCircle2, Filter, Loader2, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FIRESTORE_BATCH_LIMIT } from '../config';
import { saveQuestionsToCache, setLocalDbVersion } from '../lib/indexedDb';
import {
  LICENSE_CATEGORY_OPTIONS,
  detectSuggestedLicenseCategory,
  formatLicenseCategoryLabel
} from '../lib/questionUtils';
import { batchUpdateQuestionsLicenseCategory } from '../services/firestoreService';
import { LicenseCategory, Question } from '../types';

interface LicenseCategorySieveProps {
  questions: Question[];
  categories: string[];
  onClose: () => void;
  onQuestionsUpdated: (
    nextQuestions: Question[],
    nextCategories: string[],
    nextVersion: number
  ) => void;
}

interface SieveMatchItem {
  question: Question;
  suggested: LicenseCategory;
  matchedKeyword: string;
}

export function LicenseCategorySieve({
  questions,
  categories,
  onClose,
  onQuestionsUpdated
}: LicenseCategorySieveProps) {
  const initialMatches = useMemo<SieveMatchItem[]>(() => {
    const rows: SieveMatchItem[] = [];
    for (const q of questions) {
      const detected = detectSuggestedLicenseCategory(q);
      if (detected) {
        rows.push({
          question: q,
          suggested: detected.suggested,
          matchedKeyword: detected.matchedKeyword
        });
      }
    }
    return rows;
  }, [questions]);

  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const item of initialMatches) {
      // Domyślnie zaznaczamy znalezione pozycje (odznaczamy tylko te, które już mają dokładnie tę kategorię)
      map[item.question.id] = item.question.licenseCategory !== item.suggested;
    }
    return map;
  });

  const [targetMap, setTargetMap] = useState<Record<string, LicenseCategory>>(() => {
    const map: Record<string, LicenseCategory> = {};
    for (const item of initialMatches) {
      map[item.question.id] = item.suggested;
    }
    return map;
  });

  const [filterSuggested, setFilterSuggested] = useState<'__ALL_MATCHES__' | LicenseCategory>(
    '__ALL_MATCHES__'
  );
  const [hideAlreadyAssigned, setHideAlreadyAssigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const visibleMatches = useMemo(() => {
    return initialMatches.filter((item) => {
      const chosenTarget = targetMap[item.question.id] ?? item.suggested;
      if (filterSuggested !== '__ALL_MATCHES__' && chosenTarget !== filterSuggested) {
        return false;
      }
      if (hideAlreadyAssigned && item.question.licenseCategory === chosenTarget) {
        return false;
      }
      return true;
    });
  }, [initialMatches, targetMap, filterSuggested, hideAlreadyAssigned]);

  const selectedUpdates = useMemo(() => {
    return initialMatches
      .filter((item) => Boolean(selectedMap[item.question.id]))
      .map((item) => ({
        questionId: item.question.id,
        licenseCategory: targetMap[item.question.id] ?? item.suggested
      }));
  }, [initialMatches, selectedMap, targetMap]);

  const countsBySuggested = useMemo(() => {
    const counts: Record<string, number> = { A: 0, C: 0, D: 0, T: 0, TRAM: 0 };
    for (const item of initialMatches) {
      const cat = targetMap[item.question.id] ?? item.suggested;
      if (cat in counts) {
        counts[cat] += 1;
      }
    }
    return counts;
  }, [initialMatches, targetMap]);

  const allVisibleSelected =
    visibleMatches.length > 0 && visibleMatches.every((item) => Boolean(selectedMap[item.question.id]));

  function toggleSelectAllVisible() {
    setSelectedMap((prev) => {
      const next = { ...prev };
      const nextVal = !allVisibleSelected;
      for (const item of visibleMatches) {
        next[item.question.id] = nextVal;
      }
      return next;
    });
  }

  async function handleApplySelected() {
    if (selectedUpdates.length === 0 || saving) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const nextVersion = await batchUpdateQuestionsLicenseCategory(selectedUpdates);
      const updateMap = new Map<string, LicenseCategory>(
        selectedUpdates.map((u) => [u.questionId, u.licenseCategory])
      );
      const nextQuestions = questions.map((q) => {
        const nextLc = updateMap.get(q.id);
        return nextLc ? { ...q, licenseCategory: nextLc } : q;
      });
      await saveQuestionsToCache(nextQuestions);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(nextQuestions, categories, nextVersion);

      setSelectedMap((prev) => {
        const next = { ...prev };
        for (const u of selectedUpdates) {
          next[u.questionId] = false;
        }
        return next;
      });

      setSuccessMsg(
        `Przypisano kategorię prawa jazdy w ${selectedUpdates.length} pytaniach (bez zmiany działów tematycznych ani postępów). Wersja bazy: ${nextVersion}.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Nie udało się zapisać kategorii prawa jazdy.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      {/* Nagłówek narzędzia */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Wróć do pytań</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Sito kategorii prawa jazdy (A / C / D / T / Tramwaj)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Przeskanowano lokalnie {questions.length} pytań po słowach kluczowych. Zapis aktualizuje wyłącznie pole{' '}
              <code className="font-mono">licenseCategory</code> (w paczkach po maks. {FIRESTORE_BATCH_LIMIT}), zachowując działy tematyczne i statystyki kursantów.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={selectedUpdates.length === 0 || saving}
          onClick={() => void handleApplySelected()}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          <span>
            Przypisz zaznaczone do wybranych kategorii prawa jazdy ({selectedUpdates.length})
          </span>
        </button>
      </div>

      {successMsg && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {errorMsg}
        </div>
      )}

      {/* Podsumowanie i filtry */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Znaleziono {initialMatches.length} trafień:
          </span>
          <span className="font-mono text-slate-600 tabular-nums dark:text-slate-400">
            Kat. A: {countsBySuggested.A} · Kat. C: {countsBySuggested.C} · Kat. D: {countsBySuggested.D} · Kat. T: {countsBySuggested.T} · Tramwaj: {countsBySuggested.TRAM}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={hideAlreadyAssigned}
              onChange={(e) => setHideAlreadyAssigned(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-blue-700"
            />
            <span>Ukryj już przypisane zgodnie z wyborem</span>
          </label>

          <select
            aria-label="Filtruj według sugerowanej kategorii prawa jazdy"
            value={filterSuggested}
            onChange={(e) =>
              setFilterSuggested(e.target.value as '__ALL_MATCHES__' | LicenseCategory)
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="__ALL_MATCHES__">Wszystkie trafienia ({initialMatches.length})</option>
            <option value="A">Kat. A</option>
            <option value="C">Kat. C</option>
            <option value="D">Kat. D</option>
            <option value="T">Kat. T</option>
            <option value="TRAM">Tramwaj (TRAM)</option>
            <option value="B">Kat. B</option>
            <option value="ALL">Wspólne (ALL)</option>
          </select>
        </div>
      </div>

      {/* Zbiorcza lista trafień */}
      {visibleMatches.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Brak pytań pasujących do kryteriów sita w tym widoku.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pozostałe pytania bez ustawionego pola domyślnie należą do Kat. B.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="h-4 w-4 rounded border-slate-300 accent-blue-700"
              />
              <span>
                Zaznacz / Odznacz widoczne na liście ({visibleMatches.length})
              </span>
            </label>

            <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
              Zaznaczono do zapisu: {selectedUpdates.length}
            </span>
          </div>

          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {visibleMatches.map((item) => {
              const q = item.question;
              const isChecked = Boolean(selectedMap[q.id]);
              const chosenTarget = targetMap[q.id] ?? item.suggested;
              const alreadyMatches = q.licenseCategory === chosenTarget;

              return (
                <div
                  key={q.id}
                  className={`flex flex-col justify-between gap-4 p-4 transition-colors lg:flex-row lg:items-center ${
                    isChecked ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Zaznacz pytanie: ${q.question.slice(0, 60)}`}
                      checked={isChecked}
                      onChange={(e) =>
                        setSelectedMap((prev) => ({ ...prev, [q.id]: e.target.checked }))
                      }
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-blue-700"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          Dział: {q.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Obecnie:{' '}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {q.licenseCategory ? formatLicenseCategoryLabel(q.licenseCategory) : 'Kat. B (domyślnie)'}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Słowo kluczowe:{' '}
                          <strong className="text-amber-700 dark:text-amber-400">
                            „{item.matchedKeyword}”
                          </strong>
                        </span>
                        {alreadyMatches && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              Już przypisane
                            </span>
                          </>
                        )}
                      </div>

                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {q.question}
                      </p>

                      {q.options.length > 0 && (
                        <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          Odpowiedzi: {q.options.join(' | ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end lg:self-center">
                    <label
                      htmlFor={`sieve-select-${q.id}`}
                      className="text-xs font-medium text-slate-500 dark:text-slate-400"
                    >
                      Przypisz do:
                    </label>
                    <select
                      id={`sieve-select-${q.id}`}
                      value={chosenTarget}
                      onChange={(e) => {
                        const nextVal = e.target.value as LicenseCategory;
                        setTargetMap((prev) => ({ ...prev, [q.id]: nextVal }));
                      }}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      {LICENSE_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

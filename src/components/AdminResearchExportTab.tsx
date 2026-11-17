import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Loader2,
  ShieldAlert,
  Users
} from 'lucide-react';
import { useState } from 'react';
import { RESEARCH_EXCLUDED_EMAILS } from '../config';
import {
  buildAnonymizedStudentsCsv,
  buildQuestionDifficultyCsv,
  downloadUtf8BomCsv
} from '../lib/csvExport';
import {
  fetchAnonymizedStudentResearchData,
  fetchSystemWrongCounts
} from '../services/firestoreService';
import { Question } from '../types';

interface AdminResearchExportTabProps {
  questions: Question[];
}

export function AdminResearchExportTab({ questions }: AdminResearchExportTabProps) {
  const [exportingStudents, setExportingStudents] = useState(false);
  const [exportingQuestions, setExportingQuestions] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function getTodayStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async function handleExportStudentsCsv() {
    if (exportingStudents) return;
    setExportingStudents(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const { rows, totalUsersCount, excludedAccountsCount } =
        await fetchAnonymizedStudentResearchData();
      const csv = buildAnonymizedStudentsCsv(rows);
      const filename = `statystyki_kursantow_anonimowe_${getTodayStamp()}.csv`;
      downloadUtf8BomCsv(filename, csv);
      setStatusMsg(
        `Wygenerowano plik ${filename}. Próba badawcza: ${rows.length} zanonimizowanych kursantów (odczytano łącznie ${totalUsersCount} kont, wykluczono ${excludedAccountsCount} kont autora/testowych).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Nie udało się pobrać i wyeksportować zanonimizowanych statystyk kursantów.'
      );
    } finally {
      setExportingStudents(false);
    }
  }

  async function handleExportQuestionDifficultyCsv() {
    if (exportingQuestions) return;
    setExportingQuestions(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const wrongCounts = await fetchSystemWrongCounts();
      const csv = buildQuestionDifficultyCsv(questions, wrongCounts);
      const filename = `statystyki_trudnosci_pytan_${getTodayStamp()}.csv`;
      downloadUtf8BomCsv(filename, csv);
      const withErrorsCount = questions.filter((q) => (wrongCounts[q.id] ?? 0) > 0).length;
      setStatusMsg(
        `Wygenerowano plik ${filename}. Wyeksportowano ${questions.length} pytań (${withErrorsCount} pytań z odnotowanymi błędami grupy z system/stats).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Nie udało się pobrać statystyk trudności pytań z system/stats.'
      );
    } finally {
      setExportingQuestions(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span>Moduł badawczy (Praca dyplomowa / Excel UTF-8)</span>
          </div>
          <h2 className="font-display mt-1 text-lg font-bold text-slate-900 dark:text-white">
            Eksport oczyszczonych, zanonimizowanych statystyk do CSV
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Pliki generowane są lokalnie w kodowaniu <strong>UTF-8 z BOM (\uFEFF)</strong> i separatorem średnik (<code className="font-mono">;</code>), dzięki czemu polskie znaki oraz podział na kolumny otwierają się automatycznie w polskim programie Microsoft Excel.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Karta 1: Zanonimizowane statystyki kursantów */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400">
                  <Users className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Statystyki kursantów (zanonimizowane)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kody Kursant_01, Kursant_02... bez e-maili, UID i nicków
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">Automatyczne wykluczenie kont autora:</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      Z eksportu bezwzględnie pomijane są konta:{' '}
                      <span className="font-mono font-medium">
                        {RESEARCH_EXCLUDED_EMAILS.join(', ')}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Eksportowane kolumny:
                </p>
                <p className="font-mono mt-1 break-words text-[11px] text-slate-500 dark:text-slate-400">
                  Identyfikator_Anonimowy; Liczba_Rozwiazanych_Odpowiedzi; Poprawne_Odpowiedzi; Skutecznosc_Procent; Opanowane_Pytania; Przeczytane_Lekcje; Zapisane_Konspekty; Dni_Nauki_Z_Rzedu_Streak; Liczba_Podejsc_Do_Egzaminu
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportStudentsCsv}
              disabled={exportingStudents}
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {exportingStudents ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Eksportuj zanonimizowane statystyki kursantów (CSV)</span>
            </button>
          </div>

          {/* Karta 2: Statystyki trudności pytań */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <HelpCircle className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Statystyki trudności pytań grupy
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {questions.length} pytań w bazie + licznik błędów z system/stats
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Eksportuje pełną listę pytań z pamięci lokalnej połączoną z najnowszą mapą{' '}
                <code className="font-mono">wrongCounts</code> z dokumentu{' '}
                <code className="font-mono">system/stats</code> (posortowaną od pytań sprawiających najwięcej trudności).
              </p>

              <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Eksportowane kolumny:
                </p>
                <p className="font-mono mt-1 break-words text-[11px] text-slate-500 dark:text-slate-400">
                  ID_Pytania; Dzial_Tematyczny; Kategoria_Prawa_Jazdy; Tresc_Pytania; Liczba_Bledow_Grupy
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportQuestionDifficultyCsv}
              disabled={exportingQuestions || questions.length === 0}
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {exportingQuestions ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Eksportuj statystyki trudności pytań (CSV)</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {errorMsg}
          </div>
        )}

        {statusMsg && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>
    </section>
  );
}

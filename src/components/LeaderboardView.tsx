import { Award, Flame, Lock, RefreshCw, Trophy } from 'lucide-react';
import { isAdminEmail } from '../config';
import { LeaderboardEntry, UserProgress } from '../types';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  progress: UserProgress;
  isGuest: boolean;
  onRequireAuth: (mode: 'login' | 'register') => void;
  onRefresh: () => void;
  loading: boolean;
}

export function LeaderboardView({
  entries,
  progress,
  isGuest,
  onRequireAuth,
  onRefresh,
  loading
}: LeaderboardViewProps) {
  if (isGuest) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <Lock className="mx-auto h-9 w-9 text-blue-700 dark:text-blue-400" aria-hidden="true" />
        <h1 className="font-display mt-3 text-xl font-bold text-slate-900 dark:text-white">
          Ranking i historia egzaminów wymagają konta
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
          W trybie gościa Twoje punkty i wyniki testów nie są zapisywane. Załóż darmowe konto, aby rywalizować z grupą i śledzić swoją historię.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onRequireAuth('register')}
            className="cursor-pointer rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
          >
            Załóż darmowe konto
          </button>
          <button
            type="button"
            onClick={() => onRequireAuth('login')}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Mam już konto — zaloguj
          </button>
        </div>
      </div>
    );
  }

  const visibleEntries = entries.filter(
    (entry) => !(isAdminEmail(progress.email) && entry.uid === progress.uid)
  );
  const history = [...(progress.examHistory ?? [])].reverse();

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Rywalizacja grupowa · Punkty za poprawne odpowiedzi i egzaminy
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Ranking uczestników kursu
          </h1>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex h-10 cursor-pointer items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Odśwież ranking</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {visibleEntries.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Ranking jest jeszcze pusty. Rozpocznij naukę, aby zdobyć pierwsze punkty!
          </div>
        ) : (
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Miejsce</th>
                <th className="px-4 py-3">Nick kursanta</th>
                <th className="px-4 py-3 text-right">Opanowane pytania</th>
                <th className="px-4 py-3 text-right">Skuteczność</th>
                <th className="px-4 py-3 text-right">Streak</th>
                <th className="px-4 py-3 text-right">Punkty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleEntries.map((entry, idx) => {
                const isSelf = entry.uid === progress.uid;
                return (
                  <tr
                    key={entry.uid}
                    className={
                      isSelf
                        ? 'bg-blue-50/70 font-semibold dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="font-mono px-4 py-3 tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        {idx === 0 && <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />}
                        {idx > 0 && idx < 3 && <Award className="h-4 w-4 text-slate-400" aria-hidden="true" />}
                        <span>{idx + 1}.</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">
                      {entry.nick} {isSelf ? '(Ty)' : ''}
                    </td>
                    <td className="font-mono px-4 py-3 text-right text-slate-700 tabular-nums dark:text-slate-300">
                      {entry.masteredCount}
                    </td>
                    <td className="font-mono px-4 py-3 text-right text-slate-700 tabular-nums dark:text-slate-300">
                      {entry.accuracy}%
                    </td>
                    <td className="font-mono px-4 py-3 text-right text-slate-700 tabular-nums dark:text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        {entry.streakDays}
                      </span>
                    </td>
                    <td className="font-mono px-4 py-3 text-right font-bold text-blue-700 tabular-nums dark:text-blue-400">
                      {entry.points} pkt
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Historia Twoich egzaminów */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Twoja historia egzaminów i Szybkiej 10-tki
        </h2>
        {history.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Nie ukończyłeś jeszcze żadnej symulacji egzaminu ani Szybkiej 10-tki.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Data</th>
                  <th className="px-4 py-2.5">Tryb</th>
                  <th className="px-4 py-2.5">Kategoria</th>
                  <th className="px-4 py-2.5 text-right">Wynik</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono px-4 py-2.5 text-xs text-slate-600 tabular-nums dark:text-slate-400">
                      {new Date(item.dateIso).toLocaleString('pl-PL', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">
                      {item.mode === 'exam' ? 'Egzamin' : 'Szybka 10-tka'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                      {item.category}
                    </td>
                    <td className="font-mono px-4 py-2.5 text-right tabular-nums">
                      {item.score}/{item.total} ({item.percent}%)
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      <span
                        className={
                          item.passed
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }
                      >
                        {item.passed ? 'ZDANY' : 'NIEZDANY'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

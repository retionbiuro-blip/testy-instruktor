import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  MessageSquare,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  clearUserUnreadNotifications,
  fetchUserReports,
  markUserReportsAsRead
} from '../services/firestoreService';
import { ReportItem } from '../types';

interface UserInboxModalProps {
  userId: string;
  unreadCount: number;
  onUnreadCleared: () => void;
  onOpenQuestion: (questionId: string) => void;
  onClose: () => void;
}

export function UserInboxModal({
  userId,
  unreadCount,
  onUnreadCleared,
  onOpenQuestion,
  onClose
}: UserInboxModalProps) {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [newlyReadIds, setNewlyReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function loadInbox() {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchUserReports(userId);
        if (cancelled) return;

        const unreadReportIds = list
          .filter((r) => !r.isReadByUser)
          .map((r) => r.id);

        setNewlyReadIds(unreadReportIds);
        setReports(list.map((r) => ({ ...r, isReadByUser: true })));

        // Otwarcie skrzynki automatycznie zeruje licznik powiadomień i oznacza odpowiedzi jako przeczytane
        const cleanupPromises: Promise<void>[] = [];
        if (unreadCount > 0) {
          cleanupPromises.push(
            clearUserUnreadNotifications(userId).then(() => {
              if (!cancelled) onUnreadCleared();
            })
          );
        }
        if (unreadReportIds.length > 0) {
          cleanupPromises.push(markUserReportsAsRead(unreadReportIds));
        }

        if (cleanupPromises.length > 0) {
          await Promise.all(cleanupPromises);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Błąd pobierania skrzynki zgłoszeń:', err);
          setError('Nie udało się pobrać Twoich zgłoszeń. Spróbuj ponownie za chwilę.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInbox();
    return () => {
      cancelled = true;
    };
  }, [userId, unreadCount, onUnreadCleared]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-inbox-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Nagłówek modala */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
              <Inbox className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="user-inbox-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                Moje zgłoszenia i odpowiedzi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Historia Twoich uwag do pytań oraz odpowiedzi administratora
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij skrzynkę powiadomień"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Zawartość listy zgłoszeń */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-slate-600 dark:text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin text-blue-700 dark:text-blue-400" />
              <p className="mt-3">Ładowanie Twoich zgłoszeń...</p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center">
              <Inbox className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <h3 className="font-display mt-3 text-base font-bold text-slate-900 dark:text-white">
                Brak wysłanych zgłoszeń
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Gdy zauważysz błąd lub niejasność w którymś z pytań i użyjesz przycisku „Zgłoś błąd w pytaniu”, odpowiedź administratora pojawi się właśnie tutaj.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((r) => {
                const isNewReply = newlyReadIds.includes(r.id);
                const isAnswered = r.status === 'resolved';

                return (
                  <article
                    key={r.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isNewReply
                        ? 'border-blue-300 bg-blue-50/25 dark:border-blue-800 dark:bg-blue-950/20'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60'
                    }`}
                  >
                    {/* Górny wiersz: status, kategoria, data */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold ${
                            isAnswered
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                          }`}
                        >
                          {isAnswered ? (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>{isAnswered ? 'Odpowiedziano' : 'Oczekuje'}</span>
                        </span>

                        {isNewReply && (
                          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                            Nowa
                          </span>
                        )}

                        {r.category && (
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            {r.category}
                          </span>
                        )}
                      </div>

                      {r.createdAt && (
                        <span className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                          {r.createdAt.toLocaleString('pl-PL', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </span>
                      )}
                    </div>

                    {/* Treść pytania */}
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Zgłoszone pytanie
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">
                        {r.questionText}
                      </p>
                    </div>

                    {/* Treść zgłoszenia kursanta */}
                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Twoja uwaga:
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        {r.reason}
                      </p>
                    </div>

                    {/* Odpowiedź administratora */}
                    {r.adminReply ? (
                      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/80 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/35">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300">
                            <MessageSquare className="h-4 w-4" aria-hidden="true" />
                            <span>Odpowiedź administratora</span>
                          </span>
                          {r.repliedAt && (
                            <span className="font-mono text-[11px] text-blue-700/80 tabular-nums dark:text-blue-300/80">
                              {r.repliedAt.toLocaleString('pl-PL', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                          {r.adminReply}
                        </p>
                      </div>
                    ) : isAnswered ? (
                      <p className="mt-3 text-xs italic text-emerald-700 dark:text-emerald-400">
                        Zgłoszenie zostało sprawdzone i oznaczone jako załatwione.
                      </p>
                    ) : null}

                    {/* Przycisk przejścia do pytania */}
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenQuestion(r.questionId)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Otwórz to pytanie</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

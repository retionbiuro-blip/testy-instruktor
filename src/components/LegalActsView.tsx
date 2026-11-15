import {
  ArrowLeft,
  BookOpenCheck,
  ExternalLink,
  Eye,
  FileText,
  Lock,
  Scale,
  Search,
  ShieldCheck,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { LegalAct, LegalActType } from '../types';

interface LegalActsViewProps {
  legalActs: LegalAct[];
  isGuest: boolean;
  isAdmin: boolean;
  onRequireAuth: (mode: 'login' | 'register') => void;
  onOpenAdminLegalActs: () => void;
  onBackToDashboard: () => void;
}

const TYPE_LABELS: Record<LegalActType, string> = {
  ustawa: 'Ustawa',
  rozporzadzenie: 'Rozporządzenie',
  inne: 'Inny dokument'
};

const TYPE_BADGE_CLASSES: Record<LegalActType, string> = {
  ustawa:
    'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/80 dark:bg-blue-950/50 dark:text-blue-300',
  rozporzadzenie:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-300',
  inne:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
};

export function extractGoogleDriveFileId(url: string): string | null {
  const match = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i.exec(url);
  return match ? match[1] : null;
}

function getSafeExternalUrl(url: string): string | null {
  const trimmed = url.trim();
  return /^https?:\/\/.+/i.test(trimmed) ? trimmed : null;
}

export function LegalActsView({
  legalActs,
  isGuest,
  isAdmin,
  onRequireAuth,
  onOpenAdminLegalActs,
  onBackToDashboard
}: LegalActsViewProps) {
  const [filterType, setFilterType] = useState<'all' | LegalActType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewAct, setPreviewAct] = useState<{
    act: LegalAct;
    driveFileId: string;
    externalUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!previewAct) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPreviewAct(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewAct]);

  const sortedActs = useMemo(() => {
    return [...legalActs].sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl')
    );
  }, [legalActs]);

  const counts = useMemo(() => {
    return {
      all: sortedActs.length,
      ustawa: sortedActs.filter((a) => a.type === 'ustawa').length,
      rozporzadzenie: sortedActs.filter((a) => a.type === 'rozporzadzenie').length,
      inne: sortedActs.filter((a) => a.type === 'inne').length
    };
  }, [sortedActs]);

  const filteredActs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedActs.filter((act) => {
      if (filterType !== 'all' && act.type !== filterType) return false;
      if (!q) return true;
      return (
        act.title.toLowerCase().includes(q) ||
        act.description.toLowerCase().includes(q) ||
        TYPE_LABELS[act.type].toLowerCase().includes(q)
      );
    });
  }, [sortedActs, filterType, searchQuery]);

  if (isGuest) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Akty prawne
            </p>
            <h1 className="font-display mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Pełne teksty ustaw, rozporządzeń i dokumentów PDF
            </h1>
          </div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Wróć na pulpit</span>
          </button>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Lock className="mx-auto h-9 w-9 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          <h2 className="font-display mt-3 text-lg font-bold text-slate-900 dark:text-white">
            Akty prawne dostępne po zalogowaniu
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Pełne teksty ustaw, rozporządzeń oraz wbudowany podgląd PDF wymagają bezpłatnego konta kursanta.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onRequireAuth('register')}
              className="cursor-pointer rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Załóż darmowe konto
            </button>
            <button
              type="button"
              onClick={() => onRequireAuth('login')}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Zaloguj się
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Nagłówek sekcji */}
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Akty prawne · {sortedActs.length}{' '}
            {sortedActs.length === 1 ? 'dokument' : 'dokumentów'} w pamięci lokalnej
          </p>
          <h1
            style={{ textWrap: 'balance' }}
            className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
          >
            Ustawy, rozporządzenia i dokumenty PDF
          </h1>
        </div>

        <button
          type="button"
          onClick={onBackToDashboard}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-100 sm:self-auto dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Wróć na pulpit</span>
        </button>
      </section>

      {/* Pasek filtrów po typie i lokalna wyszukiwarka */}
      {sortedActs.length > 0 && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div
              role="group"
              aria-label="Filtruj według typu dokumentu"
              className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
            >
              {(
                [
                  { id: 'all', label: 'Wszystkie', count: counts.all },
                  { id: 'ustawa', label: 'Ustawy', count: counts.ustawa },
                  { id: 'rozporzadzenie', label: 'Rozporządzenia', count: counts.rozporzadzenie },
                  { id: 'inne', label: 'Inne dokumenty', count: counts.inne }
                ] as const
              ).map((tab) => {
                const active = filterType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}{' '}
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                      ({tab.count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj aktu prawnego po tytule lub opisie..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-9 pl-9 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Wyczyść wyszukiwanie"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Lista aktów prawnych lub stan pusty */}
      {sortedActs.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Scale className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
          <h2 className="font-display mt-3 text-lg font-bold text-slate-900 dark:text-white">
            Nie dodano jeszcze aktów prawnych
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-300">
            {isAdmin
              ? 'Jesteś zalogowany jako Administrator. Przejdź do zakładki „Akty prawne” w Panelu Admina, aby dodać ustawy, rozporządzenia i dokumenty PDF z Dysku Google lub ISAP.'
              : 'Administrator nie opublikował jeszcze pełnych tekstów aktów prawnych. Zajrzyj tutaj wkrótce lub sprawdź aktualizacje bazy na pulpicie.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminLegalActs}
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Dodaj akty prawne w Panelu Admina</span>
            </button>
          )}
        </section>
      ) : filteredActs.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Brak dokumentów spełniających wybrane filtry lub frazę „{searchQuery}”.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            className="mt-3 cursor-pointer text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
          >
            Pokaż wszystkie dokumenty
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredActs.map((act) => {
            const safeUrl = getSafeExternalUrl(act.url);
            const driveFileId = safeUrl ? extractGoogleDriveFileId(safeUrl) : null;

            return (
              <article
                key={act.id}
                className="flex flex-col justify-between gap-5 rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE_CLASSES[act.type]}`}
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{TYPE_LABELS[act.type]}</span>
                    </span>

                    <span className="font-mono text-xs text-slate-400 tabular-nums dark:text-slate-500">
                      #{String(act.order).padStart(2, '0')}
                    </span>
                  </div>

                  <h2 className="font-display text-base font-bold leading-snug text-slate-900 dark:text-white">
                    {act.title}
                  </h2>

                  {act.description.trim().length > 0 && (
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {act.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  {driveFileId && safeUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewAct({
                          act,
                          driveFileId,
                          externalUrl: safeUrl
                        })
                      }
                      className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      <span>Czytaj na stronie</span>
                    </button>
                  )}

                  {safeUrl ? (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold whitespace-nowrap transition-colors ${
                        driveFileId
                          ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                          : 'bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500'
                      }`}
                    >
                      <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                      <span>Otwórz / Pobierz PDF</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      Nieprawidłowy adres URL dokumentu
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal wbudowanego podglądu PDF (Google Drive iframe preview) */}
      {previewAct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Podgląd dokumentu: ${previewAct.act.title}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPreviewAct(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-xs sm:p-6"
        >
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {TYPE_LABELS[previewAct.act.type]}
                  </span>
                  {previewAct.act.description && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{previewAct.act.description}</span>
                    </>
                  )}
                </div>
                <h2 className="font-display truncate text-sm font-bold text-slate-900 sm:text-base dark:text-white">
                  {previewAct.act.title}
                </h2>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={previewAct.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span>Otwórz w nowej karcie</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAct(null)}
                  aria-label="Zamknij podgląd PDF"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <iframe
              src={`https://drive.google.com/file/d/${previewAct.driveFileId}/preview`}
              title={`Podgląd PDF: ${previewAct.act.title}`}
              className="h-full w-full flex-1 border-0 bg-slate-100 dark:bg-slate-950"
              allow="autoplay"
            />
          </div>
        </div>
      )}
    </div>
  );
}

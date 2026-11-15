import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Info,
  Loader2,
  Plus,
  Scale,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import {
  saveLegalActsToCache,
  setLocalDbVersion,
  setLocalLegalActsDbVersion
} from '../lib/indexedDb';
import {
  deleteAdminLegalAct,
  generateLegalActId,
  saveAdminLegalAct
} from '../services/firestoreService';
import { LegalAct, LegalActType } from '../types';
import { extractGoogleDriveFileId } from './LegalActsView';

interface AdminLegalActsTabProps {
  legalActs: LegalAct[];
  onLegalActsUpdated: (nextActs: LegalAct[], nextVersion: number) => void;
}

const TYPE_LABELS: Record<LegalActType, string> = {
  ustawa: 'Ustawa',
  rozporzadzenie: 'Rozporządzenie',
  inne: 'Inne dokumenty'
};

export function AdminLegalActsTab({
  legalActs,
  onLegalActsUpdated
}: AdminLegalActsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | LegalActType>('all');
  const [editingAct, setEditingAct] = useState<LegalAct | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [savingAct, setSavingAct] = useState(false);
  const [actError, setActError] = useState<string | null>(null);
  const [actStatus, setActStatus] = useState<string | null>(null);
  const [deletingAct, setDeletingAct] = useState<LegalAct | null>(null);
  const [processingDelete, setProcessingDelete] = useState(false);

  const sortedActs = useMemo(() => {
    return [...legalActs].sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl')
    );
  }, [legalActs]);

  const filteredActs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedActs.filter((act) => {
      if (filterType !== 'all' && act.type !== filterType) return false;
      if (!q) return true;
      return (
        act.title.toLowerCase().includes(q) ||
        act.description.toLowerCase().includes(q) ||
        act.url.toLowerCase().includes(q)
      );
    });
  }, [sortedActs, filterType, searchQuery]);

  function openNewActModal() {
    const maxOrder = legalActs.reduce((max, act) => Math.max(max, act.order), 0);
    setIsCreatingNew(true);
    setActError(null);
    setEditingAct({
      id: generateLegalActId(),
      title: '',
      type: 'ustawa',
      description: '',
      url: '',
      order: maxOrder + 1
    });
  }

  function openEditActModal(act: LegalAct) {
    setIsCreatingNew(false);
    setActError(null);
    setEditingAct({ ...act });
  }

  async function handleSaveAct(e: FormEvent) {
    e.preventDefault();
    if (!editingAct) return;
    if (!editingAct.title.trim()) {
      setActError('Podaj tytuł aktu prawnego lub dokumentu.');
      return;
    }
    if (!/^https?:\/\/.+/i.test(editingAct.url.trim())) {
      setActError('Podaj poprawny adres URL zaczynający się od https:// lub http://');
      return;
    }

    setSavingAct(true);
    setActError(null);
    setActStatus(null);
    try {
      const cleanedAct: LegalAct = {
        ...editingAct,
        title: editingAct.title.trim(),
        type: editingAct.type,
        description: editingAct.description.trim(),
        url: editingAct.url.trim(),
        order: Number.isFinite(Number(editingAct.order))
          ? Math.max(0, Math.round(Number(editingAct.order)))
          : 1
      };

      const nextVersion = await saveAdminLegalAct(cleanedAct, isCreatingNew);
      const nextActs = isCreatingNew
        ? [...legalActs, cleanedAct]
        : legalActs.map((a) => (a.id === cleanedAct.id ? cleanedAct : a));
      nextActs.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl'));

      await saveLegalActsToCache(nextActs);
      setLocalDbVersion(nextVersion);
      setLocalLegalActsDbVersion(nextVersion);
      onLegalActsUpdated(nextActs, nextVersion);
      setActStatus(
        isCreatingNew
          ? `Dodano dokument „${cleanedAct.title}” i podbito wersję bazy do v${nextVersion}.`
          : `Zaktualizowano dokument „${cleanedAct.title}” (wersja bazy v${nextVersion}).`
      );
      setEditingAct(null);
    } catch (err) {
      setActError(err instanceof Error ? err.message : 'Nie udało się zapisać aktu prawnego.');
    } finally {
      setSavingAct(false);
    }
  }

  async function handleConfirmDeleteAct() {
    if (!deletingAct) return;
    setProcessingDelete(true);
    setActError(null);
    setActStatus(null);
    try {
      const nextVersion = await deleteAdminLegalAct(deletingAct.id);
      const nextActs = legalActs.filter((a) => a.id !== deletingAct.id);
      await saveLegalActsToCache(nextActs);
      setLocalDbVersion(nextVersion);
      setLocalLegalActsDbVersion(nextVersion);
      onLegalActsUpdated(nextActs, nextVersion);
      setActStatus(
        `Usunięto dokument „${deletingAct.title}” i podbito wersję bazy do v${nextVersion}.`
      );
      setDeletingAct(null);
    } catch (err) {
      setActError(err instanceof Error ? err.message : 'Nie udało się usunąć dokumentu.');
    } finally {
      setProcessingDelete(false);
    }
  }

  const detectedDrivePreviewId = editingAct ? extractGoogleDriveFileId(editingAct.url) : null;

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Akty prawne i dokumenty PDF ({legalActs.length})
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Udostępniaj kursantom pełne teksty ustaw, rozporządzeń i pliki PDF. Każda zmiana podbija{' '}
              <span className="font-mono">dbVersion</span> o 1.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewActModal}
            className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white whitespace-nowrap hover:bg-blue-800 dark:bg-blue-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Dodaj akt prawny</span>
          </button>
        </div>

        {/* Podpowiedź dotycząca Google Drive */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold">
              Wskazówka dla plików PDF z Dysku Google (Google Drive):
            </p>
            <p>
              Wklej link zawierający <span className="font-mono">/file/d/ID_PLIKU/view</span> (w ustawieniach udostępniania pliku na Google Drive wybierz{' '}
              <strong>„Każdy mający link” → „Przeglądający”</strong>). Wtedy kursanci otrzymają przycisk{' '}
              <strong>„Czytaj na stronie”</strong> z wygodnym wbudowanym podglądem PDF. Linki do stron zewnętrznych (np. <span className="font-mono">isap.sejm.gov.pl</span>) otworzą się w nowej karcie.
            </p>
          </div>
        </div>

        {actStatus && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{actStatus}</span>
            </span>
            <button
              type="button"
              onClick={() => setActStatus(null)}
              className="cursor-pointer text-emerald-700 dark:text-emerald-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj dokumentu po tytule, opisie lub linku..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | LegalActType)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">Wszystkie typy</option>
            <option value="ustawa">Ustawy</option>
            <option value="rozporzadzenie">Rozporządzenia</option>
            <option value="inne">Inne dokumenty</option>
          </select>
        </div>

        <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {filteredActs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {legalActs.length === 0
                ? 'Brak dodanych aktów prawnych. Kliknij „Dodaj akt prawny”, aby udostępnić pierwszy dokument.'
                : 'Brak dokumentów spełniających kryteria filtrowania.'}
            </div>
          ) : (
            filteredActs.map((act) => {
              const hasDrivePreview = Boolean(extractGoogleDriveFileId(act.url));
              return (
                <div
                  key={act.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400">
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{TYPE_LABELS[act.type]}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Kolejność: {act.order}</span>
                      {hasDrivePreview && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                            <Eye className="h-3 w-3" aria-hidden="true" />
                            <span>Podgląd PDF na stronie</span>
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {act.title}
                    </p>
                    {act.description && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {act.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={act.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Otwórz link dla ${act.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => openEditActModal(act)}
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Edytuj</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingAct(act)}
                      aria-label={`Usuń dokument ${act.title}`}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal dodawania / edycji aktu prawnego */}
      {editingAct && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {isCreatingNew ? 'Dodaj akt prawny / dokument PDF' : 'Edytuj akt prawny'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingAct(null)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAct} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Typ dokumentu
                  </label>
                  <select
                    value={editingAct.type}
                    onChange={(e) =>
                      setEditingAct({
                        ...editingAct,
                        type: e.target.value as LegalActType
                      })
                    }
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="ustawa">Ustawa</option>
                    <option value="rozporzadzenie">Rozporządzenie</option>
                    <option value="inne">Inne dokumenty</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kolejność (order)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    required
                    value={editingAct.order}
                    onChange={(e) =>
                      setEditingAct({
                        ...editingAct,
                        order: Number(e.target.value)
                      })
                    }
                    className="font-mono h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pełny tytuł aktu prawnego
                </label>
                <input
                  type="text"
                  required
                  maxLength={300}
                  value={editingAct.title}
                  onChange={(e) =>
                    setEditingAct({ ...editingAct, title: e.target.value })
                  }
                  placeholder="np. Ustawa z dnia 5 stycznia 2011 r. o kierujących pojazdami"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Krótki opis (opcjonalny)
                </label>
                <input
                  type="text"
                  maxLength={600}
                  value={editingAct.description}
                  onChange={(e) =>
                    setEditingAct({ ...editingAct, description: e.target.value })
                  }
                  placeholder="np. Tekst jednolity · stan prawny na 2026 r."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Adres URL (Google Drive lub link zewnętrzny np. ISAP)
                </label>
                <input
                  type="url"
                  required
                  maxLength={1500}
                  value={editingAct.url}
                  onChange={(e) =>
                    setEditingAct({ ...editingAct, url: e.target.value })
                  }
                  placeholder="https://drive.google.com/file/d/ID_PLIKU/view?usp=sharing"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

                {detectedDrivePreviewId ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      Wykryto plik z Dysku Google — dla kursantów włączy się przycisk „Czytaj na stronie” (upewnij się, że uprawnienia to „Każdy mający link”).
                    </span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Dla linków z Google Drive pamiętaj o ustawieniu udostępniania: „Każdy mający link (Przeglądający)”.
                  </p>
                )}
              </div>

              {actError && (
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{actError}</p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAct(null)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={savingAct}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600"
                >
                  {savingAct && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Zapisz dokument i podbij wersję bazy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia aktu prawnego */}
      {deletingAct && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Usuń akt prawny
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Czy na pewno chcesz trwale usunąć dokument „{deletingAct.title}”? Wersja bazy (<span className="font-mono">dbVersion</span>) wzrośnie o 1.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={processingDelete}
                onClick={() => setDeletingAct(null)}
                className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={processingDelete}
                onClick={() => void handleConfirmDeleteAct()}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60 dark:bg-red-600"
              >
                {processingDelete && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Usuń dokument</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

import { CheckCircle2, Eye, FileText, Loader2, RotateCcw, Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { DEFAULT_PRIVACY_POLICY_TEXT } from '../data/privacyPolicyDefault';
import { syncAllLocalDbVersions } from '../lib/indexedDb';
import { saveAdminPrivacyPolicy } from '../services/firestoreService';
import { MarkdownContent } from './MarkdownContent';

interface AdminPrivacyPolicyTabProps {
  privacyPolicyText?: string;
  onPrivacyPolicyUpdated: (nextText: string | undefined, nextVersion: number) => void;
}

export function AdminPrivacyPolicyTab({
  privacyPolicyText,
  onPrivacyPolicyUpdated
}: AdminPrivacyPolicyTabProps) {
  const [draft, setDraft] = useState(
    privacyPolicyText && privacyPolicyText.trim().length > 0
      ? privacyPolicyText
      : DEFAULT_PRIVACY_POLICY_TEXT
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraft(
      privacyPolicyText && privacyPolicyText.trim().length > 0
        ? privacyPolicyText
        : DEFAULT_PRIVACY_POLICY_TEXT
    );
  }, [privacyPolicyText]);

  const trimmedLength = draft.trim().length;
  const isUsingCustom = Boolean(privacyPolicyText && privacyPolicyText.trim().length > 0);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const res = await saveAdminPrivacyPolicy(draft);
      syncAllLocalDbVersions(res.nextVersion);
      onPrivacyPolicyUpdated(res.privacyPolicyText, res.nextVersion);
      setStatusMsg(
        res.privacyPolicyText
          ? `Zapisano Regulamin i Politykę Prywatności w system/metadata oraz podbito wersję bazy do v${res.nextVersion}.`
          : `Wyczyszczono własny regulamin (przywrócono tekst domyślny) i podbito wersję bazy do v${res.nextVersion}.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Nie udało się zapisać treści regulaminu.'
      );
    } finally {
      setSaving(false);
    }
  }

  function handleRestoreDefaultDraft() {
    setDraft(DEFAULT_PRIVACY_POLICY_TEXT);
    setStatusMsg(null);
    setErrorMsg(null);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Regulamin i Polityka Prywatności
              </h2>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {isUsingCustom ? 'Własna treść w Firestore' : 'Tekst domyślny (startowy)'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Treść jest zapisywana w polu <code className="font-mono">privacyPolicyText</code> w dokumencie{' '}
              <code className="font-mono">system/metadata</code> i udostępniana kursantom w stopce bez dodatkowych odczytów bazy. Obsługiwany jest format Markdown (# nagłówki, **pogrubienia**, listy).
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                !previewMode
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
              }`}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Edytor</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                previewMode
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Podgląd modalu</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {previewMode ? (
            <div className="max-h-[520px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <MarkdownContent
                content={
                  draft.trim().length > 0 ? draft.trim() : DEFAULT_PRIVACY_POLICY_TEXT
                }
              />
            </div>
          ) : (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="admin-privacy-policy-editor"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Treść dokumentu (Markdown lub zwykły tekst)
                </label>
                <span
                  className={`font-mono text-xs tabular-nums ${
                    trimmedLength > 30000
                      ? 'font-semibold text-red-600 dark:text-red-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {trimmedLength} / 30 000 znaków
                </span>
              </div>
              <textarea
                id="admin-privacy-policy-editor"
                rows={16}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Wpisz treść Regulaminu i Polityki Prywatności..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          )}

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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleRestoreDefaultDraft}
              disabled={saving}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Wczytaj tekst domyślny do edytora</span>
            </button>

            <button
              type="submit"
              disabled={saving || trimmedLength > 30000}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Zapisz regulamin</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

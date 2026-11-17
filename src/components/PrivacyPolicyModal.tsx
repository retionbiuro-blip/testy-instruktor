import { Loader2, ShieldCheck, X } from 'lucide-react';
import { useEffect } from 'react';
import { DEFAULT_PRIVACY_POLICY_TEXT } from '../data/privacyPolicyDefault';
import { MarkdownContent } from './MarkdownContent';

interface PrivacyPolicyModalProps {
  open: boolean;
  text?: string;
  loading?: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({
  open,
  text,
  loading = false,
  onClose
}: PrivacyPolicyModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const contentToRender =
    text && text.trim().length > 0 ? text.trim() : DEFAULT_PRIVACY_POLICY_TEXT;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400">
              <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="privacy-policy-modal-title"
                className="font-display text-base font-bold text-slate-900 sm:text-lg dark:text-white"
              >
                Polityka Prywatności i Regulamin
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Zasady korzystania z serwisu i ochrony danych
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij okno regulaminu"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2.5 py-12 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-blue-700 dark:text-blue-400" />
              <span>Wczytywanie aktualnej treści regulaminu...</span>
            </div>
          ) : (
            <MarkdownContent content={contentToRender} />
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50/70 px-5 py-3.5 sm:px-6 dark:border-slate-800 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}

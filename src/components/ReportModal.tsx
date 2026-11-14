import { Flag, Loader2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { submitReport } from '../services/firestoreService';
import { Question } from '../types';

interface ReportModalProps {
  question: Question;
  reporterUid: string;
  reporterNick: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const PRESET_REASONS = [
  'Nieaktualny przepis prawny',
  'Błędnie zaznaczona poprawna odpowiedź',
  'Literówka lub niejasna treść',
  'Brakujący lub nieczytelny obrazek'
];

export function ReportModal({
  question,
  reporterUid,
  reporterNick,
  onClose,
  onSubmitted
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 2) {
      setError('Opisz krótko, na czym polega błąd w pytaniu.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await submitReport(question, reporterUid, reporterNick, reason);
      onSubmitted();
      onClose();
    } catch {
      setError('Nie udało się wysłać zgłoszenia. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Flag className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <h2 id="report-modal-title" className="font-display text-lg font-bold">
              Zgłoś błąd w pytaniu
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij okno"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
          {question.question}
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {PRESET_REASONS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {preset}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="report-reason"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Opis uwagi dla administratora
            </label>
            <textarea
              id="report-reason"
              rows={3}
              required
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Np. Według nowelizacji z 2024 r. poprawna odpowiedź to B..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              <span>Wyślij zgłoszenie</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  CheckCircle2,
  Flag,
  HelpCircle,
  Loader2,
  MessageSquare,
  RotateCcw,
  Save,
  Shuffle,
  StickyNote,
  Trash2,
  XCircle
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ALL_CATEGORIES_KEY,
  ALL_CATEGORIES_LABEL,
  MISTAKE_CLEAR_STREAK
} from '../config';
import { areAnswerSetsEqual } from '../lib/questionUtils';
import {
  addCommentForQuestion,
  deleteComment,
  fetchCommentsForQuestion,
  recordAnswerProgress,
  savePrivateNote,
  toggleAskLecturer
} from '../services/firestoreService';
import { CommentItem, Question, UserProgress } from '../types';
import { ReportModal } from './ReportModal';

interface StudyViewProps {
  mode: 'study' | 'mistakes' | 'lecturer';
  questions: Question[];
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  progress: UserProgress;
  onProgressChange: (next: UserProgress) => void;
  isAdmin: boolean;
  onBackToDashboard: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function StudyView({
  mode,
  questions,
  categories,
  selectedCategory,
  onSelectCategory,
  progress,
  onProgressChange,
  isAdmin,
  onBackToDashboard
}: StudyViewProps) {
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [checkedResult, setCheckedResult] = useState<{
    isCorrect: boolean;
    clearedFromMistakes: boolean;
  } | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Zamrożona kolejka dla bieżącej sesji (szczególnie ważne w trybie powtórki błędów,
  // żeby pytanie nie zniknęło z ekranu przed kliknięciem "Następne pytanie")
  const [sessionIds, setSessionIds] = useState<string[]>([]);

  // Notatki prywatne
  const [privateNoteDraft, setPrivateNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedMsg, setNoteSavedMsg] = useState(false);

  // Komentarze grupy
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Zgłaszanie błędu
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportSuccessToast, setReportSuccessToast] = useState(false);

  const questionsById = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of questions) map.set(q.id, q);
    return map;
  }, [questions]);

  const allCategoryNames = useMemo(() => {
    return Array.from(new Set([...categories, ...questions.map((q) => q.category)])).filter(Boolean);
  }, [categories, questions]);

  // Budowanie puli pytań przy zmianie trybu, kategorii lub tasowaniu
  useEffect(() => {
    let pool: Question[] = [];
    if (mode === 'study') {
      pool =
        selectedCategory === ALL_CATEGORIES_KEY
          ? questions
          : questions.filter((q) => q.category === selectedCategory);
    } else if (mode === 'mistakes') {
      const mistakeIds = new Set(Object.keys(progress.mistakeStreaks));
      pool = questions.filter((q) => mistakeIds.has(q.id));
    } else {
      const lecturerIds = new Set(progress.askLecturerIds);
      pool = questions.filter((q) => lecturerIds.has(q.id));
    }

    const ids = pool.map((q) => q.id);
    if (shuffleSeed > 0) {
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    }
    setSessionIds(ids);
    setCurrentIndex(0);
    setSelectedOptions([]);
    setCheckedResult(null);
    // Celowo nie resetujemy sesji przy każdej zmianie progress, aby pytanie po rozwiązaniu nie zniknęło nagle z ekranu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedCategory, shuffleSeed, questions]);

  const activeQuestion: Question | null = useMemo(() => {
    if (sessionIds.length === 0) return null;
    const safeIdx = Math.min(currentIndex, sessionIds.length - 1);
    return questionsById.get(sessionIds[safeIdx]) ?? null;
  }, [sessionIds, currentIndex, questionsById]);

  // Synchronizacja notatki prywatnej i komentarzy przy zmianie pytania
  useEffect(() => {
    if (!activeQuestion) return;
    setPrivateNoteDraft(progress.privateNotes[activeQuestion.id] ?? '');
    setNoteSavedMsg(false);
    setReportSuccessToast(false);

    let cancelled = false;
    setLoadingComments(true);
    fetchCommentsForQuestion(activeQuestion.id)
      .then((list) => {
        if (!cancelled) setComments(list);
      })
      .catch((err) => {
        console.error('Błąd pobierania komentarzy:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion?.id]);

  function toggleOption(index: number) {
    if (checkedResult) return;
    setSelectedOptions((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }

  async function handleCheckAnswer() {
    if (!activeQuestion || selectedOptions.length === 0 || submittingAnswer) return;
    setSubmittingAnswer(true);
    const isCorrect = areAnswerSetsEqual(selectedOptions, activeQuestion.correctAnswers);
    const hadMistakeBefore = activeQuestion.id in progress.mistakeStreaks;

    try {
      const updated = await recordAnswerProgress(progress, activeQuestion.id, isCorrect);
      onProgressChange(updated);
      const clearedFromMistakes =
        hadMistakeBefore && isCorrect && !(activeQuestion.id in updated.mistakeStreaks);
      setCheckedResult({ isCorrect, clearedFromMistakes });
    } catch (err) {
      console.error('Nie udało się zapisać postępu:', err);
    } finally {
      setSubmittingAnswer(false);
    }
  }

  function goToQuestion(nextIdx: number) {
    if (nextIdx < 0 || nextIdx >= sessionIds.length) return;
    setCurrentIndex(nextIdx);
    setSelectedOptions([]);
    setCheckedResult(null);
  }

  async function handleToggleLecturer() {
    if (!activeQuestion) return;
    const updated = await toggleAskLecturer(progress, activeQuestion.id);
    onProgressChange(updated);
  }

  async function handleSavePrivateNote(e: FormEvent) {
    e.preventDefault();
    if (!activeQuestion || savingNote) return;
    setSavingNote(true);
    try {
      const updated = await savePrivateNote(progress, activeQuestion.id, privateNoteDraft);
      onProgressChange(updated);
      setNoteSavedMsg(true);
      setTimeout(() => setNoteSavedMsg(false), 2500);
    } finally {
      setSavingNote(false);
    }
  }

  async function handlePostComment(e: FormEvent) {
    e.preventDefault();
    if (!activeQuestion || !commentDraft.trim() || postingComment) return;
    setPostingComment(true);
    try {
      await addCommentForQuestion(
        activeQuestion.id,
        progress.uid,
        progress.nick,
        commentDraft.trim()
      );
      setCommentDraft('');
      const refreshed = await fetchCommentsForQuestion(activeQuestion.id);
      setComments(refreshed);
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!activeQuestion) return;
    await deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  function handleReloadModeQueue() {
    setShuffleSeed((s) => s + 1);
  }

  const modeTitle =
    mode === 'study'
      ? 'Tryb Nauki'
      : mode === 'mistakes'
        ? 'Powtórka błędów'
        : 'Do zapytania wykładowcy';

  const isFlaggedForLecturer = activeQuestion
    ? progress.askLecturerIds.includes(activeQuestion.id)
    : false;
  const currentMistakeStreak = activeQuestion
    ? progress.mistakeStreaks[activeQuestion.id]
    : undefined;

  return (
    <div className="space-y-6">
      {/* Pasek nagłówka trybu */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Pulpit</span>
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {modeTitle}
            </h1>
            {mode === 'mistakes' && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pytanie znika z tej puli po {MISTAKE_CLEAR_STREAK} poprawnych odpowiedziach z rzędu.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {mode === 'study' && (
            <select
              aria-label="Wybierz kategorię nauki"
              value={selectedCategory}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value={ALL_CATEGORIES_KEY}>{ALL_CATEGORIES_LABEL}</option>
              {allCategoryNames.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleReloadModeQueue}
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{mode === 'mistakes' ? 'Odśwież i wymieszaj' : 'Wymieszaj pytania'}</span>
          </button>
        </div>
      </div>

      {/* Pusty stan dla wybranego trybu */}
      {!activeQuestion ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          {mode === 'mistakes' ? (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-display mt-3 text-lg font-bold text-slate-900 dark:text-white">
                Brak pytań w powtórce błędów
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
                Świetnie! Wszystkie błędne pytania zostały już przez Ciebie dwukrotnie poprawione.
              </p>
            </>
          ) : mode === 'lecturer' ? (
            <>
              <HelpCircle className="mx-auto h-10 w-10 text-amber-600 dark:text-amber-400" />
              <h2 className="font-display mt-3 text-lg font-bold text-slate-900 dark:text-white">
                Lista „Do zapytania wykładowcy” jest pusta
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
                Podczas nauki kliknij „Trafione fartem / Zapytaj wykładowcy” przy dowolnym pytaniu, aby zapisać je tutaj na zajęcia.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Brak pytań w wybranej kategorii
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Wybierz inną kategorię z listy powyżej lub „Wszystkie kategorie (Mix)”.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={onBackToDashboard}
            className="mt-5 cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
          >
            Wróć do pulpitu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Główna karta pytania */}
          <div className="space-y-5 lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
              {/* Metadane pytania (bez pigułek) */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                    Pytanie {currentIndex + 1} z {sessionIds.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-blue-700 dark:text-blue-400">
                    {activeQuestion.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Wielokrotny wybór (poprawnych: {activeQuestion.correctAnswers.length})
                  </span>
                </div>

                {currentMistakeStreak !== undefined && (
                  <span className="font-mono font-semibold text-amber-700 tabular-nums dark:text-amber-400">
                    Powtórka błędów: {currentMistakeStreak}/{MISTAKE_CLEAR_STREAK} z rzędu
                  </span>
                )}
              </div>

              {/* Treść pytania */}
              <h2 className="font-display mt-4 text-lg leading-snug font-semibold text-slate-900 sm:text-xl dark:text-white">
                {activeQuestion.question}
              </h2>

              {/* Obrazek Base64 jeśli istnieje */}
              {activeQuestion.imageBase64 && (
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                  <img
                    src={activeQuestion.imageBase64}
                    alt={`Ilustracja do pytania: ${activeQuestion.question.slice(0, 60)}`}
                    referrerPolicy="no-referrer"
                    className="mx-auto max-h-80 w-auto object-contain"
                  />
                </div>
              )}

              {/* Opcje odpowiedzi (checkboxy) */}
              <div className="mt-5 space-y-2.5" role="group" aria-label="Opcje odpowiedzi">
                {activeQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOptions.includes(idx);
                  const isCorrectOpt = activeQuestion.correctAnswers.includes(idx);

                  let containerClasses =
                    'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900';
                  let statusLabel: string | null = null;
                  let StatusIcon: typeof CheckCircle2 | null = null;

                  if (checkedResult) {
                    if (isCorrectOpt && isSelected) {
                      containerClasses =
                        'border-emerald-500 bg-emerald-50/70 dark:border-emerald-600 dark:bg-emerald-950/35';
                      statusLabel = 'Poprawna (zaznaczona)';
                      StatusIcon = CheckCircle2;
                    } else if (isCorrectOpt && !isSelected) {
                      containerClasses =
                        'border-emerald-400 border-dashed bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/20';
                      statusLabel = 'Poprawna (pominięta)';
                      StatusIcon = CheckCircle2;
                    } else if (!isCorrectOpt && isSelected) {
                      containerClasses =
                        'border-red-500 bg-red-50/70 dark:border-red-600 dark:bg-red-950/35';
                      statusLabel = 'Błędna';
                      StatusIcon = XCircle;
                    } else {
                      containerClasses =
                        'border-slate-200 bg-slate-50/50 opacity-75 dark:border-slate-800 dark:bg-slate-950/50';
                    }
                  } else if (isSelected) {
                    containerClasses =
                      'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={Boolean(checkedResult)}
                      onClick={() => toggleOption(idx)}
                      className={`flex min-h-[48px] w-full cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-left transition-colors disabled:cursor-default ${containerClasses}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                          isSelected
                            ? 'border-blue-700 bg-blue-700 text-white dark:border-blue-500 dark:bg-blue-500'
                            : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-900'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                            <strong className="font-mono mr-1.5 text-xs text-slate-500 dark:text-slate-400">
                              {OPTION_LETTERS[idx] ?? idx + 1}.
                            </strong>
                            {opt}
                          </span>
                          {StatusIcon && statusLabel && (
                            <span
                              className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${
                                isCorrectOpt
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-red-700 dark:text-red-400'
                              }`}
                            >
                              <StatusIcon className="h-4 w-4" aria-hidden="true" />
                              <span className="hidden sm:inline">{statusLabel}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Komunikat po sprawdzeniu + uzasadnienie */}
              {checkedResult && (
                <div className="mt-5 space-y-3">
                  <div
                    role="status"
                    className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm ${
                      checkedResult.isCorrect
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                    }`}
                  >
                    {checkedResult.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {checkedResult.isCorrect
                          ? 'Poprawna odpowiedź!'
                          : 'Odpowiedź błędna — pytanie dodano do puli „Powtórka błędów”.'}
                      </p>
                      {checkedResult.clearedFromMistakes && (
                        <p className="mt-1 text-xs font-medium">
                          Gratulacje! Po 2 poprawnych odpowiedziach z rzędu to pytanie zostało usunięte z puli błędów.
                        </p>
                      )}
                    </div>
                  </div>

                  {activeQuestion.explanation && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Uzasadnienie / Podstawa prawna
                      </p>
                      <p className="mt-1 leading-relaxed">{activeQuestion.explanation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pasek akcji pytania */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleLecturer}
                    className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                      isFlaggedForLecturer
                        ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isFlaggedForLecturer ? (
                      <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {isFlaggedForLecturer
                        ? 'Zapisane do zapytania wykładowcy'
                        : 'Trafione fartem / Zapytaj wykładowcy'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Zgłoś błąd w pytaniu</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => goToQuestion(currentIndex - 1)}
                    className="flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Poprzednie</span>
                  </button>

                  {!checkedResult ? (
                    <button
                      type="button"
                      disabled={selectedOptions.length === 0 || submittingAnswer}
                      onClick={handleCheckAnswer}
                      className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      {submittingAnswer && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Sprawdź odpowiedź</span>
                    </button>
                  ) : currentIndex < sessionIds.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => goToQuestion(currentIndex + 1)}
                      className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      <span>Następne pytanie</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReloadModeQueue}
                      className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>Zacznij pulę od nowa</span>
                    </button>
                  )}
                </div>
              </div>

              {reportSuccessToast && (
                <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Dziękujemy! Zgłoszenie zostało wysłane do administratora.
                </p>
              )}
            </div>
          </div>

          {/* Prawa kolumna: Notatki prywatne oraz Wspólne notatki grupy */}
          <aside className="space-y-5 lg:col-span-4">
            {/* Notatki prywatne */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                <StickyNote className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <h3 className="font-display text-sm font-bold">Twoja prywatna notatka</h3>
              </div>
              <form onSubmit={handleSavePrivateNote} className="space-y-2.5">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={privateNoteDraft}
                  onChange={(e) => setPrivateNoteDraft(e.target.value)}
                  placeholder="Zapisz własne skojarzenie lub przypomnienie (widoczne tylko dla Ciebie)..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">
                    {noteSavedMsg ? 'Zapisano notatkę' : ''}
                  </span>
                  <button
                    type="submit"
                    disabled={savingNote}
                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{savingNote ? 'Zapisywanie...' : 'Zapisz notatkę'}</span>
                  </button>
                </div>
              </form>
            </section>

            {/* Wspólne notatki grupy (kolekcja comments) */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <h3 className="font-display text-sm font-bold">Wspólne notatki grupy</h3>
                </div>
                <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  {comments.length}
                </span>
              </div>

              <form onSubmit={handlePostComment} className="mb-4 space-y-2">
                <textarea
                  rows={2}
                  maxLength={1500}
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Podziel się wskazówką lub podstawą prawną z innymi kursantami..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={postingComment || !commentDraft.trim()}
                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600"
                  >
                    {postingComment && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Dodaj komentarz</span>
                  </button>
                </div>
              </form>

              {loadingComments ? (
                <div className="flex items-center gap-2 py-4 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Ładowanie komentarzy...</span>
                </div>
              ) : comments.length === 0 ? (
                <p className="py-2 text-xs text-slate-500 dark:text-slate-400">
                  Brak komentarzy pod tym pytaniem. Bądź pierwszą osobą!
                </p>
              ) : (
                <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {comments.map((comment) => {
                    const canDelete = comment.authorUid === progress.uid || isAdmin;
                    return (
                      <li
                        key={comment.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {comment.authorNick}
                          </span>
                          <div className="flex items-center gap-2">
                            {comment.createdAt && (
                              <span className="font-mono text-[11px] tabular-nums">
                                {comment.createdAt.toLocaleDateString('pl-PL')}
                              </span>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                aria-label="Usuń komentarz"
                                className="cursor-pointer text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="mt-1.5 leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                          {comment.text}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}

      {reportModalOpen && activeQuestion && (
        <ReportModal
          question={activeQuestion}
          reporterUid={progress.uid}
          reporterNick={progress.nick}
          onClose={() => setReportModalOpen(false)}
          onSubmitted={() => setReportSuccessToast(true)}
        />
      )}
    </div>
  );
}

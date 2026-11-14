import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  Play,
  RotateCcw,
  XCircle,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ALL_CATEGORIES_KEY,
  ALL_CATEGORIES_LABEL,
  EXAM_DURATION_SECONDS,
  EXAM_PASS_THRESHOLD_PERCENT,
  QUICK10_DURATION_SECONDS,
  QUICK10_QUESTION_COUNT
} from '../config';
import { areAnswerSetsEqual } from '../lib/questionUtils';
import { saveExamCompletion } from '../services/firestoreService';
import { ExamHistoryItem, Question, UserProgress } from '../types';
import { ReportModal } from './ReportModal';

interface ExamViewProps {
  mode: 'exam' | 'quick10';
  questions: Question[];
  categories: string[];
  defaultCategory: string;
  progress: UserProgress;
  isGuest: boolean;
  onRequireAuth: (mode: 'login' | 'register') => void;
  onProgressChange: (next: UserProgress) => void;
  onBackToDashboard: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function pickRandomQuestions(pool: Question[], count: number): Question[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export function ExamView({
  mode,
  questions,
  categories,
  defaultCategory,
  progress,
  isGuest,
  onRequireAuth,
  onProgressChange,
  onBackToDashboard
}: ExamViewProps) {
  const [stage, setStage] = useState<'setup' | 'running' | 'results'>(
    mode === 'quick10' ? 'running' : 'setup'
  );
  const [chosenCategory, setChosenCategory] = useState(defaultCategory || ALL_CATEGORIES_KEY);
  const [questionCount, setQuestionCount] = useState<20 | 32>(32);

  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [answersMap, setAnswersMap] = useState<Record<string, number[]>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(
    mode === 'quick10' ? QUICK10_DURATION_SECONDS : EXAM_DURATION_SECONDS
  );
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong'>('wrong');
  const [reportTarget, setReportTarget] = useState<Question | null>(null);
  const [reportSuccessId, setReportSuccessId] = useState<string | null>(null);

  const allCategoryNames = useMemo(() => {
    return Array.from(new Set([...categories, ...questions.map((q) => q.category)])).filter(Boolean);
  }, [categories, questions]);

  const startTest = useCallback(
    (testMode: 'exam' | 'quick10', cat: string, count: number) => {
      const pool =
        cat === ALL_CATEGORIES_KEY
          ? questions
          : questions.filter((q) => q.category === cat);

      const picked = pickRandomQuestions(pool, count);
      setExamQuestions(picked);
      setAnswersMap({});
      setCurrentIdx(0);
      setSecondsLeft(
        testMode === 'quick10' ? QUICK10_DURATION_SECONDS : EXAM_DURATION_SECONDS
      );
      setReviewFilter('wrong');
      setStage('running');
    },
    [questions]
  );

  // Automatyczny start w trybie Szybka 10-tka
  useEffect(() => {
    if (mode === 'quick10') {
      startTest('quick10', defaultCategory || ALL_CATEGORIES_KEY, QUICK10_QUESTION_COUNT);
    } else {
      setStage('setup');
    }
  }, [mode, defaultCategory, startTest]);

  const finishExam = useCallback(async () => {
    if (stage !== 'running') return;
    setStage('results');

    const total = examQuestions.length;
    if (isGuest || total === 0) return;

    let score = 0;
    const mistakeIds: string[] = [];
    const masteredIds: string[] = [];

    for (const q of examQuestions) {
      const selected = answersMap[q.id] ?? [];
      if (areAnswerSetsEqual(selected, q.correctAnswers)) {
        score++;
        masteredIds.push(q.id);
      } else {
        mistakeIds.push(q.id);
      }
    }

    const percent = Math.round((score / total) * 100);
    const passed = percent >= EXAM_PASS_THRESHOLD_PERCENT;

    const historyItem: ExamHistoryItem = {
      id: `ex_${Date.now()}`,
      mode,
      category:
        chosenCategory === ALL_CATEGORIES_KEY ? ALL_CATEGORIES_LABEL : chosenCategory,
      score,
      total,
      percent,
      passed,
      dateIso: new Date().toISOString()
    };

    try {
      const updated = await saveExamCompletion(
        progress,
        historyItem,
        mistakeIds,
        masteredIds
      );
      onProgressChange(updated);
    } catch (err) {
      console.error('Nie udało się zapisać wyniku egzaminu:', err);
    }
  }, [stage, isGuest, examQuestions, answersMap, mode, chosenCategory, progress, onProgressChange]);

  // Odliczanie czasu podczas testu
  useEffect(() => {
    if (stage !== 'running' || examQuestions.length === 0) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          void finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [stage, examQuestions.length, finishExam]);

  function toggleAnswer(questionId: string, optionIdx: number) {
    setAnswersMap((prev) => {
      const current = prev[questionId] ?? [];
      const next = current.includes(optionIdx)
        ? current.filter((i) => i !== optionIdx)
        : [...current, optionIdx];
      return { ...prev, [questionId]: next };
    });
  }

  // Ekran konfiguracji Symulacji Egzaminu
  if (stage === 'setup') {
    const availableCount =
      chosenCategory === ALL_CATEGORIES_KEY
        ? questions.length
        : questions.filter((q) => q.category === chosenCategory).length;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Pulpit</span>
          </button>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Symulacja Egzaminu
          </h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-5 text-center dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Czas trwania</p>
              <p className="font-mono mt-1 text-base font-bold text-slate-900 tabular-nums dark:text-white">
                25 min
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Próg zdania</p>
              <p className="font-mono mt-1 text-base font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                {EXAM_PASS_THRESHOLD_PERCENT}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Punktacja</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                Bez podpowiedzi
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="exam-category"
              className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Zakres materiału
            </label>
            <select
              id="exam-category"
              value={chosenCategory}
              onChange={(e) => setChosenCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value={ALL_CATEGORIES_KEY}>
                {ALL_CATEGORIES_LABEL} ({questions.length} pytań)
              </option>
              {allCategoryNames.map((cat) => {
                const count = questions.filter((q) => q.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count} pytań)
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              Liczba pytań w teście
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([20, 32] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setQuestionCount(cnt)}
                  className={`cursor-pointer rounded-lg border py-3 text-sm font-semibold transition-colors ${
                    questionCount === cnt
                      ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  }`}
                >
                  {cnt} pytań
                </button>
              ))}
            </div>
            {availableCount < questionCount && availableCount > 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                W wybranej kategorii jest obecnie {availableCount} pytań — test będzie zawierał wszystkie dostępne pytania.
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {isGuest
              ? 'Zasada punktacji: punkt przyznawany jest wyłącznie za zaznaczenie wszystkich poprawnych odpowiedzi i ani jednej błędnej. W trybie gościa wynik testu nie jest zapisywany w historii.'
              : 'Zasada punktacji: punkt przyznawany jest wyłącznie za zaznaczenie wszystkich poprawnych odpowiedzi i ani jednej błędnej. Błędne odpowiedzi z egzaminu automatycznie trafiają do Twojej puli „Powtórka błędów”.'}
          </p>

          <button
            type="button"
            disabled={availableCount === 0}
            onClick={() => startTest('exam', chosenCategory, questionCount)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            <span>Rozpocznij egzamin</span>
          </button>
        </div>
      </div>
    );
  }

  // Brak pytań w puli
  if (examQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Brak pytań do przeprowadzenia testu
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Wybrana kategoria nie zawiera jeszcze pytań. Wróć do pulpitu lub wybierz inną kategorię.
        </p>
        <button
          type="button"
          onClick={onBackToDashboard}
          className="mt-5 cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Wróć do pulpitu
        </button>
      </div>
    );
  }

  // Ekran wyników po zakończeniu egzaminu
  if (stage === 'results') {
    const total = examQuestions.length;
    let score = 0;
    const evaluated = examQuestions.map((q) => {
      const selected = answersMap[q.id] ?? [];
      const isCorrect = areAnswerSetsEqual(selected, q.correctAnswers);
      if (isCorrect) score++;
      return { question: q, selected, isCorrect };
    });

    const percent = Math.round((score / total) * 100);
    const passed = percent >= EXAM_PASS_THRESHOLD_PERCENT;
    const wrongItems = evaluated.filter((item) => !item.isCorrect);
    const visibleReview = reviewFilter === 'wrong' ? wrongItems : evaluated;

    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {mode === 'quick10' ? 'Szybka 10-tka' : 'Symulacja Egzaminu'} · Wynik końcowy
            </p>
            <h1 className="font-display mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Podsumowanie testu
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              Pulpit
            </button>
            <button
              type="button"
              onClick={() =>
                mode === 'quick10'
                  ? startTest('quick10', chosenCategory, QUICK10_QUESTION_COUNT)
                  : setStage('setup')
              }
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Nowy test</span>
            </button>
          </div>
        </div>

        {/* Wynik ZDANY / NIEZDANY */}
        <div
          className={`flex flex-col justify-between gap-4 rounded-xl border p-6 sm:flex-row sm:items-center ${
            passed
              ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/35'
              : 'border-red-300 bg-red-50/70 dark:border-red-800 dark:bg-red-950/35'
          }`}
        >
          <div className="flex items-center gap-4">
            {passed ? (
              <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-10 w-10 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <div>
              <p
                className={`font-display text-2xl font-extrabold tracking-tight ${
                  passed
                    ? 'text-emerald-800 dark:text-emerald-300'
                    : 'text-red-800 dark:text-red-300'
                }`}
              >
                {passed ? 'ZDANY' : 'NIEZDANY'}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Wymagany próg zaliczenia: {EXAM_PASS_THRESHOLD_PERCENT}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Poprawne pytania</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                {score} / {total}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Wynik procentowy</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                {percent}%
              </p>
            </div>
          </div>
        </div>

        {isGuest && (
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-xs text-slate-700 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span>
              Tryb gościa — wynik tego egzaminu oraz błędne odpowiedzi nie zostały zapisane w historii ani rankingu.
            </span>
            <button
              type="button"
              onClick={() => onRequireAuth('register')}
              className="shrink-0 cursor-pointer font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              Załóż darmowe konto →
            </button>
          </div>
        )}

        {/* Przegląd błędów */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Przegląd odpowiedzi ({wrongItems.length} błędnych)
            </h2>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setReviewFilter('wrong')}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold ${
                  reviewFilter === 'wrong'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tylko błędne ({wrongItems.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold ${
                  reviewFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Wszystkie ({evaluated.length})
              </button>
            </div>
          </div>

          {visibleReview.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Bezbłędny wynik — wszystkie odpowiedzi były poprawne!
            </div>
          ) : (
            <div className="space-y-4">
              {visibleReview.map(({ question: q, selected, isCorrect }, i) => (
                <article
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      #{i + 1} · {q.category}
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isCorrect
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                        )}
                        {isCorrect ? 'Poprawna' : 'Błędna'}
                      </span>
                      {!isGuest && (
                        <button
                          type="button"
                          onClick={() => setReportTarget(q)}
                          className="flex cursor-pointer items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Zgłoś błąd</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                    {q.question}
                  </h3>

                  {q.imageBase64 && (
                    <img
                      src={q.imageBase64}
                      alt="Ilustracja do pytania"
                      referrerPolicy="no-referrer"
                      className="mt-3 max-h-56 rounded-lg border border-slate-200 object-contain dark:border-slate-800"
                    />
                  )}

                  <ul className="mt-3 space-y-1.5 text-sm">
                    {q.options.map((opt, idx) => {
                      const wasSelected = selected.includes(idx);
                      const isRight = q.correctAnswers.includes(idx);

                      let rowClass = 'border-slate-100 bg-slate-50/50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300';
                      let tag = '';
                      if (isRight && wasSelected) {
                        rowClass = 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
                        tag = 'Twoja i poprawna';
                      } else if (isRight && !wasSelected) {
                        rowClass = 'border-emerald-300 border-dashed bg-emerald-50/40 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200';
                        tag = 'Poprawna (pominięta)';
                      } else if (!isRight && wasSelected) {
                        rowClass = 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200';
                        tag = 'Zaznaczono błędnie';
                      }

                      return (
                        <li
                          key={idx}
                          className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${rowClass}`}
                        >
                          <span>
                            <strong className="font-mono mr-1.5 text-xs">
                              {OPTION_LETTERS[idx] ?? idx + 1}.
                            </strong>
                            {opt}
                          </span>
                          {tag && <span className="shrink-0 text-xs font-semibold">{tag}</span>}
                        </li>
                      );
                    })}
                  </ul>

                  {q.explanation && (
                    <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      <strong>Uzasadnienie:</strong> {q.explanation}
                    </p>
                  )}

                  {reportSuccessId === q.id && (
                    <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Zgłoszenie zostało zapisane.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {reportTarget && (
          <ReportModal
            question={reportTarget}
            reporterUid={progress.uid}
            reporterNick={progress.nick}
            onClose={() => setReportTarget(null)}
            onSubmitted={() => setReportSuccessId(reportTarget.id)}
          />
        )}
      </div>
    );
  }

  // Aktywny test (bez podpowiedzi!)
  const activeQ = examQuestions[currentIdx];
  const currentSelected = answersMap[activeQ.id] ?? [];
  const answeredCount = examQuestions.filter((q) => (answersMap[q.id]?.length ?? 0) > 0).length;
  const isLowTime = secondsLeft <= 60;

  return (
    <div className="space-y-6">
      {/* Górny pasek egzaminu z zegarem */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          {mode === 'quick10' ? (
            <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : null}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'quick10' ? 'Szybka 10-tka' : 'Symulacja Egzaminu'} · Odpowiedziano{' '}
              <span className="font-mono tabular-nums">
                {answeredCount}/{examQuestions.length}
              </span>
            </p>
            <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Pytanie {currentIdx + 1} z {examQuestions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-base font-bold tabular-nums ${
              isLowTime
                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400'
                : 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white'
            }`}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{formatSeconds(secondsLeft)}</span>
          </div>

          <button
            type="button"
            onClick={() => void finishExam()}
            className="cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Zakończ test
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Karta aktywnego pytania */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-8 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            {activeQ.category} · Zaznacz wszystkie poprawne odpowiedzi
          </p>
          <h2 className="font-display mt-2 text-lg leading-snug font-semibold text-slate-900 sm:text-xl dark:text-white">
            {activeQ.question}
          </h2>

          {activeQ.imageBase64 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <img
                src={activeQ.imageBase64}
                alt="Ilustracja do pytania egzaminacyjnego"
                referrerPolicy="no-referrer"
                className="mx-auto max-h-80 w-auto object-contain"
              />
            </div>
          )}

          <div className="mt-5 space-y-2.5">
            {activeQ.options.map((opt, idx) => {
              const isSelected = currentSelected.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleAnswer(activeQ.id, idx)}
                  className={`flex min-h-[48px] w-full cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'
                  }`}
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
                  <span className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                    <strong className="font-mono mr-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {OPTION_LETTERS[idx] ?? idx + 1}.
                    </strong>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => i - 1)}
              className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Poprzednie</span>
            </button>

            {currentIdx < examQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => i + 1)}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
              >
                <span>Następne</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void finishExam()}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600"
              >
                <span>Zakończ i sprawdź wynik</span>
              </button>
            )}
          </div>
        </div>

        {/* Nawigator numerów pytań */}
        <aside className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Mapa pytań
          </h3>
          <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
            {examQuestions.map((q, idx) => {
              const hasAnswer = (answersMap[q.id]?.length ?? 0) > 0;
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`font-mono flex h-9 cursor-pointer items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-colors ${
                    isCurrent
                      ? 'border-blue-700 bg-blue-700 text-white dark:border-blue-500 dark:bg-blue-500'
                      : hasAnswer
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Dices,
  FileText,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EXAM_PRESENTATION_TOPICS } from '../data/knowledgePracticeData';

interface LessonPlanDraft {
  topicTitle: string;
  generalGoal: string;
  knowledgeGoal: string;
  attitudeGoal: string;
  methodsPodajaca: boolean;
  methodsProblemowa: boolean;
  methodsEksponujaca: boolean;
  methodsNotes: string;
  selectedAids: string[];
  customAids: string;
  introMinutes: string;
  introNotes: string;
  mainMinutes: string;
  mainNotes: string;
  summaryMinutes: string;
  summaryNotes: string;
  checkedSteps: Record<number, boolean>;
}

const STORAGE_KEY = 'instruktor_pro_lesson_plan_draft_v1';

const TEACHING_AIDS_OPTIONS = [
  'Tablica suchościeralna i markery',
  'Plansze ze znakami drogowymi',
  'Modele pojazdów i skrzyżowania',
  'Prezentacja multimedialna / rzutnik',
  'Ustawa Prawo o ruchu drogowym',
  'Fantom RKO i apteczka'
];

function createDefaultDraft(durationMin: 10 | 15 | 20 = 15): LessonPlanDraft {
  const defaultTopic = EXAM_PRESENTATION_TOPICS[0];
  const timing = getTimingSplit(durationMin);
  return {
    topicTitle: defaultTopic.title,
    generalGoal: '',
    knowledgeGoal: '',
    attitudeGoal: '',
    methodsPodajaca: true,
    methodsProblemowa: false,
    methodsEksponujaca: true,
    methodsNotes: '',
    selectedAids: ['Tablica suchościeralna i markery', 'Plansze ze znakami drogowymi'],
    customAids: '',
    introMinutes: String(timing.intro),
    introNotes: '',
    mainMinutes: String(timing.main),
    mainNotes: '',
    summaryMinutes: String(timing.summary),
    summaryNotes: '',
    checkedSteps: {}
  };
}

function getTimingSplit(durationMin: 10 | 15 | 20): {
  intro: number;
  main: number;
  summary: number;
} {
  if (durationMin === 10) return { intro: 2, main: 6, summary: 2 };
  if (durationMin === 20) return { intro: 3, main: 14, summary: 3 };
  return { intro: 2, main: 11, summary: 2 };
}

function loadSavedDraft(): LessonPlanDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultDraft(15);
    const parsed = JSON.parse(raw) as Partial<LessonPlanDraft>;
    return {
      ...createDefaultDraft(15),
      ...parsed,
      selectedAids: Array.isArray(parsed.selectedAids)
        ? parsed.selectedAids
        : ['Tablica suchościeralna i markery', 'Plansze ze znakami drogowymi'],
      checkedSteps:
        parsed.checkedSteps && typeof parsed.checkedSteps === 'object' ? parsed.checkedSteps : {}
    };
  } catch {
    return createDefaultDraft(15);
  }
}

function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function playEndAlarmChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [659.25, 880, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.22);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + idx * 0.22 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.22 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.22);
      osc.stop(ctx.currentTime + idx * 0.22 + 0.4);
    });
  } catch {
    // Przeglądarka zablokowała audio bez interakcji lub brak wsparcia AudioContext
  }
}

export function LectureSimulatorSection() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(EXAM_PRESENTATION_TOPICS[0].id);
  const [durationMinutes, setDurationMinutes] = useState<10 | 15 | 20>(15);
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [checklistExpanded, setChecklistExpanded] = useState(true);
  const [draft, setDraft] = useState<LessonPlanDraft>(() => loadSavedDraft());

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Zapis roboczy konspektu w pamięci przeglądarki
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignorujemy brak miejsca w localStorage
    }
  }, [draft]);

  // Odliczanie timera prezentacji
  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          setTimerFinished(true);
          if (soundEnabledRef.current) {
            playEndAlarmChime();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const activePreset = useMemo(
    () => EXAM_PRESENTATION_TOPICS.find((t) => t.id === selectedPresetId) ?? null,
    [selectedPresetId]
  );

  const totalSeconds = durationMinutes * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);
  const progressPct = totalSeconds > 0 ? Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100)) : 0;

  const recommendedSplit = useMemo(() => getTimingSplit(durationMinutes), [durationMinutes]);
  const currentPhaseLabel = useMemo(() => {
    if (timerFinished) return 'Koniec czasu wystąpienia';
    if (elapsedSeconds === 0 && !timerRunning) return 'Gotowy do startu';
    const introEnd = recommendedSplit.intro * 60;
    const mainEnd = (recommendedSplit.intro + recommendedSplit.main) * 60;
    if (elapsedSeconds < introEnd) return `Faza 1: Wstęp (0–${recommendedSplit.intro} min)`;
    if (elapsedSeconds < mainEnd)
      return `Faza 2: Część główna (${recommendedSplit.intro}–${recommendedSplit.intro + recommendedSplit.main} min)`;
    return `Faza 3: Podsumowanie (ostatnie ${recommendedSplit.summary} min)`;
  }, [elapsedSeconds, timerRunning, timerFinished, recommendedSplit]);

  const completedChecklistCount = useMemo(() => {
    const step1 = Boolean(draft.topicTitle.trim() && draft.generalGoal.trim());
    const step2 = Boolean(draft.knowledgeGoal.trim() || draft.attitudeGoal.trim());
    const step3 = draft.methodsPodajaca || draft.methodsProblemowa || draft.methodsEksponujaca;
    const step4 = draft.selectedAids.length > 0 || Boolean(draft.customAids.trim());
    const step5 = Boolean(
      draft.introNotes.trim() || draft.mainNotes.trim() || draft.summaryNotes.trim()
    );
    const autoStates = [step1, step2, step3, step4, step5];
    return autoStates.filter((filled, idx) => Boolean(draft.checkedSteps[idx + 1]) || filled).length;
  }, [draft]);

  function handleSelectDuration(mins: 10 | 15 | 20) {
    setTimerRunning(false);
    setTimerFinished(false);
    setDurationMinutes(mins);
    setSecondsLeft(mins * 60);
    const split = getTimingSplit(mins);
    setDraft((prev) => ({
      ...prev,
      introMinutes: String(split.intro),
      mainMinutes: String(split.main),
      summaryMinutes: String(split.summary)
    }));
  }

  function handleResetTimer() {
    setTimerRunning(false);
    setTimerFinished(false);
    setSecondsLeft(durationMinutes * 60);
  }

  function handleDrawRandomTopic() {
    const pool = EXAM_PRESENTATION_TOPICS.filter((t) => t.id !== selectedPresetId);
    const picked = pool[Math.floor(Math.random() * pool.length)] ?? EXAM_PRESENTATION_TOPICS[0];
    setSelectedPresetId(picked.id);
    setDraft((prev) => ({ ...prev, topicTitle: picked.title }));
  }

  function handlePickPreset(topicId: string) {
    setSelectedPresetId(topicId);
    const found = EXAM_PRESENTATION_TOPICS.find((t) => t.id === topicId);
    if (found) {
      setDraft((prev) => ({ ...prev, topicTitle: found.title }));
    }
  }

  function toggleTeachingAid(aid: string) {
    setDraft((prev) => {
      const exists = prev.selectedAids.includes(aid);
      return {
        ...prev,
        selectedAids: exists
          ? prev.selectedAids.filter((item) => item !== aid)
          : [...prev.selectedAids, aid]
      };
    });
  }

  function toggleStepChecked(stepNum: number) {
    setDraft((prev) => ({
      ...prev,
      checkedSteps: {
        ...prev.checkedSteps,
        [stepNum]: !prev.checkedSteps[stepNum]
      }
    }));
  }

  function handleResetDraft() {
    setDraft({
      ...createDefaultDraft(durationMinutes),
      topicTitle: draft.topicTitle
    });
  }

  const isLowTime = secondsLeft > 0 && secondsLeft <= 60;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Lewa strefa: Temat wylosowany na egzamin + Interaktywny Timer prezentacji */}
        <div className="space-y-6 lg:col-span-5">
          {/* Karta wyboru / losowania tematu */}
          <section
            aria-label="Temat wystąpienia egzaminacyjnego"
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Symulator Wystąpienia Egzaminacyjnego
                </p>
                <h2 className="font-display mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  Temat pokazu wykładu
                </h2>
              </div>

              <button
                type="button"
                onClick={handleDrawRandomTopic}
                className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <Dices className="h-4 w-4" aria-hidden="true" />
                <span>Wylosuj temat</span>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="preset-topic-select"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Przykładowe tematy egzaminacyjne ({EXAM_PRESENTATION_TOPICS.length})
                </label>
                <select
                  id="preset-topic-select"
                  value={selectedPresetId}
                  onChange={(e) => handlePickPreset(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {EXAM_PRESENTATION_TOPICS.map((topic, idx) => (
                    <option key={topic.id} value={topic.id}>
                      {idx + 1}. [{topic.category}] {topic.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="custom-topic-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Aktualny temat wystąpienia (możesz wpisać własny)
                </label>
                <textarea
                  id="custom-topic-input"
                  rows={2}
                  value={draft.topicTitle}
                  onChange={(e) => setDraft((prev) => ({ ...prev, topicTitle: e.target.value }))}
                  placeholder="Wpisz własny temat pokazu zajęć teoretycznych..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {activePreset && draft.topicTitle.trim() === activePreset.title && (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <strong className="font-semibold text-slate-800 dark:text-slate-200">
                    Na co zwraca uwagę komisja:
                  </strong>{' '}
                  {activePreset.hint}
                </p>
              )}
            </div>
          </section>

          {/* Karta Interaktywnego Timera Prezentacji */}
          <section
            aria-label="Timer prezentacji"
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Timer prezentacji
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                aria-label={soundEnabled ? 'Wycisz sygnał końca czasu' : 'Włącz sygnał końca czasu'}
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                    <span>Dźwięk wł.</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>Wyciszony</span>
                  </>
                )}
              </button>
            </div>

            {/* Wybór czasu: 10 / 15 / 20 min */}
            <div
              role="group"
              aria-label="Czas trwania wystąpienia"
              className="mt-4 grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-950"
            >
              {([10, 15, 20] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectDuration(mins)}
                  className={`h-9 cursor-pointer rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    durationMinutes === mins
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>

            {/* Zegar główny */}
            <div
              className={`mt-5 rounded-xl border p-5 text-center transition-colors ${
                timerFinished
                  ? 'border-red-300 bg-red-50/80 dark:border-red-800 dark:bg-red-950/35'
                  : isLowTime
                    ? 'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
              }`}
            >
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {currentPhaseLabel}
              </p>
              <p
                className={`font-mono mt-1 text-5xl font-extrabold tracking-tight tabular-nums ${
                  timerFinished
                    ? 'text-red-700 dark:text-red-400'
                    : isLowTime
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-900 dark:text-white'
                }`}
              >
                {formatTimer(secondsLeft)}
              </p>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full transition-all ${
                    timerFinished
                      ? 'bg-red-600 dark:bg-red-500'
                      : isLowTime
                        ? 'bg-amber-500'
                        : 'bg-blue-700 dark:bg-blue-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {timerFinished && (
                <p
                  role="status"
                  className="mt-3 text-xs font-semibold text-red-700 dark:text-red-300"
                >
                  Czas wystąpienia dobiegł końca — przejdź do podsumowania i pytań komisji.
                </p>
              )}
            </div>

            {/* Przyciski sterujące: Start / Pauza / Reset */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={timerRunning || secondsLeft === 0}
                onClick={() => {
                  setTimerFinished(false);
                  setTimerRunning(true);
                }}
                className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white whitespace-nowrap hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{elapsedSeconds > 0 && secondsLeft > 0 ? 'Wznów' : 'Start'}</span>
              </button>

              <button
                type="button"
                disabled={!timerRunning}
                onClick={() => setTimerRunning(false)}
                className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 whitespace-nowrap hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pauza</span>
              </button>

              <button
                type="button"
                onClick={handleResetTimer}
                className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>
          </section>
        </div>

        {/* Prawa strefa: Rozwijana Checklista Konspektu Lekcji */}
        <section
          aria-label="Checklista Konspektu Lekcji"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-7 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <FileText
                className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400"
                aria-hidden="true"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-semibold text-blue-700 tabular-nums dark:text-blue-400">
                    Ukończono {completedChecklistCount}/5 punktów
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Zapis automatyczny w przeglądarce</span>
                </div>
                <h2 className="font-display mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  Checklista Konspektu Lekcji
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDraft}
                title="Wyczyść wpisany konspekt"
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Wyczyść</span>
              </button>

              <button
                type="button"
                onClick={() => setChecklistExpanded((v) => !v)}
                aria-expanded={checklistExpanded}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {checklistExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    <span>Zwiń konspekt</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    <span>Rozwiń konspekt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {checklistExpanded && (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* 1. Temat i cel ogólny */}
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    1. Temat i cel ogólny zajęć
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleStepChecked(1)}
                    className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {draft.checkedSteps[1] ||
                    (draft.topicTitle.trim() && draft.generalGoal.trim()) ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>Gotowe</span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Wybrany temat: <strong className="text-slate-900 dark:text-slate-200">{draft.topicTitle || 'Nie wpisano tematu'}</strong>
                </p>

                <textarea
                  rows={2}
                  value={draft.generalGoal}
                  onChange={(e) => setDraft((prev) => ({ ...prev, generalGoal: e.target.value }))}
                  placeholder="Cel ogólny (np. Zapoznanie kursantów z zasadami bezpiecznego pokonywania skrzyżowań oraz kształcenie nawyku szczególnej ostrożności)..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* 2. Cele szczegółowe w kategorii wiedzy i postaw */}
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    2. Cele szczegółowe (kategoria wiedzy i postaw)
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleStepChecked(2)}
                    className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {draft.checkedSteps[2] ||
                    draft.knowledgeGoal.trim() ||
                    draft.attitudeGoal.trim() ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>Gotowe</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="knowledge-goal"
                      className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Kategoria wiedzy (poznawcze)
                    </label>
                    <textarea
                      id="knowledge-goal"
                      rows={3}
                      value={draft.knowledgeGoal}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, knowledgeGoal: e.target.value }))
                      }
                      placeholder="Kursant zna definicje, wymienia warunki, potrafi wskazać kolejność przejazdu..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="attitude-goal"
                      className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Kategoria postaw (wychowawcze / BRD)
                    </label>
                    <textarea
                      id="attitude-goal"
                      rows={3}
                      value={draft.attitudeGoal}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, attitudeGoal: e.target.value }))
                      }
                      placeholder="Kursant docenia kulturę jazdy, zachowuje cierpliwość wobec pieszych, unika ryzyka..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Metody nauczania */}
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    3. Metody nauczania
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleStepChecked(3)}
                    className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {draft.checkedSteps[3] ||
                    draft.methodsPodajaca ||
                    draft.methodsProblemowa ||
                    draft.methodsEksponujaca ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>Gotowe</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800/70">
                    <input
                      type="checkbox"
                      checked={draft.methodsPodajaca}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, methodsPodajaca: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span>
                      <strong className="block text-slate-900 dark:text-white">Podająca</strong>
                      <span className="text-slate-500 dark:text-slate-400">
                        wykład, pogadanka, objaśnienie
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800/70">
                    <input
                      type="checkbox"
                      checked={draft.methodsProblemowa}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, methodsProblemowa: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span>
                      <strong className="block text-slate-900 dark:text-white">Problemowa</strong>
                      <span className="text-slate-500 dark:text-slate-400">
                        analiza sytuacji, dyskusja
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800/70">
                    <input
                      type="checkbox"
                      checked={draft.methodsEksponujaca}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, methodsEksponujaca: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span>
                      <strong className="block text-slate-900 dark:text-white">Eksponująca</strong>
                      <span className="text-slate-500 dark:text-slate-400">
                        pokaz, film, plansza, prezentacja
                      </span>
                    </span>
                  </label>
                </div>

                <input
                  type="text"
                  value={draft.methodsNotes}
                  onChange={(e) => setDraft((prev) => ({ ...prev, methodsNotes: e.target.value }))}
                  placeholder="Uwagi do metod (np. w 5. minucie krótkie pytanie problemowe do grupy)..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* 4. Środki dydaktyczne */}
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    4. Środki dydaktyczne
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleStepChecked(4)}
                    className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {draft.checkedSteps[4] ||
                    draft.selectedAids.length > 0 ||
                    draft.customAids.trim() ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>Gotowe</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TEACHING_AIDS_OPTIONS.map((aid) => {
                    const active = draft.selectedAids.includes(aid);
                    return (
                      <button
                        key={aid}
                        type="button"
                        onClick={() => toggleTeachingAid(aid)}
                        className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        {aid}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={draft.customAids}
                  onChange={(e) => setDraft((prev) => ({ ...prev, customAids: e.target.value }))}
                  placeholder="Inne pomoce (np. trójkąt ostrzegawczy, kamera samochodowa, schemat ronda)..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* 5. Przebieg zajęć z podziałem na minuty */}
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    5. Przebieg zajęć z podziałem na minuty
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleStepChecked(5)}
                    className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {draft.checkedSteps[5] ||
                    draft.introNotes.trim() ||
                    draft.mainNotes.trim() ||
                    draft.summaryNotes.trim() ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>Gotowe</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Wstęp */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        A. Wstęp (powitanie, nawiązanie do poprzednich zajęć, podanie tematu i celów)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={30}
                          aria-label="Czas trwania wstępu w minutach"
                          value={draft.introMinutes}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, introMinutes: e.target.value }))
                          }
                          className="font-mono h-7 w-14 rounded border border-slate-200 bg-white px-2 text-right text-xs font-semibold text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400">min</span>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={draft.introNotes}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, introNotes: e.target.value }))
                      }
                      placeholder="Szybkie pytanie na rozgrzewkę lub przykład z codziennej jazdy..."
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Część główna */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        B. Część główna (realizacja zagadnień w punktach, przykłady, rysunek na tablicy)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          aria-label="Czas trwania części głównej w minutach"
                          value={draft.mainMinutes}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, mainMinutes: e.target.value }))
                          }
                          className="font-mono h-7 w-14 rounded border border-slate-200 bg-white px-2 text-right text-xs font-semibold text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400">min</span>
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={draft.mainNotes}
                      onChange={(e) => setDraft((prev) => ({ ...prev, mainNotes: e.target.value }))}
                      placeholder="1) Podstawa prawna i definicje, 2) Rozrysowanie sytuacji na tablicy, 3) Najczęstsze błędy kierowców..."
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Podsumowanie */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        C. Podsumowanie (utrwalenie najważniejszych wniosków, pytania kontrolne do grupy)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          aria-label="Czas trwania podsumowania w minutach"
                          value={draft.summaryMinutes}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, summaryMinutes: e.target.value }))
                          }
                          className="font-mono h-7 w-14 rounded border border-slate-200 bg-white px-2 text-right text-xs font-semibold text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400">min</span>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={draft.summaryNotes}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, summaryNotes: e.target.value }))
                      }
                      placeholder="2 pytania sprawdzające zrozumienie + podsumowanie kluczowej zasady bezpieczeństwa..."
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

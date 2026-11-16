import {
  BookmarkPlus,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Dices,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Lightbulb,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_EXAM_TOPICS } from '../data/knowledgePracticeData';
import { saveUserOutlines } from '../services/firestoreService';
import { ExamTopic, LessonPlanDraft, SavedOutlineEntry, UserProgress } from '../types';
import { MarkdownContent } from './MarkdownContent';

interface LectureSimulatorSectionProps {
  examTopics: ExamTopic[];
  preselectedTopicId?: string | null;
  onPreselectedTopicConsumed?: () => void;
  progress: UserProgress;
  isGuest: boolean;
  onProgressChange: (next: UserProgress) => void;
}

const DRAFT_STORAGE_KEY = 'instruktor_pro_lesson_plan_draft_v2';
const SAVED_LIST_STORAGE_KEY = 'instruktor_pro_saved_outlines_list_v1';

const TEACHING_AIDS_OPTIONS = [
  'Tablica suchościeralna i markery',
  'Plansze ze znakami drogowymi',
  'Modele pojazdów i skrzyżowania',
  'Prezentacja multimedialna / rzutnik',
  'Ustawa Prawo o ruchu drogowym',
  'Fantom RKO i apteczka'
];

function getTimingSplit(durationMin: 10 | 15 | 20): {
  intro: number;
  main: number;
  summary: number;
} {
  if (durationMin === 10) return { intro: 2, main: 6, summary: 2 };
  if (durationMin === 20) return { intro: 3, main: 14, summary: 3 };
  return { intro: 2, main: 11, summary: 2 };
}

function createEmptyDraft(topicTitle: string, durationMin: 10 | 15 | 20 = 15): LessonPlanDraft {
  const timing = getTimingSplit(durationMin);
  return {
    topicTitle,
    generalGoal: '',
    knowledgeGoal: '',
    attitudeGoal: '',
    methodsPodajaca: false,
    methodsProblemowa: false,
    methodsEksponujaca: false,
    methodsNotes: '',
    selectedAids: [],
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

function loadSavedDraft(fallbackTopicTitle: string): LessonPlanDraft {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return createEmptyDraft(fallbackTopicTitle, 15);
    const parsed = JSON.parse(raw) as Partial<LessonPlanDraft>;
    return {
      ...createEmptyDraft(fallbackTopicTitle, 15),
      ...parsed,
      selectedAids: Array.isArray(parsed.selectedAids) ? parsed.selectedAids : [],
      checkedSteps:
        parsed.checkedSteps && typeof parsed.checkedSteps === 'object' ? parsed.checkedSteps : {}
    };
  } catch {
    return createEmptyDraft(fallbackTopicTitle, 15);
  }
}

function loadSavedOutlinesList(): SavedOutlineEntry[] {
  try {
    const raw = localStorage.getItem(SAVED_LIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as SavedOutlineEntry[]).slice(0, 50).map((entry) => ({
      ...entry,
      updatedAt: entry.updatedAt || entry.savedAtIso || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

function computeCompletedStepsCount(draft: LessonPlanDraft): number {
  const step1 = Boolean(draft.topicTitle.trim() && draft.generalGoal.trim());
  const step2 = Boolean(draft.knowledgeGoal.trim() || draft.attitudeGoal.trim());
  const step3 = draft.methodsPodajaca || draft.methodsProblemowa || draft.methodsEksponujaca;
  const step4 = draft.selectedAids.length > 0 || Boolean(draft.customAids.trim());
  const step5 = Boolean(
    draft.introNotes.trim() || draft.mainNotes.trim() || draft.summaryNotes.trim()
  );
  const autoStates = [step1, step2, step3, step4, step5];
  return autoStates.filter((filled, idx) => Boolean(draft.checkedSteps[idx + 1]) || filled).length;
}

function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatSavedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
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

export function LectureSimulatorSection({
  examTopics,
  preselectedTopicId,
  onPreselectedTopicConsumed,
  progress,
  isGuest,
  onProgressChange
}: LectureSimulatorSectionProps) {
  const topics = useMemo(() => {
    const source = examTopics.length > 0 ? examTopics : DEFAULT_EXAM_TOPICS;
    return [...source].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl'));
  }, [examTopics]);

  const initialTopic = topics[0] ?? DEFAULT_EXAM_TOPICS[0];

  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialTopic.id);
  const [durationMinutes, setDurationMinutes] = useState<10 | 15 | 20>(15);
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [checklistExpanded, setChecklistExpanded] = useState(true);
  const [showSampleHint, setShowSampleHint] = useState(false);
  const [draft, setDraft] = useState<LessonPlanDraft>(() => loadSavedDraft(initialTopic.title));
  const [guestSavedOutlines, setGuestSavedOutlines] = useState<SavedOutlineEntry[]>(() =>
    loadSavedOutlinesList()
  );
  const [savedListExpanded, setSavedListExpanded] = useState(false);
  const [savingOutline, setSavingOutline] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const savedOutlines = useMemo(
    () => (isGuest ? guestSavedOutlines : (progress.savedOutlines ?? [])),
    [isGuest, guestSavedOutlines, progress.savedOutlines]
  );

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Obsługa przejścia z Bazy Wiedzy -> "Przećwicz ten temat na Egzaminie"
  useEffect(() => {
    if (!preselectedTopicId) return;
    const found = topics.find((t) => t.id === preselectedTopicId);
    if (found) {
      setSelectedPresetId(found.id);
      setDraft(createEmptyDraft(found.title, durationMinutes));
      setShowSampleHint(false);
      setSaveFeedback(null);
      setSaveError(null);
      setTimerRunning(false);
      setTimerFinished(false);
      setSecondsLeft(durationMinutes * 60);
    }
    onPreselectedTopicConsumed?.();
  }, [preselectedTopicId, topics, durationMinutes, onPreselectedTopicConsumed]);

  // Zapis roboczy bieżącego konspektu w localStorage (bufor podczas pisania)
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignorujemy brak miejsca w localStorage
    }
  }, [draft]);

  // Zapis listy konspektów w localStorage wyłącznie w trybie gościa (fallback)
  useEffect(() => {
    if (!isGuest) return;
    try {
      localStorage.setItem(SAVED_LIST_STORAGE_KEY, JSON.stringify(guestSavedOutlines));
    } catch {
      // Ignorujemy brak miejsca w localStorage
    }
  }, [isGuest, guestSavedOutlines]);

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

  const matchedTopic = useMemo(() => {
    const trimmedTitle = draft.topicTitle.trim().toLowerCase();
    const byId = topics.find((t) => t.id === selectedPresetId);
    if (byId && byId.title.trim().toLowerCase() === trimmedTitle) {
      return byId;
    }
    return topics.find((t) => t.title.trim().toLowerCase() === trimmedTitle) ?? null;
  }, [topics, selectedPresetId, draft.topicTitle]);

  const totalSeconds = durationMinutes * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);
  const progressPct =
    totalSeconds > 0 ? Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100)) : 0;

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

  const completedChecklistCount = useMemo(() => computeCompletedStepsCount(draft), [draft]);

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
    if (topics.length === 0) return;
    const pool = topics.length > 1 ? topics.filter((t) => t.id !== selectedPresetId) : topics;
    const picked = pool[Math.floor(Math.random() * pool.length)] ?? topics[0];
    setSelectedPresetId(picked.id);
    setShowSampleHint(false);
    setSaveFeedback(null);
    setDraft((prev) => ({ ...prev, topicTitle: picked.title }));
  }

  function handlePickPreset(topicId: string) {
    setSelectedPresetId(topicId);
    setShowSampleHint(false);
    setSaveFeedback(null);
    const found = topics.find((t) => t.id === topicId);
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
    setSaveFeedback(null);
    setDraft(createEmptyDraft(draft.topicTitle, durationMinutes));
  }

  async function handleSaveCurrentToList() {
    if (savingOutline) return;
    const cleanTitle = draft.topicTitle.trim() || 'Własny temat wystąpienia';
    const entry: SavedOutlineEntry = {
      id: `outline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      topicTitle: cleanTitle,
      updatedAt: new Date().toISOString(),
      durationMinutes,
      completedSteps: completedChecklistCount,
      draft: {
        ...draft,
        topicTitle: cleanTitle
      }
    };

    setSaveError(null);
    if (isGuest) {
      setGuestSavedOutlines((prev) => [entry, ...prev].slice(0, 50));
      setSavedListExpanded(true);
      setSaveFeedback(`Zapisano konspekt „${cleanTitle}” lokalnie w przeglądarce (tryb gościa).`);
      return;
    }

    setSavingOutline(true);
    try {
      const nextList = [entry, ...(progress.savedOutlines ?? [])].slice(0, 50);
      const updated = await saveUserOutlines(progress, nextList);
      onProgressChange(updated);
      setSavedListExpanded(true);
      setSaveFeedback(
        `Zapisano konspekt „${cleanTitle}” na Twoim koncie (zsynchronizowano z chmurą).`
      );
    } catch (err) {
      console.error('Nie udało się zapisać konspektu w Firestore:', err);
      setSaveError('Nie udało się zapisać konspektu na koncie. Spróbuj ponownie.');
    } finally {
      setSavingOutline(false);
    }
  }

  function handleLoadSavedOutline(entry: SavedOutlineEntry) {
    setDurationMinutes(entry.durationMinutes);
    setSecondsLeft(entry.durationMinutes * 60);
    setTimerRunning(false);
    setTimerFinished(false);
    setDraft({
      ...entry.draft,
      selectedAids: Array.isArray(entry.draft.selectedAids) ? entry.draft.selectedAids : [],
      checkedSteps:
        entry.draft.checkedSteps && typeof entry.draft.checkedSteps === 'object'
          ? entry.draft.checkedSteps
          : {}
    });
    const match = topics.find(
      (t) => t.title.trim().toLowerCase() === entry.topicTitle.trim().toLowerCase()
    );
    if (match) {
      setSelectedPresetId(match.id);
    }
    setShowSampleHint(false);
    setSaveError(null);
    setSaveFeedback(`Wczytano zapisany konspekt „${entry.topicTitle}”.`);
  }

  async function handleDeleteSavedOutline(entryId: string) {
    if (savingOutline) return;
    setSaveError(null);
    if (isGuest) {
      setGuestSavedOutlines((prev) => prev.filter((item) => item.id !== entryId));
      return;
    }

    setSavingOutline(true);
    try {
      const nextList = (progress.savedOutlines ?? []).filter((item) => item.id !== entryId);
      const updated = await saveUserOutlines(progress, nextList);
      onProgressChange(updated);
    } catch (err) {
      console.error('Nie udało się usunąć konspektu z Firestore:', err);
      setSaveError('Nie udało się usunąć konspektu z konta. Spróbuj ponownie.');
    } finally {
      setSavingOutline(false);
    }
  }

  const isLowTime = secondsLeft > 0 && secondsLeft <= 60;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Lewa strefa: Temat wylosowany na egzamin + Podpowiedź wzoru + Timer */}
        <div className="space-y-6 lg:col-span-5">
          {/* Karta wyboru / losowania tematu */}
          <section
            aria-label="Temat wystąpienia egzaminacyjnego"
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Część II Egzaminu · Pokaz przeprowadzenia zajęć
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
                  Tematy z bazy egzaminacyjnej ({topics.length})
                </label>
                <select
                  id="preset-topic-select"
                  value={selectedPresetId}
                  onChange={(e) => handlePickPreset(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {topics.map((topic, idx) => (
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

              {/* Ukryty domyślnie przycisk porównania ze wzorem konspektu */}
              {matchedTopic && (
                <div className="pt-1">
                  <button
                    type="button"
                    aria-expanded={showSampleHint}
                    onClick={() => setShowSampleHint((v) => !v)}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50/80 px-3.5 py-2.5 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200 dark:hover:bg-amber-950/60"
                  >
                    {showSampleHint ? (
                      <>
                        <EyeOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Ukryj wzór konspektu</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Podejrzyj wzór konspektu (podpowiedź)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Rozwijana podpowiedź wzorcowego konspektu (domyślnie ukryta) */}
          {matchedTopic && showSampleHint && (
            <section
              aria-label="Podgląd wzoru konspektu"
              className="space-y-4 rounded-xl border border-amber-300 bg-white p-5 dark:border-amber-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Wzór konspektu do porównania
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSampleHint(false)}
                  className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Zwiń
                </button>
              </div>

              {matchedTopic.commissionTips.trim().length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100">
                  <strong className="font-semibold">Na co zwraca uwagę komisja:</strong>{' '}
                  {matchedTopic.commissionTips}
                </div>
              )}

              {matchedTopic.sampleOutline.trim().length > 0 ? (
                <div className="max-h-[420px] overflow-y-auto pr-1">
                  <MarkdownContent content={matchedTopic.sampleOutline} />
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dla tego tematu nie dodano jeszcze pełnego wzoru konspektu — wykorzystaj powyższe wskazówki komisji oraz strukturę 5 punktów.
                </p>
              )}
            </section>
          )}

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

          {/* Lista zapisanych konspektów kursanta (Firestore dla zalogowanych, localStorage dla Gościa) */}
          <section
            aria-label="Moje zapisane konspekty"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setSavedListExpanded((v) => !v)}
              aria-expanded={savedListExpanded}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2.5">
                <FolderOpen className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Moje zapisane konspekty ({savedOutlines.length}/50)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isGuest
                      ? 'Tryb gościa (zapis lokalny w przeglądarce) — zaloguj się, aby synchronizować'
                      : 'Synchronizowane z Twoim kontem (telefon i komputer) — wczytaj szkic jednym kliknięciem'}
                  </p>
                </div>
              </div>
              {savedListExpanded ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              )}
            </button>

            {savedListExpanded && (
              <div className="border-t border-slate-200 dark:border-slate-800">
                {savedOutlines.length === 0 ? (
                  <p className="p-5 text-center text-xs text-slate-500 dark:text-slate-400">
                    Nie zapisałeś jeszcze żadnego konspektu na liście. Uzupełnij punkty po prawej i kliknij „Zapisz mój konspekt na liście”.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {savedOutlines.map((entry) => (
                      <div key={entry.id} className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {entry.topicTitle}
                            </p>
                            <p className="font-mono mt-0.5 text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                              {formatSavedDate(entry.updatedAt || entry.savedAtIso || '')} ·{' '}
                              {entry.durationMinutes} min · {entry.completedSteps}/5 pkt
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadSavedOutline(entry)}
                            className="cursor-pointer rounded-md border border-blue-600 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                          >
                            Wczytaj do edytora
                          </button>
                          <button
                            type="button"
                            disabled={savingOutline}
                            onClick={() => void handleDeleteSavedOutline(entry.id)}
                            aria-label={`Usuń zapisany konspekt: ${entry.topicTitle}`}
                            className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                            <span>Usuń</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Prawa strefa: Pusta Checklista Konspektu Lekcji do ćwiczenia z pamięci */}
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
                  <span>
                    {isGuest
                      ? 'Ćwiczenie z pamięci (zapis w przeglądarce)'
                      : 'Ćwiczenie z pamięci (zapis na koncie)'}
                  </span>
                </div>
                <h2 className="font-display mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  Mój Konspekt Lekcji
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={savingOutline}
                onClick={() => void handleSaveCurrentToList()}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {savingOutline ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{savingOutline ? 'Zapisywanie...' : 'Zapisz mój konspekt na liście'}</span>
              </button>

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
                    <span>Zwiń</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    <span>Rozwiń</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {saveError && (
            <div
              role="alert"
              className="border-b border-red-200 bg-red-50 px-5 py-2.5 text-xs font-medium text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            >
              {saveError}
            </div>
          )}

          {saveFeedback && (
            <div
              role="status"
              className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{saveFeedback}</span>
            </div>
          )}

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
                  Wybrany temat:{' '}
                  <strong className="text-slate-900 dark:text-slate-200">
                    {draft.topicTitle || 'Nie wpisano tematu'}
                  </strong>
                </p>

                <textarea
                  rows={2}
                  value={draft.generalGoal}
                  onChange={(e) => setDraft((prev) => ({ ...prev, generalGoal: e.target.value }))}
                  placeholder="Wpisz z pamięci cel ogólny zajęć..."
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
                      placeholder="Kursant definiuje, wymienia, rozpoznaje..."
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
                      placeholder="Kursant kształtuje nawyk, docenia bezpieczeństwo..."
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
                  placeholder="Uwagi do wybranych metod nauczania..."
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
                  placeholder="Inne pomoce dydaktyczne..."
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
                        A. Wstęp (powitanie, nawiązanie, podanie tematu i celów)
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
                      placeholder="Szybkie pytanie na rozgrzewkę i wprowadzenie..."
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Część główna */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        B. Część główna (zagadnienia, przykłady, rysunek na tablicy)
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
                      placeholder="1) Podstawa prawna, 2) Rozrysowanie sytuacji, 3) Błędy kierowców..."
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Podsumowanie */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        C. Podsumowanie (utrwalenie wniosków, pytania kontrolne)
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
                      placeholder="Pytania sprawdzające zrozumienie + kluczowy wniosek BRD..."
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

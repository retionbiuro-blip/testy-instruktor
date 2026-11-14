import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  FileJson,
  FolderPlus,
  ImagePlus,
  Inbox,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { FIRESTORE_BATCH_LIMIT } from '../config';
import { saveQuestionsToCache, setLocalDbVersion } from '../lib/indexedDb';
import {
  SAMPLE_QUESTIONS_JSON,
  compressImageToBase64,
  computeQuestionHash,
  generateQuestionId,
  parseImportedQuestionsJson
} from '../lib/questionUtils';
import {
  batchImportQuestions,
  deleteAdminQuestion,
  deleteReport,
  saveAdminQuestion,
  saveCategoriesList,
  updateReportStatus
} from '../services/firestoreService';
import { ParsedQuestionInput, Question, ReportItem } from '../types';

interface AdminPanelProps {
  questions: Question[];
  categories: string[];
  reports: ReportItem[];
  onQuestionsUpdated: (nextQuestions: Question[], nextCategories: string[], nextVersion: number) => void;
  onReportsUpdated: (nextReports: ReportItem[]) => void;
  onRefreshReports: () => Promise<void>;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function AdminPanel({
  questions,
  categories,
  reports,
  onQuestionsUpdated,
  onReportsUpdated,
  onRefreshReports
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'questions' | 'categories' | 'reports'>('import');

  // --- STAN ZAKŁADKI 1: MASOWY IMPORT JSON ---
  const [overrideCategoryMode, setOverrideCategoryMode] = useState<'keep' | 'existing' | 'custom'>('keep');
  const [overrideExistingCategory, setOverrideExistingCategory] = useState(categories[0] ?? 'Ogólne / Mix');
  const [overrideCustomCategory, setOverrideCustomCategory] = useState('');
  const [rawJsonText, setRawJsonText] = useState('');
  const [importParseError, setImportParseError] = useState<string | null>(null);
  const [parsePreview, setParsePreview] = useState<{
    uniqueNew: ParsedQuestionInput[];
    skippedDbDuplicates: number;
    internalDuplicates: number;
    rejected: number;
    errors: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    completedBatches: number;
    totalBatches: number;
    savedItems: number;
  } | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  // --- STAN ZAKŁADKI 2: ZARZĄDZANIE PYTANIAMI I OBRAZKAMI ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('__ALL__');
  const [onlyImagePlaceholder, setOnlyImagePlaceholder] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [compressingImg, setCompressingImg] = useState(false);
  const [compressedImgInfo, setCompressedImgInfo] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  // --- STAN ZAKŁADKI 3: KATEGORIE ---
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState('');
  const [savingCategories, setSavingCategories] = useState(false);

  // --- STAN ZAKŁADKI 4: ZGŁOSZENIA ---
  const [reportFilter, setReportFilter] = useState<'open' | 'resolved' | 'all'>('open');

  const existingHashes = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      set.add(q.questionHash || computeQuestionHash(q.question));
    }
    return set;
  }, [questions]);

  const allCategoryNames = useMemo(() => {
    return Array.from(new Set([...categories, ...questions.map((q) => q.category)])).filter(Boolean);
  }, [categories, questions]);

  // Analiza tekstu JSON pod kątem duplikatów i podglądu 5 pierwszych pytań
  function analyzeJson(text: string, modeOverride?: 'keep' | 'existing' | 'custom', customVal?: string, existingVal?: string) {
    setImportParseError(null);
    setImportSummary(null);
    if (!text.trim()) {
      setParsePreview(null);
      return;
    }

    const effMode = modeOverride ?? overrideCategoryMode;
    const effOverride =
      effMode === 'existing'
        ? existingVal ?? overrideExistingCategory
        : effMode === 'custom'
          ? customVal ?? overrideCustomCategory
          : undefined;

    try {
      const result = parseImportedQuestionsJson(text, effOverride);
      let skippedDbDuplicates = 0;
      const uniqueNew: ParsedQuestionInput[] = [];

      for (const item of result.parsed) {
        if (existingHashes.has(item.questionHash)) {
          skippedDbDuplicates++;
        } else {
          uniqueNew.push(item);
        }
      }

      setParsePreview({
        uniqueNew,
        skippedDbDuplicates,
        internalDuplicates: result.internalDuplicates,
        rejected: result.rejected,
        errors: result.errors
      });
    } catch (err) {
      setParsePreview(null);
      setImportParseError(err instanceof Error ? err.message : 'Błąd odczytu JSON');
    }
  }

  async function handleJsonFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawJsonText(text);
    analyzeJson(text);
    e.target.value = '';
  }

  function handleLoadStarterSampleIntoEditor() {
    const formatted = JSON.stringify(SAMPLE_QUESTIONS_JSON, null, 2);
    setRawJsonText(formatted);
    analyzeJson(formatted);
  }

  function handleDownloadSampleJson() {
    const blob = new Blob([JSON.stringify(SAMPLE_QUESTIONS_JSON, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'szablon_pytan_instruktor.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCommitBatchImport() {
    if (!parsePreview || parsePreview.uniqueNew.length === 0 || importing) return;
    setImporting(true);
    setImportProgress({
      completedBatches: 0,
      totalBatches: Math.ceil(parsePreview.uniqueNew.length / FIRESTORE_BATCH_LIMIT),
      savedItems: 0
    });
    setImportSummary(null);

    try {
      const { addedQuestions, nextVersion, nextCategories, batchCount } =
        await batchImportQuestions(
          parsePreview.uniqueNew,
          allCategoryNames,
          (completedBatches, totalBatches, savedItems) => {
            setImportProgress({ completedBatches, totalBatches, savedItems });
          }
        );

      const updatedList = [...questions, ...addedQuestions];
      await saveQuestionsToCache(updatedList);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(updatedList, nextCategories, nextVersion);

      const totalSkipped = parsePreview.skippedDbDuplicates + parsePreview.internalDuplicates;
      setImportSummary(
        `Import zakończony! Dodano ${addedQuestions.length} nowych pytań w ${batchCount} paczkach (pominięto duplikatów: ${totalSkipped}). Wersja bazy: ${nextVersion}.`
      );
      setRawJsonText('');
      setParsePreview(null);
    } catch (err) {
      setImportParseError(
        err instanceof Error ? err.message : 'Wystąpił błąd podczas zapisu paczek do Firestore.'
      );
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  // --- EDYCJA I TWORZENIE PYTANIA ---
  function openNewQuestionModal() {
    setIsCreatingNew(true);
    setCompressedImgInfo(null);
    setEditorError(null);
    setEditingQuestion({
      id: generateQuestionId(0),
      questionHash: '',
      category: allCategoryNames[0] ?? 'Prawo o ruchu drogowym',
      question: '',
      options: ['', '', ''],
      correctAnswers: [0],
      hasImagePlaceholder: false,
      explanation: ''
    });
  }

  function openEditQuestionModal(q: Question) {
    setIsCreatingNew(false);
    setCompressedImgInfo(
      q.imageBase64
        ? `Obecny obrazek (~${Math.round((q.imageBase64.length * 3) / 4 / 1024)} KB)`
        : null
    );
    setEditorError(null);
    setEditingQuestion({
      ...q,
      options: [...q.options],
      correctAnswers: [...q.correctAnswers]
    });
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingQuestion) return;
    setCompressingImg(true);
    setEditorError(null);
    try {
      const result = await compressImageToBase64(file);
      setEditingQuestion({
        ...editingQuestion,
        imageBase64: result.base64,
        hasImagePlaceholder: false
      });
      setCompressedImgInfo(
        `Skompresowano do ${result.sizeKB} KB (${result.width}×${result.height} px)`
      );
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Nie udało się skompresować obrazka.');
    } finally {
      setCompressingImg(false);
      e.target.value = '';
    }
  }

  async function handleSaveEditedQuestion(e: FormEvent) {
    e.preventDefault();
    if (!editingQuestion || savingQuestion) return;

    const cleanQuestionText = editingQuestion.question.trim();
    const cleanOptions = editingQuestion.options.map((o) => o.trim()).filter(Boolean);
    const validCorrect = editingQuestion.correctAnswers.filter(
      (idx) => idx >= 0 && idx < cleanOptions.length
    );

    if (!cleanQuestionText) {
      setEditorError('Wpisz treść pytania.');
      return;
    }
    if (cleanOptions.length < 2) {
      setEditorError('Pytanie musi mieć co najmniej 2 niepuste odpowiedzi.');
      return;
    }
    if (validCorrect.length === 0 || validCorrect.length > 3) {
      setEditorError('Zaznacz od 1 do 3 poprawnych odpowiedzi.');
      return;
    }

    setSavingQuestion(true);
    setEditorError(null);
    try {
      const normalized: Question = {
        ...editingQuestion,
        question: cleanQuestionText,
        questionHash: computeQuestionHash(cleanQuestionText),
        category: editingQuestion.category.trim() || 'Ogólne / Mix',
        options: cleanOptions,
        correctAnswers: validCorrect.sort((a, b) => a - b),
        explanation: editingQuestion.explanation?.trim() || undefined
      };

      const { nextVersion, nextCategories } = await saveAdminQuestion(
        normalized,
        isCreatingNew,
        allCategoryNames
      );

      const nextList = isCreatingNew
        ? [normalized, ...questions]
        : questions.map((item) => (item.id === normalized.id ? normalized : item));

      await saveQuestionsToCache(nextList);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(nextList, nextCategories, nextVersion);
      setEditingQuestion(null);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Nie udało się zapisać pytania.');
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleDeleteQuestion(qId: string) {
    const nextVersion = await deleteAdminQuestion(qId);
    const nextList = questions.filter((q) => q.id !== qId);
    await saveQuestionsToCache(nextList);
    setLocalDbVersion(nextVersion);
    onQuestionsUpdated(nextList, allCategoryNames, nextVersion);
  }

  // --- KATEGORIE ---
  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed || allCategoryNames.includes(trimmed) || savingCategories) return;
    setSavingCategories(true);
    try {
      const nextCats = [...allCategoryNames, trimmed];
      const nextVersion = await saveCategoriesList(nextCats);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(questions, nextCats, nextVersion);
      setNewCategoryName('');
    } finally {
      setSavingCategories(false);
    }
  }

  async function handleRenameCategory(oldName: string) {
    const trimmed = renameTarget.trim();
    if (!trimmed || trimmed === oldName || savingCategories) {
      setRenamingCategory(null);
      return;
    }
    setSavingCategories(true);
    try {
      const nextCats = Array.from(
        new Set(allCategoryNames.map((c) => (c === oldName ? trimmed : c)))
      );
      const affected = questions.filter((q) => q.category === oldName);
      const nextVersion = await saveCategoriesList(nextCats, oldName, trimmed, affected);
      const nextQuestions = questions.map((q) =>
        q.category === oldName ? { ...q, category: trimmed } : q
      );
      await saveQuestionsToCache(nextQuestions);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(nextQuestions, nextCats, nextVersion);
      setRenamingCategory(null);
    } finally {
      setSavingCategories(false);
    }
  }

  async function handleDeleteEmptyCategory(catName: string) {
    const count = questions.filter((q) => q.category === catName).length;
    if (count > 0 || savingCategories) return;
    setSavingCategories(true);
    try {
      const nextCats = allCategoryNames.filter((c) => c !== catName);
      const nextVersion = await saveCategoriesList(nextCats);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(questions, nextCats, nextVersion);
    } finally {
      setSavingCategories(false);
    }
  }

  // --- ZGŁOSZENIA ---
  async function handleToggleReportStatus(r: ReportItem) {
    const nextStatus = r.status === 'open' ? 'resolved' : 'open';
    await updateReportStatus(r.id, nextStatus);
    onReportsUpdated(reports.map((item) => (item.id === r.id ? { ...item, status: nextStatus } : item)));
  }

  async function handleRemoveReport(reportId: string) {
    await deleteReport(reportId);
    onReportsUpdated(reports.filter((r) => r.id !== reportId));
  }

  // Filtrowana lista pytań w zakładce Zarządzanie
  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return questions.filter((q) => {
      if (onlyImagePlaceholder && !q.hasImagePlaceholder) return false;
      if (filterCategory !== '__ALL__' && q.category !== filterCategory) return false;
      if (qLower) {
        return (
          q.question.toLowerCase().includes(qLower) ||
          q.category.toLowerCase().includes(qLower) ||
          q.id.toLowerCase().includes(qLower)
        );
      }
      return true;
    });
  }, [questions, searchQuery, filterCategory, onlyImagePlaceholder]);

  const openReportsCount = reports.filter((r) => r.status === 'open').length;
  const placeholderCount = questions.filter((q) => q.hasImagePlaceholder).length;
  const visibleReports = reports.filter((r) =>
    reportFilter === 'all' ? true : r.status === reportFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Panel Administratora · Zarządzanie bazą pytań, obrazkami i zgłoszeniami
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Centrum administracyjne
          </h1>
        </div>

        {/* Zakładki panelu admina */}
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              activeTab === 'import'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              activeTab === 'questions'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Pytania i obrazki ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Kategorie ({allCategoryNames.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('reports');
              void onRefreshReports();
            }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Zgłoszenia ({openReportsCount})
          </button>
        </div>
      </div>

      {/* ZAKŁADKA 1: MASOWY IMPORT JSON */}
      {activeTab === 'import' && (
        <section className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Masowy import pytań z pliku JSON
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Automatyczne wykrywanie duplikatów (questionHash) oraz podział zapisu na paczki po maks. {FIRESTORE_BATCH_LIMIT} pytań.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleLoadStarterSampleIntoEditor}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Wczytaj 6 przykładowych pytań</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleJson}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Pobierz szablon JSON</span>
                </button>
              </div>
            </div>

            {/* Wybór nadpisania kategorii */}
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kategoria importowanych pytań
                </p>
                <select
                  value={overrideCategoryMode}
                  onChange={(e) => {
                    const nextMode = e.target.value as 'keep' | 'existing' | 'custom';
                    setOverrideCategoryMode(nextMode);
                    analyzeJson(rawJsonText, nextMode);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="keep">Zachowaj kategorie z pliku JSON</option>
                  <option value="existing">Nadpisz istniejącą kategorią</option>
                  <option value="custom">Nadpisz nową kategorią</option>
                </select>
              </div>

              {overrideCategoryMode === 'existing' && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Wybierz kategorię docelową
                  </p>
                  <select
                    value={overrideExistingCategory}
                    onChange={(e) => {
                      setOverrideExistingCategory(e.target.value);
                      analyzeJson(rawJsonText, 'existing', undefined, e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {allCategoryNames.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {overrideCategoryMode === 'custom' && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nazwa nowej kategorii
                  </p>
                  <input
                    type="text"
                    value={overrideCustomCategory}
                    onChange={(e) => {
                      setOverrideCustomCategory(e.target.value);
                      analyzeJson(rawJsonText, 'custom', e.target.value);
                    }}
                    placeholder="np. Przepisy szczegółowe"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Wgraj plik .json z dysku
                </p>
                <label className="flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-blue-400 bg-white px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-blue-950/30">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>Wybierz plik .json</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleJsonFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Pole tekstowe do wklejenia JSON */}
            <div>
              <label
                htmlFor="json-textarea"
                className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Lub wklej zawartość JSON bezpośrednio tutaj
              </label>
              <textarea
                id="json-textarea"
                rows={6}
                value={rawJsonText}
                onChange={(e) => {
                  setRawJsonText(e.target.value);
                  analyzeJson(e.target.value);
                }}
                placeholder='[{"category":"Prawo o ruchu drogowym","question":"Treść pytania...","options":["Odp A","Odp B","Odp C"],"correctAnswers":[0,2]}]'
                className="font-mono w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {importParseError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{importParseError}</span>
              </div>
            )}

            {importSummary && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{importSummary}</span>
              </div>
            )}

            {/* Raport walidacji + podgląd pierwszych 5 pytań */}
            {parsePreview && (
              <div className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Nowych do dodania</p>
                    <p className="font-mono mt-1 text-lg font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                      {parsePreview.uniqueNew.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Duplikaty (baza)</p>
                    <p className="font-mono mt-1 text-lg font-bold text-amber-700 tabular-nums dark:text-amber-400">
                      {parsePreview.skippedDbDuplicates}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Duplikaty (w pliku)</p>
                    <p className="font-mono mt-1 text-lg font-bold text-slate-700 tabular-nums dark:text-slate-300">
                      {parsePreview.internalDuplicates}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Liczba paczek (max {FIRESTORE_BATCH_LIMIT})</p>
                    <p className="font-mono mt-1 text-lg font-bold text-blue-700 tabular-nums dark:text-blue-400">
                      {Math.ceil(parsePreview.uniqueNew.length / FIRESTORE_BATCH_LIMIT)}
                    </p>
                  </div>
                </div>

                {parsePreview.errors.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <p className="font-semibold">Pominięte błędne pozycje ({parsePreview.rejected}):</p>
                    <ul className="mt-1 list-disc pl-4">
                      {parsePreview.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsePreview.uniqueNew.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Podgląd pierwszych {Math.min(5, parsePreview.uniqueNew.length)} pytań z zaznaczonymi poprawnymi odpowiedziami
                    </h3>

                    <div className="space-y-3">
                      {parsePreview.uniqueNew.slice(0, 5).map((q, idx) => (
                        <div
                          key={q.questionHash + idx}
                          className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-sm dark:border-slate-800 dark:bg-slate-950"
                        >
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                            #{idx + 1} · {q.category}
                            {q.hasImagePlaceholder ? ' · Wymaga obrazka' : ''}
                          </p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                            {q.question}
                          </p>
                          <ul className="mt-2 space-y-1 text-xs">
                            {q.options.map((opt, optIdx) => {
                              const isRight = q.correctAnswers.includes(optIdx);
                              return (
                                <li
                                  key={optIdx}
                                  className={`flex items-center gap-2 rounded px-2 py-1 ${
                                    isRight
                                      ? 'bg-emerald-100/80 font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {isRight && <Check className="h-3.5 w-3.5 shrink-0" />}
                                  <span>
                                    {OPTION_LETTERS[optIdx] ?? optIdx + 1}. {opt}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {importing && importProgress && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                          <span>
                            Zapisywanie paczki {importProgress.completedBatches} z {importProgress.totalBatches}...
                          </span>
                          <span className="font-mono tabular-nums">
                            {importProgress.savedItems} / {parsePreview.uniqueNew.length}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full bg-blue-700 transition-all dark:bg-blue-500"
                            style={{
                              width: `${Math.round(
                                (importProgress.savedItems / parsePreview.uniqueNew.length) * 100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={importing}
                      onClick={handleCommitBatchImport}
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600"
                    >
                      {importing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileJson className="h-4 w-4" />
                      )}
                      <span>
                        Zatwierdź i zapisz {parsePreview.uniqueNew.length} pytań do Firestore
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ZAKŁADKA 2: ZARZĄDZANIE PYTANIAMI I OBRAZKAMI */}
      {activeTab === 'questions' && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Szukaj po treści pytania lub kategorii..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="__ALL__">Wszystkie kategorie</option>
                {allCategoryNames.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setOnlyImagePlaceholder((v) => !v)}
                className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${
                  onlyImagePlaceholder
                    ? 'border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                }`}
              >
                <ImagePlus className="h-4 w-4" />
                <span>Tylko pytania wymagające obrazka ({placeholderCount})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={openNewQuestionModal}
              className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              <span>Dodaj pytanie</span>
            </button>
          </div>

          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {filteredQuestions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Brak pytań spełniających wybrane kryteria.
              </div>
            ) : (
              filteredQuestions.slice(0, 100).map((q) => (
                <div
                  key={q.id}
                  className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    {q.imageBase64 && (
                      <img
                        src={q.imageBase64}
                        alt="Miniatura pytania"
                        referrerPolicy="no-referrer"
                        className="h-14 w-20 shrink-0 rounded border border-slate-200 object-cover dark:border-slate-700"
                      />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {q.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Poprawne: {q.correctAnswers.map((i) => OPTION_LETTERS[i]).join(', ')}</span>
                        {q.hasImagePlaceholder && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              Wymaga wgrania obrazka
                            </span>
                          </>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                        {q.question}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditQuestionModal(q)}
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edytuj / Obrazek</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteQuestion(q.id)}
                      aria-label="Usuń pytanie"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {filteredQuestions.length > 100 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Wyświetlono pierwszych 100 wyników z {filteredQuestions.length}. Zawęź wyszukiwanie, aby zobaczyć pozostałe.
            </p>
          )}
        </section>
      )}

      {/* ZAKŁADKA 3: ZARZĄDZANIE KATEGORIAMI */}
      {activeTab === 'categories' && (
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={handleAddCategory} className="flex flex-wrap gap-3">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nazwa nowej kategorii..."
              maxLength={120}
              className="h-10 min-w-[240px] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim() || savingCategories}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 dark:bg-blue-600"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Dodaj kategorię</span>
            </button>
          </form>

          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {allCategoryNames.map((cat) => {
              const count = questions.filter((q) => q.category === cat).length;
              const isRenaming = renamingCategory === cat;
              return (
                <div
                  key={cat}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5"
                >
                  {isRenaming ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={renameTarget}
                        onChange={(e) => setRenameTarget(e.target.value)}
                        className="h-9 flex-1 rounded-md border border-blue-500 bg-white px-2.5 text-sm dark:bg-slate-950 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => void handleRenameCategory(cat)}
                        className="cursor-pointer rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Zapisz nazwę
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingCategory(null)}
                        className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                      >
                        Anuluj
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {cat}
                        </p>
                        <p className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                          {count} pytań
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingCategory(cat);
                            setRenameTarget(cat);
                          }}
                          className="cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Zmień nazwę
                        </button>
                        <button
                          type="button"
                          disabled={count > 0 || savingCategories}
                          title={
                            count > 0
                              ? 'Można usunąć tylko pustą kategorię'
                              : 'Usuń kategorię'
                          }
                          onClick={() => void handleDeleteEmptyCategory(cat)}
                          className="cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          Usuń
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ZAKŁADKA 4: SKRZYNKA ZGŁOSZEŃ BŁĘDÓW */}
      {activeTab === 'reports' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {(['open', 'resolved', 'all'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setReportFilter(status)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold ${
                    reportFilter === status
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {status === 'open' ? 'Otwarte' : status === 'resolved' ? 'Rozwiązane' : 'Wszystkie'}
                </button>
              ))}
            </div>
          </div>

          {visibleReports.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
              <Inbox className="mx-auto h-9 w-9 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Brak zgłoszeń w tym widoku.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleReports.map((r) => {
                const targetQuestion = questions.find((q) => q.id === r.questionId);
                return (
                  <article
                    key={r.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span
                          className={`font-semibold ${
                            r.status === 'open'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {r.status === 'open' ? 'Otwarte' : 'Rozwiązane'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Zgłosił: {r.reporterNick}</span>
                        <span aria-hidden="true">·</span>
                        <span>{r.category}</span>
                        {r.createdAt && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {r.createdAt.toLocaleDateString('pl-PL')}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {targetQuestion && (
                          <button
                            type="button"
                            onClick={() => openEditQuestionModal(targetQuestion)}
                            className="flex cursor-pointer items-center gap-1 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edytuj zgłoszone pytanie</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleToggleReportStatus(r)}
                          className="cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {r.status === 'open' ? 'Oznacz jako rozwiązane' : 'Otwórz ponownie'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemoveReport(r.id)}
                          aria-label="Usuń zgłoszenie"
                          className="cursor-pointer rounded-md border border-slate-200 p-1.5 text-slate-500 hover:text-red-600 dark:border-slate-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Pytanie: {r.questionSnippet}
                    </p>
                    <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                      {r.reason}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* MODAL EDYCJI / DODAWANIA PYTANIA Z KOMPRESJĄ OBRAZKA CANVAS */}
      {editingQuestion && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {isCreatingNew ? 'Dodaj nowe pytanie' : 'Edytuj pytanie i obrazek'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedQuestion} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kategoria
                </label>
                <input
                  list="admin-categories-datalist"
                  value={editingQuestion.category}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, category: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <datalist id="admin-categories-datalist">
                  {allCategoryNames.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Treść pytania
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingQuestion.question}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, question: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Opcje i poprawne odpowiedzi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Odpowiedzi (zaznacz 1–3 poprawne)
                  </span>
                  {editingQuestion.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingQuestion({
                          ...editingQuestion,
                          options: [...editingQuestion.options, '']
                        })
                      }
                      className="cursor-pointer text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                    >
                      + Dodaj opcję
                    </button>
                  )}
                </div>

                {editingQuestion.options.map((opt, idx) => {
                  const isCorrect = editingQuestion.correctAnswers.includes(idx);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const exists = editingQuestion.correctAnswers.includes(idx);
                          if (exists && editingQuestion.correctAnswers.length === 1) return;
                          if (!exists && editingQuestion.correctAnswers.length >= 3) return;
                          const nextCorrect = exists
                            ? editingQuestion.correctAnswers.filter((c) => c !== idx)
                            : [...editingQuestion.correctAnswers, idx];
                          setEditingQuestion({
                            ...editingQuestion,
                            correctAnswers: nextCorrect.sort((a, b) => a - b)
                          });
                        }}
                        title="Oznacz jako poprawną"
                        className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold ${
                          isCorrect
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950'
                        }`}
                      >
                        {OPTION_LETTERS[idx]}
                      </button>

                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const nextOpts = [...editingQuestion.options];
                          nextOpts[idx] = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: nextOpts });
                        }}
                        placeholder={`Treść odpowiedzi ${OPTION_LETTERS[idx]}`}
                        className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />

                      {editingQuestion.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextOpts = editingQuestion.options.filter((_, i) => i !== idx);
                            const nextCorrect = editingQuestion.correctAnswers
                              .filter((c) => c !== idx)
                              .map((c) => (c > idx ? c - 1 : c));
                            setEditingQuestion({
                              ...editingQuestion,
                              options: nextOpts,
                              correctAnswers: nextCorrect.length > 0 ? nextCorrect : [0]
                            });
                          }}
                          className="cursor-pointer p-1.5 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Obrazek z automatyczną kompresją Canvas do Base64 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Obrazek do pytania (bez Firebase Storage)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Automatyczna kompresja w przeglądarce (Canvas → WebP/JPEG, maks. 800 px, ~50–80 KB).
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-400">
                    {compressingImg ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                    <span>Wgraj JPG / PNG</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                {compressedImgInfo && (
                  <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                    {compressedImgInfo}
                  </p>
                )}

                {editingQuestion.imageBase64 && (
                  <div className="flex items-start gap-3">
                    <img
                      src={editingQuestion.imageBase64}
                      alt="Podgląd skompresowanego obrazka"
                      referrerPolicy="no-referrer"
                      className="max-h-40 rounded border border-slate-200 object-contain dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuestion({ ...editingQuestion, imageBase64: undefined });
                        setCompressedImgInfo(null);
                      }}
                      className="cursor-pointer rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                    >
                      Usuń obrazek
                    </button>
                  </div>
                )}

                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingQuestion.hasImagePlaceholder}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        hasImagePlaceholder: e.target.checked
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>Oznacz pytanie jako wymagające wgrania obrazka</span>
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Uzasadnienie / Podstawa prawna (opcjonalne)
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation ?? ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                  }
                  placeholder="Np. Art. 25 ust. 1 ustawy Prawo o ruchu drogowym..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {editorError && (
                <p className="text-sm text-red-600 dark:text-red-400">{editorError}</p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600"
                >
                  {savingQuestion && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Zapisz i podbij wersję bazy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

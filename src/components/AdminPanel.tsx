import {
  AlertTriangle,
  Car,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  FileJson,
  FolderInput,
  FolderPlus,
  History,
  ImageOff,
  ImagePlus,
  Images,
  Inbox,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { FIRESTORE_BATCH_LIMIT } from '../config';
import {
  LastBulkImageBatch,
  clearLastBulkImageBatch,
  getLastBulkImageBatch,
  saveQuestionsToCache,
  setLocalDbVersion
} from '../lib/indexedDb';
import {
  LICENSE_CATEGORY_OPTIONS,
  SAMPLE_QUESTIONS_JSON,
  compressImageToBase64,
  computeQuestionHash,
  formatLicenseCategoryLabel,
  generateQuestionId,
  parseImportedQuestionsJson
} from '../lib/questionUtils';
import {
  batchChangeQuestionsCategory,
  batchClearQuestionImages,
  batchDeleteQuestions,
  batchImportQuestions,
  batchUpdateQuestionsLicenseCategory,
  deleteAdminQuestion,
  deleteReport,
  replyToReport,
  saveAdminQuestion,
  saveCategoriesList,
  updateReportStatus
} from '../services/firestoreService';
import {
  ExamTopic,
  GlossaryTerm,
  LegalAct,
  Lesson,
  LicenseCategory,
  ParsedQuestionInput,
  Question,
  ReportItem
} from '../types';
import { DEFAULT_EXAM_TOPICS, DIDACTICS_GLOSSARY } from '../data/knowledgePracticeData';
import { AdminExamTopicsTab } from './AdminExamTopicsTab';
import { AdminGlossaryTab } from './AdminGlossaryTab';
import { AdminLegalActsTab } from './AdminLegalActsTab';
import { AdminMaterialsTab } from './AdminMaterialsTab';
import { BulkImageMatcher } from './BulkImageMatcher';
import { LicenseCategorySieve } from './LicenseCategorySieve';

interface AdminPanelProps {
  questions: Question[];
  lessons: Lesson[];
  legalActs: LegalAct[];
  examTopics: ExamTopic[];
  glossaryTerms: GlossaryTerm[];
  categories: string[];
  notebookLmUrl?: string;
  reports: ReportItem[];
  initialTab?:
    | 'import'
    | 'questions'
    | 'categories'
    | 'lessons'
    | 'legal-acts'
    | 'exam-topics'
    | 'glossary'
    | 'reports';
  onQuestionsUpdated: (nextQuestions: Question[], nextCategories: string[], nextVersion: number) => void;
  onLessonsUpdated: (nextLessons: Lesson[], nextCategories: string[], nextVersion: number) => void;
  onLegalActsUpdated: (nextActs: LegalAct[], nextVersion: number) => void;
  onExamTopicsUpdated: (nextTopics: ExamTopic[], nextVersion: number) => void;
  onGlossaryTermsUpdated: (nextTerms: GlossaryTerm[], nextVersion: number) => void;
  onNotebookLmUpdated: (nextUrl: string | undefined, nextVersion: number) => void;
  onReportsUpdated: (nextReports: ReportItem[]) => void;
  onRefreshReports: () => Promise<void>;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function AdminPanel({
  questions,
  lessons,
  legalActs,
  examTopics,
  glossaryTerms,
  categories,
  notebookLmUrl,
  reports,
  initialTab,
  onQuestionsUpdated,
  onLessonsUpdated,
  onLegalActsUpdated,
  onExamTopicsUpdated,
  onGlossaryTermsUpdated,
  onNotebookLmUpdated,
  onReportsUpdated,
  onRefreshReports
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<
    | 'import'
    | 'questions'
    | 'categories'
    | 'lessons'
    | 'legal-acts'
    | 'exam-topics'
    | 'glossary'
    | 'reports'
  >(initialTab ?? 'import');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      setBulkMatchMode(false);
      setSieveMode(false);
    }
  }, [initialTab]);

  // --- STAN ZAKŁADKI 1: MASOWY IMPORT JSON ---
  const [overrideCategoryMode, setOverrideCategoryMode] = useState<'keep' | 'existing' | 'custom'>('keep');
  const [overrideExistingCategory, setOverrideExistingCategory] = useState(categories[0] ?? 'Ogólne / Mix');
  const [overrideCustomCategory, setOverrideCustomCategory] = useState('');
  const [rawJsonText, setRawJsonText] = useState('');
  const [uploadedJsonFileName, setUploadedJsonFileName] = useState<string | null>(null);
  const [importParseError, setImportParseError] = useState<string | null>(null);
  const [parsePreview, setParsePreview] = useState<{
    uniqueNew: ParsedQuestionInput[];
    duplicates: {
      tempId: string;
      source: 'db' | 'file';
      item: ParsedQuestionInput;
    }[];
    forcedDuplicateIds: string[];
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

  // --- STAN ZAKŁADKI 2: ZARZĄDZANIE PYTANIAMI, MASOWA EDYCJA I OBRAZKI ---
  const [bulkMatchMode, setBulkMatchMode] = useState(false);
  const [sieveMode, setSieveMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('__ALL__');
  const [filterLicenseCategory, setFilterLicenseCategory] = useState<'__ALL__' | LicenseCategory>(
    '__ALL__'
  );
  const [onlyImagePlaceholder, setOnlyImagePlaceholder] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [showAllFiltered, setShowAllFiltered] = useState(false);
  const [bulkActionProcessing, setBulkActionProcessing] = useState(false);
  const [bulkStatusMessage, setBulkStatusMessage] = useState<string | null>(null);
  const [bulkErrorMessage, setBulkErrorMessage] = useState<string | null>(null);
  const [bulkCategoryModalOpen, setBulkCategoryModalOpen] = useState(false);
  const [bulkCategoryMode, setBulkCategoryMode] = useState<'existing' | 'custom'>('existing');
  const [bulkTargetExistingCategory, setBulkTargetExistingCategory] = useState(
    categories[0] ?? 'Ogólne / Mix'
  );
  const [bulkTargetCustomCategory, setBulkTargetCustomCategory] = useState('');
  const [bulkLicenseModalOpen, setBulkLicenseModalOpen] = useState(false);
  const [bulkTargetLicenseCategory, setBulkTargetLicenseCategory] = useState<LicenseCategory>('B');
  const [lastBulkImageBatch, setLastBulkImageBatch] = useState<LastBulkImageBatch | null>(() =>
    getLastBulkImageBatch()
  );
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    onConfirm: () => Promise<void>;
  } | null>(null);

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
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [replyFeedback, setReplyFeedback] = useState<{
    reportId: string;
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const existingHashes = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      // Zawsze przeliczamy hash z treści pytania i odpowiedzi wg nowego wzoru
      set.add(computeQuestionHash(q.question, q.options));
    }
    return set;
  }, [questions]);

  const allCategoryNames = useMemo(() => {
    return Array.from(new Set([...categories, ...questions.map((q) => q.category)])).filter(Boolean);
  }, [categories, questions]);

  // Paczki importów JSON wyliczone z pytań zapisanych w bazie
  const importBatches = useMemo(() => {
    const groups = new Map<
      string,
      { batchId: string; label: string; questionIds: string[]; timestamp: number }
    >();
    for (const q of questions) {
      if (!q.importBatchId) continue;
      const existing = groups.get(q.importBatchId);
      if (existing) {
        existing.questionIds.push(q.id);
      } else {
        const tsMatch = /^batch_(\d+)/.exec(q.importBatchId);
        groups.set(q.importBatchId, {
          batchId: q.importBatchId,
          label: q.importBatchLabel || q.importBatchId,
          questionIds: [q.id],
          timestamp: tsMatch ? Number(tsMatch[1]) : 0
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [questions]);

  // ID pytań z ostatniego hurtowego dodania obrazków, które wciąż mają obrazek do cofnięcia
  const undoableBulkImageIds = useMemo(() => {
    if (!lastBulkImageBatch || lastBulkImageBatch.questionIds.length === 0) return [];
    const targetSet = new Set(lastBulkImageBatch.questionIds);
    return questions
      .filter((q) => targetSet.has(q.id) && Boolean(q.imageBase64))
      .map((q) => q.id);
  }, [lastBulkImageBatch, questions]);

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
      const duplicates: {
        tempId: string;
        source: 'db' | 'file';
        item: ParsedQuestionInput;
      }[] = [];

      result.parsed.forEach((item, idx) => {
        if (existingHashes.has(item.questionHash)) {
          skippedDbDuplicates++;
          duplicates.push({
            tempId: `dup_db_${idx}`,
            source: 'db',
            item
          });
        } else {
          uniqueNew.push(item);
        }
      });

      result.internalDuplicateItems.forEach((item, idx) => {
        duplicates.push({
          tempId: `dup_file_${idx}`,
          source: 'file',
          item
        });
      });

      setParsePreview({
        uniqueNew,
        duplicates,
        forcedDuplicateIds: [],
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

  function toggleForceDuplicate(tempId: string) {
    setParsePreview((prev) => {
      if (!prev) return prev;
      const exists = prev.forcedDuplicateIds.includes(tempId);
      const nextForced = exists
        ? prev.forcedDuplicateIds.filter((id) => id !== tempId)
        : [...prev.forcedDuplicateIds, tempId];
      return { ...prev, forcedDuplicateIds: nextForced };
    });
  }

  function toggleForceAllDuplicates() {
    setParsePreview((prev) => {
      if (!prev) return prev;
      const allForced = prev.forcedDuplicateIds.length === prev.duplicates.length;
      return {
        ...prev,
        forcedDuplicateIds: allForced ? [] : prev.duplicates.map((d) => d.tempId)
      };
    });
  }

  async function handleJsonFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadedJsonFileName(file.name);
    setRawJsonText(text);
    analyzeJson(text);
    e.target.value = '';
  }

  function handleLoadStarterSampleIntoEditor() {
    const formatted = JSON.stringify(SAMPLE_QUESTIONS_JSON, null, 2);
    setUploadedJsonFileName('zestaw_startowy.json');
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
    if (!parsePreview || importing) return;
    const forcedItems = parsePreview.duplicates
      .filter((d) => parsePreview.forcedDuplicateIds.includes(d.tempId))
      .map((d) => d.item);
    const itemsToImport = [...parsePreview.uniqueNew, ...forcedItems];
    if (itemsToImport.length === 0) return;

    setImporting(true);
    setImportProgress({
      completedBatches: 0,
      totalBatches: Math.ceil(itemsToImport.length / FIRESTORE_BATCH_LIMIT),
      savedItems: 0
    });
    setImportSummary(null);

    const now = new Date();
    const importBatchId = `batch_${now.getTime()}`;
    const sourceLabel = uploadedJsonFileName || 'Wklejony JSON';
    const dateLabel = now.toLocaleString('pl-PL', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
    const importBatchLabel = `${sourceLabel} · ${dateLabel}`;

    try {
      const { addedQuestions, nextVersion, nextCategories, batchCount } =
        await batchImportQuestions(
          itemsToImport,
          allCategoryNames,
          (completedBatches, totalBatches, savedItems) => {
            setImportProgress({ completedBatches, totalBatches, savedItems });
          },
          { importBatchId, importBatchLabel }
        );

      const updatedList = [...questions, ...addedQuestions];
      await saveQuestionsToCache(updatedList);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(updatedList, nextCategories, nextVersion);

      const totalSkipped =
        parsePreview.duplicates.length - parsePreview.forcedDuplicateIds.length;
      setImportSummary(
        `Import zakończony! Dodano ${addedQuestions.length} pytań w ${batchCount} paczkach (${importBatchLabel}; ręcznie dopuszczonych duplikatów: ${forcedItems.length}, pominiętych: ${totalSkipped}). Wersja bazy: ${nextVersion}.`
      );
      setRawJsonText('');
      setUploadedJsonFileName(null);
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
      licenseCategory: 'B',
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
        questionHash: computeQuestionHash(cleanQuestionText, cleanOptions),
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

  async function handleReplyToReport(r: ReportItem) {
    const draft = (replyDrafts[r.id] ?? '').trim();
    if (!draft || sendingReplyId) return;
    setSendingReplyId(r.id);
    setReplyFeedback(null);
    try {
      await replyToReport(r, draft);
      const now = new Date();
      onReportsUpdated(
        reports.map((item) =>
          item.id === r.id
            ? {
                ...item,
                adminReply: draft,
                status: 'resolved',
                isReadByUser: false,
                repliedAt: now
              }
            : item
        )
      );
      setReplyDrafts((prev) => ({ ...prev, [r.id]: '' }));
      setReplyFeedback({
        reportId: r.id,
        type: 'ok',
        text: 'Wysłano odpowiedź kursantowi i oznaczono zgłoszenie jako załatwione.'
      });
    } catch (err) {
      setReplyFeedback({
        reportId: r.id,
        type: 'err',
        text: err instanceof Error ? err.message : 'Nie udało się wysłać odpowiedzi.'
      });
    } finally {
      setSendingReplyId(null);
    }
  }

  // --- MASOWE OPERACJE NA ZAZNACZONYCH PYTANIACH, PACZKACH IMPORTU I OBRAZKACH ---
  async function executeBulkClearImages(targetIds: string[], clearUndoStorage = false) {
    if (targetIds.length === 0 || bulkActionProcessing) return;
    setBulkActionProcessing(true);
    setBulkErrorMessage(null);
    setBulkStatusMessage(null);
    try {
      const nextVersion = await batchClearQuestionImages(targetIds);
      const idSet = new Set(targetIds);
      const nextList = questions.map((q) =>
        idSet.has(q.id)
          ? { ...q, imageBase64: undefined, hasImagePlaceholder: true }
          : q
      );
      await saveQuestionsToCache(nextList);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(nextList, allCategoryNames, nextVersion);
      setSelectedQuestionIds((prev) => prev.filter((id) => !idSet.has(id)));
      if (clearUndoStorage) {
        clearLastBulkImageBatch();
        setLastBulkImageBatch(null);
      }
      setBulkStatusMessage(
        `Wyczyszczono obrazki w ${targetIds.length} pytaniach i przywrócono je do puli czekających na ilustrację. Wersja bazy: ${nextVersion}.`
      );
    } catch (err) {
      setBulkErrorMessage(
        err instanceof Error ? err.message : 'Nie udało się usunąć obrazków.'
      );
    } finally {
      setBulkActionProcessing(false);
    }
  }

  async function executeBulkDeleteQuestions(targetIds: string[], customSuccessMsg?: string) {
    if (targetIds.length === 0 || bulkActionProcessing) return;
    setBulkActionProcessing(true);
    setBulkErrorMessage(null);
    setBulkStatusMessage(null);
    setImportParseError(null);
    setImportSummary(null);
    try {
      const nextVersion = await batchDeleteQuestions(targetIds);
      const idSet = new Set(targetIds);
      const nextList = questions.filter((q) => !idSet.has(q.id));
      await saveQuestionsToCache(nextList);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(nextList, allCategoryNames, nextVersion);
      setSelectedQuestionIds((prev) => prev.filter((id) => !idSet.has(id)));
      const msg =
        customSuccessMsg ??
        `Usunięto trwale ${targetIds.length} pytań z Firestore. Wersja bazy: ${nextVersion}.`;
      setBulkStatusMessage(msg);
      if (customSuccessMsg) {
        setImportSummary(`${msg} Wersja bazy: ${nextVersion}.`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Nie udało się usunąć pytań.';
      setBulkErrorMessage(errMsg);
      setImportParseError(errMsg);
    } finally {
      setBulkActionProcessing(false);
    }
  }

  async function handleBulkChangeCategorySubmit(e: FormEvent) {
    e.preventDefault();
    if (selectedQuestionIds.length === 0 || bulkActionProcessing) return;
    const targetCategory =
      bulkCategoryMode === 'existing'
        ? bulkTargetExistingCategory
        : bulkTargetCustomCategory.trim();
    if (!targetCategory) {
      setBulkErrorMessage('Wybierz lub wpisz nazwę nowej kategorii.');
      return;
    }

    setBulkActionProcessing(true);
    setBulkErrorMessage(null);
    setBulkStatusMessage(null);
    try {
      const { nextVersion, nextCategories } = await batchChangeQuestionsCategory(
        selectedQuestionIds,
        targetCategory,
        allCategoryNames
      );
      const idSet = new Set(selectedQuestionIds);
      const nextList = questions.map((q) =>
        idSet.has(q.id) ? { ...q, category: targetCategory } : q
      );
      await saveQuestionsToCache(nextList);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(nextList, nextCategories, nextVersion);
      setSelectedQuestionIds([]);
      setBulkCategoryModalOpen(false);
      setBulkTargetCustomCategory('');
      setBulkStatusMessage(
        `Zmieniono kategorię na „${targetCategory}” w ${idSet.size} pytaniach. Wersja bazy: ${nextVersion}.`
      );
    } catch (err) {
      setBulkErrorMessage(
        err instanceof Error ? err.message : 'Nie udało się zmienić kategorii.'
      );
    } finally {
      setBulkActionProcessing(false);
    }
  }

  async function handleBulkChangeLicenseCategorySubmit(e: FormEvent) {
    e.preventDefault();
    if (selectedQuestionIds.length === 0 || bulkActionProcessing) return;

    setBulkActionProcessing(true);
    setBulkErrorMessage(null);
    setBulkStatusMessage(null);
    try {
      const updates = selectedQuestionIds.map((questionId) => ({
        questionId,
        licenseCategory: bulkTargetLicenseCategory
      }));
      const nextVersion = await batchUpdateQuestionsLicenseCategory(updates);
      const idSet = new Set(selectedQuestionIds);
      const nextList = questions.map((q) =>
        idSet.has(q.id) ? { ...q, licenseCategory: bulkTargetLicenseCategory } : q
      );
      await saveQuestionsToCache(nextList);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(nextList, allCategoryNames, nextVersion);
      setSelectedQuestionIds([]);
      setBulkLicenseModalOpen(false);
      setBulkStatusMessage(
        `Zmieniono kategorię prawa jazdy na „${formatLicenseCategoryLabel(
          bulkTargetLicenseCategory
        )}” w ${idSet.size} pytaniach. Wersja bazy: ${nextVersion}.`
      );
    } catch (err) {
      setBulkErrorMessage(
        err instanceof Error ? err.message : 'Nie udało się zmienić kategorii prawa jazdy.'
      );
    } finally {
      setBulkActionProcessing(false);
    }
  }

  function requestUndoLastBulkImages() {
    if (undoableBulkImageIds.length === 0) return;
    setConfirmModal({
      title: 'Cofnij ostatnie hurtowe dodanie obrazków',
      description: `Czy na pewno wycofać ostatnie hurtowe przypisanie obrazków dla ${undoableBulkImageIds.length} pytań? Pole imageBase64 zostanie wyczyszczone (null), a pytania wrócą na listę oczekujących na obrazek.`,
      confirmLabel: `Cofnij ${undoableBulkImageIds.length} obrazków`,
      variant: 'warning',
      onConfirm: async () => {
        await executeBulkClearImages(undoableBulkImageIds, true);
      }
    });
  }

  // Filtrowana lista pytań w zakładce Zarządzanie
  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return questions.filter((q) => {
      if (onlyImagePlaceholder && (!q.hasImagePlaceholder || Boolean(q.imageBase64))) {
        return false;
      }
      if (filterCategory !== '__ALL__' && q.category !== filterCategory) return false;
      if (filterLicenseCategory !== '__ALL__') {
        const effectiveLc = q.licenseCategory ?? 'B';
        if (effectiveLc !== filterLicenseCategory) return false;
      }
      if (qLower) {
        return (
          q.question.toLowerCase().includes(qLower) ||
          q.category.toLowerCase().includes(qLower) ||
          q.id.toLowerCase().includes(qLower)
        );
      }
      return true;
    });
  }, [questions, searchQuery, filterCategory, filterLicenseCategory, onlyImagePlaceholder]);

  const visibleQuestions = useMemo(
    () => (showAllFiltered ? filteredQuestions : filteredQuestions.slice(0, 100)),
    [filteredQuestions, showAllFiltered]
  );

  const selectedIdSet = useMemo(() => new Set(selectedQuestionIds), [selectedQuestionIds]);
  const allFilteredSelected =
    filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedIdSet.has(q.id));

  function toggleQuestionSelection(id: string) {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredQuestions.map((q) => q.id));
      setSelectedQuestionIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      setSelectedQuestionIds((prev) =>
        Array.from(new Set([...prev, ...filteredQuestions.map((q) => q.id)]))
      );
    }
  }

  const openReportsCount = reports.filter((r) => r.status === 'open').length;
  const placeholderCount = questions.filter((q) => q.hasImagePlaceholder && !q.imageBase64).length;
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
            onClick={() => {
              setActiveTab('import');
              setBulkMatchMode(false);
              setSieveMode(false);
            }}
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
            onClick={() => {
              setActiveTab('categories');
              setBulkMatchMode(false);
              setSieveMode(false);
            }}
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
              setActiveTab('lessons');
              setBulkMatchMode(false);
              setSieveMode(false);
            }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              activeTab === 'lessons'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Materiały i NotebookLM ({lessons.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('legal-acts');
              setBulkMatchMode(false);
              setSieveMode(false);
            }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              activeTab === 'legal-acts'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Akty prawne ({legalActs.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('exam-topics');
              setBulkMatchMode(false);
              setSieveMode(false);
            }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              activeTab === 'exam-topics'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Konspekty i Tematy ({examTopics.length > 0 ? examTopics.length : DEFAULT_EXAM_TOPICS.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('glossary');
              setBulkMatchMode(false);
              setSieveMode(false);
            }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              activeTab === 'glossary'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Słownik / Fiszki ({glossaryTerms.length > 0 ? glossaryTerms.length : DIDACTICS_GLOSSARY.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('reports');
              setBulkMatchMode(false);
              setSieveMode(false);
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

      {/* ZAKŁADKA: MATERIAŁY DO NAUKI I NOTEBOOKLM */}
      {activeTab === 'lessons' && (
        <AdminMaterialsTab
          lessons={lessons}
          categories={allCategoryNames}
          notebookLmUrl={notebookLmUrl}
          onLessonsUpdated={onLessonsUpdated}
          onNotebookLmUpdated={onNotebookLmUpdated}
        />
      )}

      {/* ZAKŁADKA: AKTY PRAWNE */}
      {activeTab === 'legal-acts' && (
        <AdminLegalActsTab
          legalActs={legalActs}
          onLegalActsUpdated={onLegalActsUpdated}
        />
      )}

      {/* ZAKŁADKA: KONSPEKTY I TEMATY EGZAMINACYJNE */}
      {activeTab === 'exam-topics' && (
        <AdminExamTopicsTab
          examTopics={examTopics}
          categories={allCategoryNames}
          onExamTopicsUpdated={onExamTopicsUpdated}
        />
      )}

      {/* ZAKŁADKA: SŁOWNIK DYDAKTYKI I PSYCHOLOGII / FISZKI */}
      {activeTab === 'glossary' && (
        <AdminGlossaryTab
          glossaryTerms={glossaryTerms}
          onGlossaryTermsUpdated={onGlossaryTermsUpdated}
        />
      )}

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
                  const nextText = e.target.value;
                  if (!nextText.trim()) {
                    setUploadedJsonFileName(null);
                  }
                  setRawJsonText(nextText);
                  analyzeJson(nextText);
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

            {/* Raport walidacji + lista wykrytych duplikatów + podgląd pierwszych 5 pytań */}
            {parsePreview && (() => {
              const forcedItems = parsePreview.duplicates
                .filter((d) => parsePreview.forcedDuplicateIds.includes(d.tempId))
                .map((d) => d.item);
              const itemsToImport = [...parsePreview.uniqueNew, ...forcedItems];
              const allDuplicatesForced =
                parsePreview.duplicates.length > 0 &&
                parsePreview.forcedDuplicateIds.length === parsePreview.duplicates.length;

              return (
                <div className="space-y-5 border-t border-slate-200 pt-5 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Do zapisania</p>
                      <p className="font-mono mt-1 text-lg font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                        {itemsToImport.length}
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
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Liczba paczek (max {FIRESTORE_BATCH_LIMIT})
                      </p>
                      <p className="font-mono mt-1 text-lg font-bold text-blue-700 tabular-nums dark:text-blue-400">
                        {Math.ceil(itemsToImport.length / FIRESTORE_BATCH_LIMIT)}
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

                  {/* Wykryte duplikaty z możliwością ręcznego dopuszczenia do importu */}
                  {parsePreview.duplicates.length > 0 && (
                    <div className="space-y-3 rounded-lg border border-amber-300/80 bg-amber-50/40 p-4 dark:border-amber-800/70 dark:bg-amber-950/20">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                            Wykryte duplikaty ({parsePreview.duplicates.length})
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Hash jest liczony z treści pytania i odpowiedzi. Jeśli pytanie różni się np. obrazkiem, kliknij „Dodaj mimo to”.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={toggleForceAllDuplicates}
                          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            allDuplicatesForced
                              ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border-amber-400 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-950/50'
                          }`}
                        >
                          {allDuplicatesForced
                            ? 'Odznacz wszystkie duplikaty'
                            : 'Zezwól na import wszystkich duplikatów'}
                        </button>
                      </div>

                      <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                        {parsePreview.duplicates.map((dup) => {
                          const isForced = parsePreview.forcedDuplicateIds.includes(dup.tempId);
                          return (
                            <div
                              key={dup.tempId}
                              className={`rounded-lg border p-3.5 text-sm transition-colors ${
                                isForced
                                  ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/30'
                                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
                              }`}
                            >
                              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                                      {dup.source === 'db'
                                        ? 'Już istnieje w bazie Firestore'
                                        : 'Powtórzenie wewnątrz pliku'}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>{dup.item.category}</span>
                                    {dup.item.hasImagePlaceholder && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-medium text-blue-700 dark:text-blue-400">
                                          Wymaga obrazka
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {dup.item.question}
                                  </p>

                                  <ul className="space-y-1 text-xs">
                                    {dup.item.options.map((opt, optIdx) => {
                                      const isRight = dup.item.correctAnswers.includes(optIdx);
                                      return (
                                        <li
                                          key={optIdx}
                                          className={`flex items-center gap-1.5 ${
                                            isRight
                                              ? 'font-semibold text-emerald-800 dark:text-emerald-300'
                                              : 'text-slate-600 dark:text-slate-400'
                                          }`}
                                        >
                                          <span className="font-mono">
                                            {OPTION_LETTERS[optIdx] ?? optIdx + 1}.
                                          </span>
                                          <span>{opt}</span>
                                          {isRight && (
                                            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleForceDuplicate(dup.tempId)}
                                  className={`shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                                    isForced
                                      ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {isForced ? 'Dodano do importu · Cofnij' : 'Dodaj mimo to'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {itemsToImport.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        Podgląd pierwszych {Math.min(5, itemsToImport.length)} pytań do wgrania z zaznaczonymi poprawnymi odpowiedziami
                      </h3>

                      <div className="space-y-3">
                        {itemsToImport.slice(0, 5).map((q, idx) => (
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
                              {importProgress.savedItems} / {itemsToImport.length}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className="h-full bg-blue-700 transition-all dark:bg-blue-500"
                              style={{
                                width: `${Math.round(
                                  (importProgress.savedItems / itemsToImport.length) * 100
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
                          Zatwierdź i zapisz {itemsToImport.length} pytań do Firestore
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Sekcja: Ostatnie paczki importu JSON */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Ostatnie paczki importu
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Każdy import JSON zapisuje wspólny identyfikator paczki, dzięki czemu możesz jednym kliknięciem cofnąć cały błędny import.
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                {importBatches.length} {importBatches.length === 1 ? 'paczka' : 'paczek'}
              </span>
            </div>

            {importBatches.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Brak zapisanych paczek importu w bieżącej bazie pytań.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {importBatches.map((batch) => (
                  <div
                    key={batch.batchId}
                    className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {batch.label}
                      </p>
                      <p className="font-mono mt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        ID: {batch.batchId} · Liczba pytań w bazie: {batch.questionIds.length}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={bulkActionProcessing}
                      onClick={() =>
                        setConfirmModal({
                          title: 'Cofnij / Usuń całą paczkę importu',
                          description: `Czy na pewno chcesz trwale usunąć wszystkie ${batch.questionIds.length} pytań z paczki „${batch.label}”? Operacja wykona się w paczkach batch i podbije wersję bazy.`,
                          confirmLabel: `Usuń ${batch.questionIds.length} pytań z paczki`,
                          variant: 'danger',
                          onConfirm: async () => {
                            await executeBulkDeleteQuestions(
                              batch.questionIds,
                              `Cofnięto paczkę „${batch.label}” — usunięto ${batch.questionIds.length} pytań z Firestore.`
                            );
                          }
                        })
                      }
                      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/60"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Cofnij / Usuń całą paczkę</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ZAKŁADKA 2: ZARZĄDZANIE PYTANIAMI I OBRAZKAMI */}
      {activeTab === 'questions' && (
        bulkMatchMode ? (
          <BulkImageMatcher
            questions={questions}
            categories={allCategoryNames}
            undoableBulkImageCount={undoableBulkImageIds.length}
            undoingBulkImages={bulkActionProcessing}
            onRequestUndoBulkImages={requestUndoLastBulkImages}
            onBulkImagesSaved={(savedBatch) => setLastBulkImageBatch(savedBatch)}
            onClose={() => setBulkMatchMode(false)}
            onQuestionsUpdated={onQuestionsUpdated}
          />
        ) : sieveMode ? (
          <LicenseCategorySieve
            questions={questions}
            categories={allCategoryNames}
            onClose={() => setSieveMode(false)}
            onQuestionsUpdated={onQuestionsUpdated}
          />
        ) : (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
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
                aria-label="Filtruj po dziale tematycznym"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="__ALL__">Wszystkie działy</option>
                {allCategoryNames.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtruj po kategorii prawa jazdy"
                value={filterLicenseCategory}
                onChange={(e) => setFilterLicenseCategory(e.target.value as '__ALL__' | LicenseCategory)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="__ALL__">Wszystkie kat. prawa jazdy</option>
                {LICENSE_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.shortLabel}
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

            <div className="flex flex-wrap items-center gap-2">
              {undoableBulkImageIds.length > 0 && (
                <button
                  type="button"
                  disabled={bulkActionProcessing}
                  onClick={requestUndoLastBulkImages}
                  className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Cofnij ostatnie hurtowe dodanie obrazków ({undoableBulkImageIds.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSieveMode(true)}
                className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"
              >
                <Car className="h-4 w-4" aria-hidden="true" />
                <span>Rozdziel kategorie A / C / D / T</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkMatchMode(true)}
                className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 px-3.5 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
              >
                <Images className="h-4 w-4" aria-hidden="true" />
                <span>Hurtowe dopasowywanie obrazków ({placeholderCount})</span>
              </button>

              <button
                type="button"
                onClick={openNewQuestionModal}
                className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                <span>Dodaj pytanie</span>
              </button>
            </div>
          </div>

          {bulkStatusMessage && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <span>{bulkStatusMessage}</span>
              <button
                type="button"
                onClick={() => setBulkStatusMessage(null)}
                className="cursor-pointer text-emerald-700 hover:text-emerald-950 dark:text-emerald-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {bulkErrorMessage && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              <span>{bulkErrorMessage}</span>
              <button
                type="button"
                onClick={() => setBulkErrorMessage(null)}
                className="cursor-pointer text-red-700 hover:text-red-950 dark:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Pasek akcji masowych (widoczny, gdy zaznaczono >= 1 pytanie) */}
          {selectedQuestionIds.length > 0 && (
            <div className="sticky top-16 z-20 flex flex-col justify-between gap-3 rounded-xl border border-blue-300 bg-blue-50/95 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center dark:border-blue-800 dark:bg-blue-950/90">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-blue-900 tabular-nums dark:text-blue-200">
                  Zaznaczono: {selectedQuestionIds.length}
                </span>
                <button
                  type="button"
                  disabled={bulkActionProcessing}
                  onClick={() => setSelectedQuestionIds([])}
                  className="cursor-pointer text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300"
                >
                  Odznacz wszystko
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={bulkActionProcessing}
                  onClick={() => {
                    setBulkCategoryMode('existing');
                    setBulkTargetExistingCategory(allCategoryNames[0] ?? 'Ogólne / Mix');
                    setBulkTargetCustomCategory('');
                    setBulkCategoryModalOpen(true);
                  }}
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <FolderInput className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                  <span>Zmień dział tematyczny</span>
                </button>

                <button
                  type="button"
                  disabled={bulkActionProcessing}
                  onClick={() => {
                    setBulkTargetLicenseCategory('B');
                    setBulkLicenseModalOpen(true);
                  }}
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                >
                  <Car className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Zmień kategorię prawa jazdy</span>
                </button>

                <button
                  type="button"
                  disabled={bulkActionProcessing}
                  onClick={() =>
                    setConfirmModal({
                      title: 'Usuń obrazki z zaznaczonych pytań',
                      description: `Czy na pewno chcesz wyczyścić obrazki w ${selectedQuestionIds.length} zaznaczonych pytaniach? Pole imageBase64 otrzyma wartość null, a pytania wrócą do puli z hasImagePlaceholder: true.`,
                      confirmLabel: `Usuń obrazki (${selectedQuestionIds.length})`,
                      variant: 'warning',
                      onConfirm: async () => {
                        await executeBulkClearImages(selectedQuestionIds);
                      }
                    })
                  }
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                >
                  <ImageOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Usuń obrazki</span>
                </button>

                <button
                  type="button"
                  disabled={bulkActionProcessing}
                  onClick={() =>
                    setConfirmModal({
                      title: 'Trwale usuń zaznaczone pytania',
                      description: `Czy na pewno chcesz trwale usunąć ${selectedQuestionIds.length} zaznaczonych pytań z bazy Firestore? Tej operacji nie można cofnąć.`,
                      confirmLabel: `Usuń zaznaczone (${selectedQuestionIds.length})`,
                      variant: 'danger',
                      onConfirm: async () => {
                        await executeBulkDeleteQuestions(selectedQuestionIds);
                      }
                    })
                  }
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Usuń zaznaczone</span>
                </button>
              </div>
            </div>
          )}

          {/* Główny checkbox zaznaczania wszystkich widocznych/przefiltrowanych pytań */}
          {filteredQuestions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-700"
                />
                <span>
                  Zaznacz wszystkie widoczne (przefiltrowane) — {filteredQuestions.length}
                </span>
              </label>

              {filteredQuestions.length > 100 && (
                <button
                  type="button"
                  onClick={() => setShowAllFiltered((v) => !v)}
                  className="cursor-pointer text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                >
                  {showAllFiltered
                    ? 'Ogranicz widok do 100 wierszy'
                    : `Pokaż wszystkie (${filteredQuestions.length})`}
                </button>
              )}
            </div>
          )}

          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {filteredQuestions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Brak pytań spełniających wybrane kryteria.
              </div>
            ) : (
              visibleQuestions.map((q) => {
                const isChecked = selectedIdSet.has(q.id);
                return (
                <div
                  key={q.id}
                  className={`flex flex-col justify-between gap-4 p-4 transition-colors sm:flex-row sm:items-center ${
                    isChecked ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Zaznacz pytanie: ${q.question.slice(0, 60)}`}
                      checked={isChecked}
                      onChange={() => toggleQuestionSelection(q.id)}
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-blue-700"
                    />
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
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatLicenseCategoryLabel(q.licenseCategory)}
                        </span>
                        <span aria-hidden="true">·</span>
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
                );
              })
            )}
          </div>
          {filteredQuestions.length > 100 && !showAllFiltered && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Wyświetlono pierwszych 100 wyników z {filteredQuestions.length}. Użyj przycisku „Pokaż wszystkie” powyżej lub zawęź wyszukiwanie.
            </p>
          )}
        </section>
        )
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
            <div className="space-y-4">
              {visibleReports.map((r) => {
                const targetQuestion = questions.find((q) => q.id === r.questionId);
                const draftValue = replyDrafts[r.id] ?? '';
                const isSendingThis = sendingReplyId === r.id;
                const feedbackForThis =
                  replyFeedback?.reportId === r.id ? replyFeedback : null;

                return (
                  <article
                    key={r.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span
                          className={`font-semibold ${
                            r.status === 'open'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {r.status === 'open' ? 'Otwarte' : 'Załatwione'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Zgłosił: <strong className="text-slate-800 dark:text-slate-200">{r.userNick}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{r.category}</span>
                        {r.createdAt && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {r.createdAt.toLocaleString('pl-PL', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
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
                          {r.status === 'open' ? 'Oznacz jako załatwione' : 'Otwórz ponownie'}
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

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Treść pytania
                      </p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {targetQuestion?.question ?? r.questionText}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Uwaga kursanta ({r.userNick}):
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {r.reason}
                      </p>
                    </div>

                    {r.adminReply && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs dark:border-blue-900/60 dark:bg-blue-950/30">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-blue-800 dark:text-blue-300">
                          <span className="font-bold">Wysłana odpowiedź administratora</span>
                          <span className="font-mono text-[11px] tabular-nums">
                            {r.repliedAt
                              ? r.repliedAt.toLocaleString('pl-PL', {
                                  dateStyle: 'short',
                                  timeStyle: 'short'
                                })
                              : ''}{' '}
                            · {r.isReadByUser ? 'Przeczytana przez kursanta' : 'Nieprzeczytana'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                          {r.adminReply}
                        </p>
                      </div>
                    )}

                    {/* Formularz odpowiedzi kursantowi */}
                    <div className="border-t border-slate-100 pt-3 space-y-2 dark:border-slate-800">
                      <label
                        htmlFor={`reply-input-${r.id}`}
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Odpowiedz kursantowi
                      </label>
                      <textarea
                        id={`reply-input-${r.id}`}
                        rows={2}
                        maxLength={2000}
                        value={draftValue}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        placeholder={
                          r.adminReply
                            ? 'Wpisz nową odpowiedź, aby zaktualizować wiadomość i wysłać powiadomienie...'
                            : 'Napisz wyjaśnienie lub informację o poprawieniu pytania...'
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          {feedbackForThis && (
                            <p
                              className={`text-xs font-medium ${
                                feedbackForThis.type === 'ok'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {feedbackForThis.text}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={!draftValue.trim() || isSendingThis}
                          onClick={() => void handleReplyToReport(r)}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        >
                          {isSendingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>Wyślij odpowiedź i oznacz jako załatwione</span>
                        </button>
                      </div>
                    </div>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dział tematyczny
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
                    Kategoria prawa jazdy
                  </label>
                  <select
                    value={editingQuestion.licenseCategory ?? 'B'}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        licenseCategory: e.target.value as LicenseCategory
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {LICENSE_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
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
      {/* MODAL ZMIANY KATEGORII DLA ZAZNACZONYCH PYTAŃ */}
      {bulkCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Zmień kategorię ({selectedQuestionIds.length} pytań)
              </h2>
              <button
                type="button"
                onClick={() => setBulkCategoryModalOpen(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBulkChangeCategorySubmit} className="space-y-4">
              <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setBulkCategoryMode('existing')}
                  className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-semibold ${
                    bulkCategoryMode === 'existing'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Istniejąca kategoria
                </button>
                <button
                  type="button"
                  onClick={() => setBulkCategoryMode('custom')}
                  className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-semibold ${
                    bulkCategoryMode === 'custom'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Wpisz nową kategorię
                </button>
              </div>

              {bulkCategoryMode === 'existing' ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Wybierz kategorię docelową
                  </label>
                  <select
                    value={bulkTargetExistingCategory}
                    onChange={(e) => setBulkTargetExistingCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {allCategoryNames.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nazwa nowej kategorii
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={bulkTargetCustomCategory}
                    onChange={(e) => setBulkTargetCustomCategory(e.target.value)}
                    placeholder="np. Przepisy o kierujących"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkCategoryModalOpen(false)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={bulkActionProcessing}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600"
                >
                  {bulkActionProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Zapisz nową kategorię</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ZMIANY KATEGORII PRAWA JAZDY DLA ZAZNACZONYCH PYTAŃ */}
      {bulkLicenseModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Zmień kategorię prawa jazdy ({selectedQuestionIds.length} pytań)
              </h2>
              <button
                type="button"
                onClick={() => setBulkLicenseModalOpen(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBulkChangeLicenseCategorySubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="bulk-license-select"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Docelowa kategoria prawa jazdy
                </label>
                <select
                  id="bulk-license-select"
                  value={bulkTargetLicenseCategory}
                  onChange={(e) => setBulkTargetLicenseCategory(e.target.value as LicenseCategory)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {LICENSE_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Operacja zachowuje dział tematyczny (np. Dydaktyka, Prawo o ruchu drogowym) oraz wszystkie postępy kursantów.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkLicenseModalOpen(false)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={bulkActionProcessing}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600"
                >
                  {bulkActionProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Zapisz kategorię prawa jazdy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL POTWIERDZENIA OPERACJI MASOWYCH / COFANIA PACZEK */}
      {confirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {confirmModal.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {confirmModal.description}
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={bulkActionProcessing}
                onClick={() => setConfirmModal(null)}
                className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={bulkActionProcessing}
                onClick={async () => {
                  await confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                  confirmModal.variant === 'danger'
                    ? 'bg-red-700 hover:bg-red-800 dark:bg-red-600'
                    : 'bg-amber-700 hover:bg-amber-800 dark:bg-amber-600'
                }`}
              >
                {bulkActionProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{confirmModal.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

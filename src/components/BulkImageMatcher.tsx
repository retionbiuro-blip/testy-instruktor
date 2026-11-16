import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ImagePlus,
  Images,
  Loader2,
  RotateCcw,
  Save,
  SkipForward,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  LastBulkImageBatch,
  saveLastBulkImageBatch,
  saveQuestionsToCache,
  setLocalDbVersion
} from '../lib/indexedDb';
import {
  compareQuestionsByCreationOrder,
  compressImageToBase64
} from '../lib/questionUtils';
import { batchUpdateQuestionImages } from '../services/firestoreService';
import { Question } from '../types';

interface UploadedImageItem {
  id: string;
  file: File;
  previewUrl: string;
  sizeKB: number;
  isDuplicated?: boolean;
}

interface BulkImageMatcherProps {
  questions: Question[];
  categories: string[];
  undoableBulkImageCount: number;
  undoingBulkImages: boolean;
  onRequestUndoBulkImages: () => void;
  onBulkImagesSaved: (batch: LastBulkImageBatch) => void;
  onClose: () => void;
  onQuestionsUpdated: (
    nextQuestions: Question[],
    nextCategories: string[],
    nextVersion: number
  ) => void;
}

export function BulkImageMatcher({
  questions,
  categories,
  undoableBulkImageCount,
  undoingBulkImages,
  onRequestUndoBulkImages,
  onBulkImagesSaved,
  onClose,
  onQuestionsUpdated
}: BulkImageMatcherProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('__ALL__');
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [skippedQuestionIds, setSkippedQuestionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const imagesRef = useRef<UploadedImageItem[]>([]);
  imagesRef.current = uploadedImages;

  useEffect(() => {
    return () => {
      for (const item of imagesRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  // Wszystkie pytania czekające na obrazek, zachowane ściśle w kolejności dodania
  const allPendingQuestions = useMemo(() => {
    return questions
      .filter((q) => q.hasImagePlaceholder && !q.imageBase64)
      .sort(compareQuestionsByCreationOrder);
  }, [questions]);

  const pendingCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of allPendingQuestions) {
      map.set(q.category, (map.get(q.category) ?? 0) + 1);
    }
    return map;
  }, [allPendingQuestions]);

  const filteredPendingQuestions = useMemo(() => {
    if (selectedCategory === '__ALL__') return allPendingQuestions;
    return allPendingQuestions.filter((q) => q.category === selectedCategory);
  }, [allPendingQuestions, selectedCategory]);

  // Budujemy mapę 1-do-1: pominięte pytania nie zużywają obrazka, więc kolejne obrazki przesuwają się w dół
  const matchedRows = useMemo(() => {
    const skippedSet = new Set(skippedQuestionIds);
    let imageCursor = 0;

    return filteredPendingQuestions.map((question, rowIdx) => {
      const isSkipped = skippedSet.has(question.id);
      if (isSkipped) {
        return {
          rowIdx,
          question,
          isSkipped: true,
          image: null as UploadedImageItem | null,
          imageIndex: -1
        };
      }
      const image = uploadedImages[imageCursor] ?? null;
      const assignedIndex = image ? imageCursor : -1;
      if (image) {
        imageCursor++;
      }
      return {
        rowIdx,
        question,
        isSkipped: false,
        image,
        imageIndex: assignedIndex
      };
    });
  }, [filteredPendingQuestions, uploadedImages, skippedQuestionIds]);

  const matchedPairs = useMemo(
    () =>
      matchedRows.filter(
        (r): r is typeof r & { image: UploadedImageItem } => !r.isSkipped && r.image !== null
      ),
    [matchedRows]
  );

  const usedImagesCount = matchedPairs.length;
  const leftoverImages = useMemo(
    () => uploadedImages.slice(usedImagesCount),
    [uploadedImages, usedImagesCount]
  );

  function clearUploadedImages() {
    for (const item of uploadedImages) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setUploadedImages([]);
  }

  function handleSelectImages(e: ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const files = Array.from(fileList)
      .filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

    if (files.length === 0) {
      setErrorMsg('Nie wybrano żadnych prawidłowych plików graficznych (JPG, PNG, WebP).');
      e.target.value = '';
      return;
    }

    clearUploadedImages();
    const mapped: UploadedImageItem[] = files.map((file, idx) => ({
      id: `img_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      sizeKB: Math.max(1, Math.round(file.size / 1024))
    }));

    setUploadedImages(mapped);
    e.target.value = '';
  }

  function handleDiscardImageAtIndex(imageIndex: number) {
    if (imageIndex < 0 || imageIndex >= uploadedImages.length) return;
    const target = uploadedImages[imageIndex];
    URL.revokeObjectURL(target.previewUrl);
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== imageIndex));
  }

  function handleDuplicateImageFromAbove(
    sourceImage: UploadedImageItem,
    targetImageIndex: number
  ) {
    const duplicatedItem: UploadedImageItem = {
      id: `img_dup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      file: sourceImage.file,
      previewUrl: URL.createObjectURL(sourceImage.file),
      sizeKB: sourceImage.sizeKB,
      isDuplicated: true
    };

    setUploadedImages((prev) => {
      const insertAt =
        targetImageIndex >= 0 && targetImageIndex <= prev.length ? targetImageIndex : prev.length;
      const next = [...prev];
      next.splice(insertAt, 0, duplicatedItem);
      return next;
    });
  }

  function handleSkipQuestion(questionId: string) {
    setSkippedQuestionIds((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
  }

  function handleUnskipQuestion(questionId: string) {
    setSkippedQuestionIds((prev) => prev.filter((id) => id !== questionId));
  }

  async function handleCompressAndSaveAll() {
    if (matchedPairs.length === 0 || saving) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setProgressPercent(0);

    try {
      const total = matchedPairs.length;
      const updates: { questionId: string; imageBase64: string }[] = [];
      const compressedByFile = new Map<File, string>();

      for (let i = 0; i < total; i++) {
        const pair = matchedPairs[i];
        let base64 = compressedByFile.get(pair.image.file);
        if (!base64) {
          setProgressText(`Kompresowanie obrazka ${i + 1} z ${total} (${pair.image.file.name})...`);
          setProgressPercent(Math.round(((i + 0.5) / (total * 1.2)) * 100));
          const compressed = await compressImageToBase64(pair.image.file);
          base64 = compressed.base64;
          compressedByFile.set(pair.image.file, base64);
        }
        updates.push({
          questionId: pair.question.id,
          imageBase64: base64
        });
      }

      setProgressText('Zapisywanie dopasowanych obrazków do Firestore...');
      const { nextVersion, batchCount } = await batchUpdateQuestionImages(
        updates,
        (completedBatches, totalBatches, savedItems) => {
          setProgressText(
            `Zapisywanie paczki ${completedBatches} z ${totalBatches} (${savedItems}/${total} obrazków)...`
          );
          setProgressPercent(85 + Math.round((completedBatches / totalBatches) * 15));
        }
      );

      const updateMap = new Map(updates.map((u) => [u.questionId, u.imageBase64]));
      const nextQuestions = questions.map((q) => {
        const nextImg = updateMap.get(q.id);
        if (!nextImg) return q;
        return {
          ...q,
          imageBase64: nextImg,
          hasImagePlaceholder: false
        };
      });

      const savedBatch = saveLastBulkImageBatch(updates.map((u) => u.questionId));
      onBulkImagesSaved(savedBatch);

      await saveQuestionsToCache(nextQuestions);
      setLocalDbVersion(nextVersion);
      onQuestionsUpdated(nextQuestions, categories, nextVersion);

      clearUploadedImages();
      setSkippedQuestionIds([]);
      setProgressPercent(100);
      setSuccessMsg(
        `Gotowe! Skompresowano i zapisano ${updates.length} obrazków w ${batchCount} paczkach batch. Zaktualizowano wersję bazy do ${nextVersion}.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Wystąpił błąd podczas kompresji lub zapisu obrazków.'
      );
    } finally {
      setSaving(false);
      setProgressText(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Górny pasek narzędzia */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Wróć do listy</span>
          </button>
          <div>
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Images className="h-5 w-5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              <span>Hurtowe dopasowywanie obrazków</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Wybierz kategorię, wskaż wiele plików graficznych (sortowanych naturalnie po nazwie), skoryguj ewentualne przesunięcia i zapisz wszystko jednym kliknięciem.
            </p>
          </div>
        </div>

        {undoableBulkImageCount > 0 && (
          <button
            type="button"
            disabled={saving || undoingBulkImages}
            onClick={onRequestUndoBulkImages}
            className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cofnij ostatnie hurtowe dodanie obrazków ({undoableBulkImageCount})</span>
          </button>
        )}
      </div>

      {/* Pasek filtrów kategorii, wczytywania plików i statystyk */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <label
              htmlFor="bulk-image-category"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Kategoria pytań czekających na obrazek
            </label>
            <select
              id="bulk-image-category"
              value={selectedCategory}
              disabled={saving}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSkippedQuestionIds([]);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="__ALL__">
                Wszystkie ({allPendingQuestions.length})
              </option>
              {categories.map((cat) => {
                const count = pendingCountByCategory.get(cat) ?? 0;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="md:col-span-5">
            <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pliki graficzne z dysku (sortowanie naturalne, np. img2 przed img10)
            </p>
            <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-blue-500 bg-blue-50/40 px-4 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:bg-blue-950/20 dark:text-blue-300 dark:hover:bg-blue-950/40">
              <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Wybierz wiele obrazków (JPG / PNG / WebP)</span>
              <input
                type="file"
                multiple
                disabled={saving}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSelectImages}
                className="sr-only"
              />
            </label>
          </div>

          <div className="flex items-center gap-2 md:col-span-2 md:justify-end">
            {uploadedImages.length > 0 && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  clearUploadedImages();
                  setSkippedQuestionIds([]);
                }}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Wyczyść</span>
              </button>
            )}
          </div>
        </div>

        {/* Liczniki podsumowania */}
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 dark:border-slate-800">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-500 dark:text-slate-400">Pytań czekających</p>
            <p className="font-mono mt-1 text-lg font-bold text-slate-900 tabular-nums dark:text-white">
              {filteredPendingQuestions.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-500 dark:text-slate-400">Wgranych plików</p>
            <p className="font-mono mt-1 text-lg font-bold text-blue-700 tabular-nums dark:text-blue-400">
              {uploadedImages.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-500 dark:text-slate-400">Dopasowanych par</p>
            <p className="font-mono mt-1 text-lg font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
              {matchedPairs.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-500 dark:text-slate-400">Pominięte pytania</p>
            <p className="font-mono mt-1 text-lg font-bold text-amber-700 tabular-nums dark:text-amber-400">
              {skippedQuestionIds.length}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Tabela par 1-do-1 */}
      {filteredPendingQuestions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <ImagePlus className="mx-auto h-9 w-9 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <h3 className="font-display mt-3 text-base font-bold text-slate-900 dark:text-white">
            Brak pytań czekających na obrazek
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-600 dark:text-slate-400">
            W wybranej kategorii nie ma pytań z ustawionym znacznikiem wymagania obrazka bez wgranej ilustracji.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="hidden grid-cols-12 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 md:grid dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
            <div className="col-span-7">Pytanie (kolejność dodania)</div>
            <div className="col-span-5">Dopasowany obrazek i korekta przesunięcia</div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {matchedRows.map((row) => {
              const prevRow = row.rowIdx > 0 ? matchedRows[row.rowIdx - 1] : null;
              const prevRowImage = prevRow && !prevRow.isSkipped ? prevRow.image : null;

              return (
                <div
                  key={row.question.id}
                  className={`grid grid-cols-1 gap-4 p-4 transition-colors md:grid-cols-12 md:items-center ${
                    row.isSkipped
                      ? 'bg-slate-50/80 opacity-75 dark:bg-slate-950/60'
                      : row.image
                        ? 'bg-white dark:bg-slate-900'
                        : 'bg-amber-50/20 dark:bg-amber-950/10'
                  }`}
                >
                  {/* Lewa strona: treść pytania i podpowiedź w nawiasie */}
                  <div className="space-y-1.5 md:col-span-7">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-bold text-slate-700 tabular-nums dark:text-slate-200">
                        #{row.rowIdx + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-blue-700 dark:text-blue-400">
                        {row.question.category}
                      </span>
                      {row.isSkipped && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            Pominięte (zostaje bez obrazka)
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-sm leading-snug font-medium text-slate-900 dark:text-white">
                      {row.question.question}
                      {row.question.explanation && (
                        <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                          ({row.question.explanation})
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Prawa strona: miniaturka + przyciski korekty */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:col-span-5">
                    {row.isSkipped ? (
                      <div className="flex flex-1 items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                        <span>Pytanie pominięte — kolejne obrazki przesunięto w dół.</span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleUnskipQuestion(row.question.id)}
                          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden="true" />
                          <span>Przywróć</span>
                        </button>
                      </div>
                    ) : row.image ? (
                      <div className="flex flex-1 items-center gap-3">
                        <img
                          src={row.image.previewUrl}
                          alt={row.image.file.name}
                          className="h-20 w-28 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-contain p-0.5 dark:border-slate-700 dark:bg-slate-950"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div>
                            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                              {row.image.file.name}
                            </p>
                            <p className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                              Plik #{row.imageIndex + 1}
                              {row.image.isDuplicated ? ' (powielony z góry)' : ''} · {row.image.sizeKB} KB (przed kompresją)
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleDiscardImageAtIndex(row.imageIndex)}
                              className="flex cursor-pointer items-center gap-1 rounded-md border border-red-200 bg-red-50/70 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/60"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                              <span>Odrzuć ten obrazek</span>
                            </button>

                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleSkipQuestion(row.question.id)}
                              className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              <SkipForward className="h-3 w-3" aria-hidden="true" />
                              <span>Pomiń to pytanie</span>
                            </button>

                            {prevRowImage && (
                              <button
                                type="button"
                                disabled={saving}
                                title="Skopiuje obrazek przypisany do pytania powyżej i przesunie kolejne pliki o 1 w dół"
                                onClick={() =>
                                  handleDuplicateImageFromAbove(prevRowImage, row.imageIndex)
                                }
                                className="flex cursor-pointer items-center gap-1 rounded-md border border-blue-200 bg-blue-50/80 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
                              >
                                <Copy className="h-3 w-3" aria-hidden="true" />
                                <span>Powiel obrazek z góry</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-1 flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                        <span>Brak dopasowanego obrazka</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {prevRowImage && (
                            <button
                              type="button"
                              disabled={saving}
                              title="Skopiuje obrazek przypisany do pytania powyżej"
                              onClick={() =>
                                handleDuplicateImageFromAbove(prevRowImage, uploadedImages.length)
                              }
                              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-blue-200 bg-blue-50/80 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
                            >
                              <Copy className="h-3 w-3" aria-hidden="true" />
                              <span>Powiel obrazek z góry</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSkipQuestion(row.question.id)}
                            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <SkipForward className="h-3 w-3" aria-hidden="true" />
                            <span>Pomiń to pytanie</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nadmiarowe obrazki, jeśli wgrano więcej plików niż aktywnych pytań */}
      {leftoverImages.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
              Nadmiarowe obrazki bez przypisanego pytania ({leftoverImages.length})
            </p>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80">
              Te pliki nie zostaną zapisane, chyba że odrzucisz wcześniejsze błędne obrazki.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {leftoverImages.map((img, idx) => (
              <div
                key={img.id}
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white p-2 dark:border-amber-900/50 dark:bg-slate-900"
              >
                <img
                  src={img.previewUrl}
                  alt={img.file.name}
                  className="h-12 w-16 rounded object-contain"
                />
                <div className="max-w-[130px]">
                  <p className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    {img.file.name}
                  </p>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDiscardImageAtIndex(usedImagesCount + idx)}
                    className="mt-1 cursor-pointer text-[11px] font-semibold text-red-700 hover:underline dark:text-red-400"
                  >
                    Odrzuć
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dolny panel zapisu */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
        {saving && progressText && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>{progressText}</span>
              <span className="font-mono tabular-nums">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-blue-700 transition-all dark:bg-blue-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Każdy obrazek zostanie skompresowany przez Canvas (WebP/JPEG, maks. 800 px, ok. 60 KB Base64) i zapisany w Firestore bez użycia płatnego Storage.
          </p>
          <button
            type="button"
            disabled={matchedPairs.length === 0 || saving}
            onClick={() => void handleCompressAndSaveAll()}
            className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              Skompresuj i zapisz wszystkie dopasowane obrazki ({matchedPairs.length})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

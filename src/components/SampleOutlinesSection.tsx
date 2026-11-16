import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Search,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ExamTopic } from '../types';
import { MarkdownContent } from './MarkdownContent';

interface SampleOutlinesSectionProps {
  examTopics: ExamTopic[];
  onPracticeTopicInExam: (topicId: string) => void;
}

export function SampleOutlinesSection({
  examTopics,
  onPracticeTopicInExam
}: SampleOutlinesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('__ALL__');
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  const sortedTopics = useMemo(() => {
    return [...examTopics].sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl')
    );
  }, [examTopics]);

  const categories = useMemo(() => {
    return Array.from(new Set(sortedTopics.map((t) => t.category))).filter(Boolean);
  }, [sortedTopics]);

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedTopics.filter((t) => {
      if (categoryFilter !== '__ALL__' && t.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.commissionTips.toLowerCase().includes(q) ||
        t.sampleOutline.toLowerCase().includes(q)
      );
    });
  }, [sortedTopics, categoryFilter, searchQuery]);

  const activeTopic = useMemo(
    () => sortedTopics.find((t) => t.id === activeTopicId) ?? null,
    [sortedTopics, activeTopicId]
  );

  const outlinesCount = sortedTopics.filter((t) => t.sampleOutline.trim().length > 0).length;

  // Widok szczegółowy pojedynczego wzoru konspektu
  if (activeTopic) {
    const hasOutline = activeTopic.sampleOutline.trim().length > 0;
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTopicId(null)}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Wróć do listy tematów</span>
          </button>

          <button
            type="button"
            onClick={() => onPracticeTopicInExam(activeTopic.id)}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            <span>Przećwicz ten temat na Egzaminie</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                {activeTopic.category}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Temat {String(activeTopic.order).padStart(2, '0')}
              </span>
              <span aria-hidden="true">·</span>
              <span>Gotowy wzór konspektu</span>
            </div>

            <h2
              style={{ textWrap: 'balance' }}
              className="font-display mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white"
            >
              {activeTopic.title}
            </h2>
          </header>

          {activeTopic.commissionTips.trim().length > 0 && (
            <section
              aria-label="Na co zwraca uwagę komisja"
              className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 dark:border-amber-900/60 dark:bg-amber-950/25"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                <h3 className="font-display text-sm font-bold text-amber-950 dark:text-amber-200">
                  Na co zwraca uwagę komisja egzaminacyjna
                </h3>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                {activeTopic.commissionTips}
              </p>
            </section>
          )}

          <div className="py-6">
            {hasOutline ? (
              <MarkdownContent content={activeTopic.sampleOutline} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                Ten temat nie ma jeszcze opublikowanego pełnego wzoru konspektu. Możesz jednak od razu przećwiczyć go samodzielnie w symulatorze pokazu lekcji na zakładce Egzamin.
              </div>
            )}
          </div>

          <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Po zapoznaniu się ze strukturą przejdź do Części II Egzaminu, aby napisać własny konspekt z pamięci na czas.
            </p>
            <button
              type="button"
              onClick={() => onPracticeTopicInExam(activeTopic.id)}
              className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              <span>Przećwicz ten temat na Egzaminie</span>
            </button>
          </footer>
        </article>
      </div>
    );
  }

  // Widok listy tematów i wzorów konspektów
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              <span>Nauka wzorów przed Częścią II Egzaminu</span>
            </div>
            <h2 className="font-display mt-1 text-lg font-bold text-slate-900 dark:text-white">
              Gotowe Konspekty (Wzory) i Tematy Egzaminacyjne
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Przeglądaj pełne wzory konspektów z celami poznawczymi, postawami, metodami i podziałem na minuty. Gdy poczujesz się pewnie, kliknij „Przećwicz ten temat na Egzaminie”.
            </p>
          </div>

          <span className="font-mono shrink-0 self-start text-xs font-semibold text-slate-600 tabular-nums sm:self-auto dark:text-slate-300">
            {outlinesCount}/{sortedTopics.length} wzorów
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj po tytule tematu, dziale lub treści wzoru konspektu..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-9 pl-9 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Wyczyść wyszukiwanie"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            aria-label="Filtruj konspekty według kategorii"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="__ALL__">Wszystkie działy ({sortedTopics.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </section>

      {filteredTopics.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <FileText className="mx-auto mb-2 h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nie znaleziono tematów pasujących do wpisanych kryteriów.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('__ALL__');
            }}
            className="mt-3 cursor-pointer text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
          >
            Pokaż wszystkie tematy
          </button>
        </section>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {filteredTopics.map((topic) => {
            const hasOutline = topic.sampleOutline.trim().length > 0;
            return (
              <div
                key={topic.id}
                className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:px-5 dark:hover:bg-slate-800/30"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTopicId(topic.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-bold text-slate-700 tabular-nums dark:text-slate-300">
                      {String(topic.order).padStart(2, '0')}.
                    </span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      {topic.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        hasOutline
                          ? 'font-medium text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }
                    >
                      {hasOutline ? 'Pełny wzór konspektu' : 'Temat i wskazówki'}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {topic.title}
                  </p>

                  {topic.commissionTips && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                      {topic.commissionTips}
                    </p>
                  )}
                </button>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTopicId(topic.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span>{hasOutline ? 'Zobacz wzór' : 'Szczegóły'}</span>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onPracticeTopicInExam(topic.id)}
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Przećwicz ten temat na Egzaminie</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

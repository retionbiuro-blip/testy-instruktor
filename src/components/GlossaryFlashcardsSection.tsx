import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers,
  List,
  RotateCw,
  Search,
  Shuffle,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DIDACTICS_GLOSSARY, GlossaryDomain, GlossaryTerm } from '../data/knowledgePracticeData';

type GlossaryViewMode = 'list' | 'flashcards';
type DomainFilter = 'ALL' | GlossaryDomain;

export function GlossaryFlashcardsSection() {
  const [viewMode, setViewMode] = useState<GlossaryViewMode>('list');
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Stan trybu fiszek
  const [deckOrder, setDeckOrder] = useState<string[]>(() => DIDACTICS_GLOSSARY.map((t) => t.id));
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);

  const termsById = useMemo(() => {
    const map = new Map<string, GlossaryTerm>();
    for (const item of DIDACTICS_GLOSSARY) {
      map.set(item.id, item);
    }
    return map;
  }, []);

  const domainCounts = useMemo(() => {
    return {
      ALL: DIDACTICS_GLOSSARY.length,
      Dydaktyka: DIDACTICS_GLOSSARY.filter((t) => t.domain === 'Dydaktyka').length,
      Metodyka: DIDACTICS_GLOSSARY.filter((t) => t.domain === 'Metodyka').length,
      Psychologia: DIDACTICS_GLOSSARY.filter((t) => t.domain === 'Psychologia').length
    };
  }, []);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DIDACTICS_GLOSSARY.filter((item) => {
      if (domainFilter !== 'ALL' && item.domain !== domainFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.term.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q) ||
        item.drivingExample.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q)
      );
    });
  }, [domainFilter, searchQuery]);

  const activeDeck = useMemo(() => {
    const ordered = deckOrder
      .map((id) => termsById.get(id))
      .filter((item): item is GlossaryTerm => Boolean(item));
    return domainFilter === 'ALL'
      ? ordered
      : ordered.filter((item) => item.domain === domainFilter);
  }, [deckOrder, termsById, domainFilter]);

  const safeCardIndex = activeDeck.length > 0 ? Math.min(cardIndex, activeDeck.length - 1) : 0;
  const activeCard = activeDeck[safeCardIndex] ?? null;

  function handleSelectDomain(nextDomain: DomainFilter) {
    setDomainFilter(nextDomain);
    setCardIndex(0);
    setIsFlipped(false);
  }

  function handleJumpToFlashcard(termId: string) {
    const targetDeck =
      domainFilter === 'ALL'
        ? deckOrder
        : deckOrder.filter((id) => termsById.get(id)?.domain === domainFilter);
    const idx = targetDeck.indexOf(termId);
    if (idx >= 0) {
      setCardIndex(idx);
    } else {
      setDomainFilter('ALL');
      setCardIndex(Math.max(0, deckOrder.indexOf(termId)));
    }
    setIsFlipped(false);
    setViewMode('flashcards');
  }

  function handleShuffleDeck() {
    const copy = [...deckOrder];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setDeckOrder(copy);
    setCardIndex(0);
    setIsFlipped(false);
  }

  function goToCard(nextIdx: number) {
    if (activeDeck.length === 0) return;
    const bounded = (nextIdx + activeDeck.length) % activeDeck.length;
    setCardIndex(bounded);
    setIsFlipped(false);
  }

  function toggleReviewed(termId: string) {
    setReviewedIds((prev) =>
      prev.includes(termId) ? prev.filter((id) => id !== termId) : [...prev, termId]
    );
  }

  return (
    <div className="space-y-6">
      {/* Górny pasek sterujący: przełącznik Listy / Fiszek oraz filtr działu */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Słownik egzaminacyjny · {DIDACTICS_GLOSSARY.length} kluczowych pojęć
            </p>
            <h2 className="font-display mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
              Słownik Dydaktyki i Psychologii
            </h2>
          </div>

          <div
            role="group"
            aria-label="Tryb przeglądania słownika"
            className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1 sm:self-auto dark:bg-slate-950"
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Lista z wyszukiwarką</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsFlipped(false);
                setViewMode('flashcards');
              }}
              className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                viewMode === 'flashcards'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tryb Fiszek</span>
            </button>
          </div>
        </div>

        {/* Filtry dziedziny */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Dziedzina pojęć">
            {(
              [
                { id: 'ALL', label: `Wszystkie (${domainCounts.ALL})` },
                { id: 'Dydaktyka', label: `Dydaktyka (${domainCounts.Dydaktyka})` },
                { id: 'Metodyka', label: `Metodyka (${domainCounts.Metodyka})` },
                { id: 'Psychologia', label: `Psychologia (${domainCounts.Psychologia})` }
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectDomain(item.id)}
                className={`h-8 cursor-pointer rounded-lg border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  domainFilter === item.id
                    ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {viewMode === 'flashcards' && (
            <span className="font-mono text-xs font-medium text-slate-600 tabular-nums dark:text-slate-400">
              Powtórzono w sesji: {reviewedIds.length}/{DIDACTICS_GLOSSARY.length}
            </span>
          )}
        </div>

        {viewMode === 'list' && (
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj pojęcia (np. transfer, interferencja, pogadanka, eustres, czas reakcji)..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-9 pl-9 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Wyczyść wyszukiwanie w słowniku"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* Widok 1: Lista z wyszukiwarką */}
      {viewMode === 'list' ? (
        filteredList.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Brak haseł pasujących do frazy „{searchQuery}”.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDomainFilter('ALL');
              }}
              className="mt-3 cursor-pointer text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              Pokaż wszystkie 25 pojęć
            </button>
          </section>
        ) : (
          <section className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {filteredList.map((item, idx) => (
              <article key={item.id} className="space-y-2.5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold tabular-nums">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      {item.domain}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleJumpToFlashcard(item.id)}
                    className="cursor-pointer text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    Otwórz jako fiszkę →
                  </button>
                </div>

                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {item.term}
                </h3>

                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {item.definition}
                </p>

                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    Przykład z nauki jazdy:
                  </strong>{' '}
                  {item.drivingExample}
                </p>
              </article>
            ))}
          </section>
        )
      ) : (
        /* Widok 2: Tryb Fiszek */
        activeCard && (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums dark:text-slate-400">
                Fiszka {safeCardIndex + 1} z {activeDeck.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleReviewed(activeCard.id)}
                  className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                    reviewedIds.includes(activeCard.id)
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {reviewedIds.includes(activeCard.id) ? 'Opanowane' : 'Oznacz jako powtórzone'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleShuffleDeck}
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Wymieszaj fiszki</span>
                </button>
              </div>
            </div>

            {/* Interaktywna karta fiszki (kliknięcie odwraca) */}
            <button
              type="button"
              onClick={() => setIsFlipped((v) => !v)}
              aria-pressed={isFlipped}
              className={`flex min-h-[320px] w-full cursor-pointer flex-col justify-between rounded-xl border p-6 text-left transition-colors sm:p-8 ${
                isFlipped
                  ? 'border-blue-300 bg-blue-50/40 dark:border-blue-800 dark:bg-slate-900'
                  : 'border-slate-200 bg-white hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  {activeCard.domain}
                </span>
                <span>{isFlipped ? 'Definicja i przykład (awers po kliknięciu)' : 'Pojęcie'}</span>
              </div>

              {!isFlipped ? (
                <div className="my-auto py-8 text-center">
                  <h3
                    style={{ textWrap: 'balance' }}
                    className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
                  >
                    {activeCard.term}
                  </h3>
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    Spróbuj zdefiniować pojęcie własnymi słowami, a następnie kliknij kartę, aby sprawdzić odpowiedź.
                  </p>
                </div>
              ) : (
                <div className="my-auto space-y-4 py-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      {activeCard.term}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                      {activeCard.definition}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Przykład z nauki jazdy:
                    </p>
                    <p className="mt-1">{activeCard.drivingExample}</p>
                  </div>

                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Wskazówka na egzamin:</strong> {activeCard.examTip}
                  </p>
                </div>
              )}

              <div className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200/80 pt-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isFlipped ? 'Kliknij, aby wrócić do hasła' : 'Kliknij kartę, aby odwrócić'}</span>
              </div>
            </button>

            {/* Nawigacja fiszek */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToCard(safeCardIndex - 1)}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Poprzednia</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFlipped((v) => !v)}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300"
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Odwróć fiszkę</span>
              </button>

              <button
                type="button"
                onClick={() => goToCard(safeCardIndex + 1)}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <span>Następna</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

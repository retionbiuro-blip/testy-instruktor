import { ParsedQuestionInput } from '../types';

function normalizeHashPart(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .trim();
}

/**
 * Tworzy znormalizowany skrót na podstawie treści pytania POŁĄCZONEJ
 * ze znormalizowanymi treściami wszystkich odpowiedzi (małe litery, bez spacji i interpunkcji).
 * Dzięki temu pytania o tym samym wstępie, ale różnych wariantach odpowiedzi, nie są duplikatami.
 */
export function computeQuestionHash(questionText: string, options: string[] = []): string {
  const normQ = normalizeHashPart(questionText);
  if (options.length === 0) {
    return normQ.slice(0, 950);
  }
  const normOptions = options.map(normalizeHashPart).join('|');
  if (normQ.length + normOptions.length + 2 <= 950) {
    return `${normQ}||${normOptions}`;
  }
  return `${normQ.slice(0, 450)}||${normOptions.slice(0, 490)}`;
}

/**
 * Sprawdza dokładne dopasowanie zbioru odpowiedzi (1 punkt tylko za zaznaczenie
 * WSZYSTKICH poprawnych odpowiedzi i ŻADNEJ błędnej).
 */
export function areAnswerSetsEqual(selected: number[], correct: number[]): boolean {
  if (selected.length === 0 || correct.length === 0) return false;
  const s = new Set(selected);
  const c = new Set(correct);
  if (s.size !== c.size) return false;
  for (const idx of c) {
    if (!s.has(idx)) return false;
  }
  return true;
}

/**
 * Kompresuje obrazek (JPG/PNG/WebP) po stronie przeglądarki za pomocą HTML5 Canvas
 * do maksymalnej szerokości 800 px i docelowej wagi ~50–80 KB w formacie WebP/JPEG (Base64).
 */
export async function compressImageToBase64(file: File): Promise<{
  base64: string;
  sizeKB: number;
  width: number;
  height: number;
  mimeType: string;
}> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Nie udało się wczytać pliku graficznego.'));
      el.src = imageUrl;
    });

    const MAX_WIDTH = 800;
    let targetW = img.naturalWidth || img.width;
    let targetH = img.naturalHeight || img.height;

    if (targetW > MAX_WIDTH) {
      targetH = Math.round((targetH * MAX_WIDTH) / targetW);
      targetW = MAX_WIDTH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Twoja przeglądarka nie obsługuje przetwarzania Canvas.');
    }

    // Białe tło na wypadek przezroczystego PNG przy ewentualnym fallbacku JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Sprawdzamy wsparcie WebP, z bezpiecznym fallbackiem do JPEG
    const testWebp = canvas.toDataURL('image/webp', 0.8);
    const mimeType = testWebp.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';

    const qualitySteps = [0.82, 0.72, 0.62, 0.52, 0.42, 0.34];
    let bestDataUrl = canvas.toDataURL(mimeType, 0.72);

    for (const q of qualitySteps) {
      const candidate = canvas.toDataURL(mimeType, q);
      const approxBytes = Math.round((candidate.length * 3) / 4);
      bestDataUrl = candidate;
      if (approxBytes <= 82 * 1024) {
        break;
      }
    }

    // Jeśli nadal powyżej 120 KB (np. bardzo złożone zdjęcie), zmniejszamy szerokość do 640px
    let approxBytes = Math.round((bestDataUrl.length * 3) / 4);
    if (approxBytes > 120 * 1024 && targetW > 640) {
      const scale = 640 / targetW;
      canvas.width = 640;
      canvas.height = Math.round(targetH * scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      bestDataUrl = canvas.toDataURL(mimeType, 0.55);
      approxBytes = Math.round((bestDataUrl.length * 3) / 4);
    }

    return {
      base64: bestDataUrl,
      sizeKB: Math.max(1, Math.round(approxBytes / 1024)),
      width: canvas.width,
      height: canvas.height,
      mimeType
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function generateQuestionId(indexOffset = 0): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `q_${Date.now()}_${indexOffset}_${rand}`;
}

function normalizeAnswerIndex(val: unknown, optionsLength: number): number | null {
  if (typeof val === 'number' && Number.isInteger(val)) {
    if (val >= 0 && val < optionsLength) return val;
    return null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim().toUpperCase();
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      if (num >= 0 && num < optionsLength) return num;
    }
    const letterCode = trimmed.charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1, ...
    if (trimmed.length === 1 && letterCode >= 0 && letterCode < optionsLength) {
      return letterCode;
    }
  }
  return null;
}

/**
 * Parsuje plik JSON z pytaniami (obsługuje zarówno strukturę docelową, jak i typowe
 * nazwy pól z ekstraktorów PDF), wykrywa wewnętrzne duplikaty i zwraca raport błędów.
 */
export function parseImportedQuestionsJson(
  rawText: string,
  overrideCategory?: string
): {
  parsed: ParsedQuestionInput[];
  internalDuplicateItems: ParsedQuestionInput[];
  internalDuplicates: number;
  rejected: number;
  errors: string[];
} {
  let rawData: unknown;
  try {
    rawData = JSON.parse(rawText);
  } catch {
    throw new Error('Plik nie zawiera poprawnego formatu JSON. Sprawdź nawiasy i przecinki.');
  }

  const list = Array.isArray(rawData)
    ? rawData
    : rawData && typeof rawData === 'object' && Array.isArray((rawData as Record<string, unknown>).questions)
      ? ((rawData as Record<string, unknown>).questions as unknown[])
      : null;

  if (!list) {
    throw new Error('Plik JSON musi zawierać tablicę pytań ([...]) lub obiekt z polem "questions".');
  }

  const parsed: ParsedQuestionInput[] = [];
  const internalDuplicateItems: ParsedQuestionInput[] = [];
  const seenHashes = new Set<string>();
  const errors: string[] = [];
  let rejected = 0;

  list.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      rejected++;
      errors.push(`Pozycja #${idx + 1}: nieprawidłowy obiekt.`);
      return;
    }

    const row = item as Record<string, unknown>;
    const rawQuestion = String(row.question ?? row.pytanie ?? row.tresc ?? '').trim();
    if (!rawQuestion) {
      rejected++;
      errors.push(`Pozycja #${idx + 1}: brak treści pytania.`);
      return;
    }

    const rawOptions = row.options ?? row.odpowiedzi ?? row.answers;
    if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
      rejected++;
      errors.push(`Pozycja #${idx + 1}: pytanie musi mieć co najmniej 2 odpowiedzi.`);
      return;
    }

    const options = rawOptions
      .map((o) => String(o ?? '').replace(/^[A-H][).:\s]+/i, '').trim())
      .filter((o) => o.length > 0)
      .slice(0, 8);

    if (options.length < 2) {
      rejected++;
      errors.push(`Pozycja #${idx + 1}: za mało niepustych odpowiedzi.`);
      return;
    }

    const rawCorrect = row.correctAnswers ?? row.correct ?? row.poprawne ?? row.poprawna ?? [];
    const correctArray = Array.isArray(rawCorrect) ? rawCorrect : [rawCorrect];
    const normalizedCorrect = Array.from(
      new Set(
        correctArray
          .map((c) => normalizeAnswerIndex(c, options.length))
          .filter((n): n is number => n !== null)
      )
    ).slice(0, 3);

    if (normalizedCorrect.length === 0) {
      rejected++;
      errors.push(`Pozycja #${idx + 1} ("${rawQuestion.slice(0, 40)}..."): brak poprawnej odpowiedzi (0..n-1 lub A/B/C).`);
      return;
    }

    const questionHash = computeQuestionHash(rawQuestion, options);
    if (!questionHash) {
      rejected++;
      return;
    }

    const categoryRaw = overrideCategory && overrideCategory.trim()
      ? overrideCategory.trim()
      : String(row.category ?? row.kategoria ?? 'Ogólne / Mix').trim() || 'Ogólne / Mix';

    const explanationRaw = String(row.explanation ?? row.uzasadnienie ?? row.podstawaPrawna ?? '').trim();
    const hasImagePlaceholder = Boolean(row.hasImagePlaceholder ?? row.wymagaObrazka ?? false);
    const imageBase64 = typeof row.imageBase64 === 'string' && row.imageBase64.startsWith('data:image/')
      ? row.imageBase64
      : undefined;

    const builtItem: ParsedQuestionInput = {
      category: categoryRaw.slice(0, 120),
      question: rawQuestion.slice(0, 3000),
      options,
      correctAnswers: normalizedCorrect.sort((a, b) => a - b),
      hasImagePlaceholder,
      ...(explanationRaw ? { explanation: explanationRaw.slice(0, 4000) } : {}),
      ...(imageBase64 ? { imageBase64 } : {}),
      questionHash
    };

    if (seenHashes.has(questionHash)) {
      internalDuplicateItems.push(builtItem);
      return;
    }
    seenHashes.add(questionHash);
    parsed.push(builtItem);
  });

  return {
    parsed,
    internalDuplicateItems,
    internalDuplicates: internalDuplicateItems.length,
    rejected,
    errors
  };
}

export function getTodayLocalIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayLocalIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const SAMPLE_QUESTIONS_JSON = [
  {
    category: 'Prawo o ruchu drogowym',
    question: 'Które z poniższych stwierdzeń dotyczących przejazdu pojazdu uprzywilejowanego na skrzyżowaniu z sygnalizacją świetlną są prawdziwe?',
    options: [
      'Kierujący pojazdem uprzywilejowanym może nie stosować się do sygnałów świetlnych pod warunkiem zachowania szczególnej ostrożności.',
      'Kierujący pojazdem uprzywilejowanym ma bezwzględny zakaz wjazdu na skrzyżowanie przy sygnale czerwonym.',
      'Uczestnicy ruchu są obowiązani ułatwić przejazd pojazdu uprzywilejowanego w szczególności przez niezwłoczne usunięcie się z jego drogi.'
    ],
    correctAnswers: [0, 2],
    hasImagePlaceholder: false,
    explanation: 'Art. 53 ust. 2 i art. 9 ustawy Prawo o ruchu drogowym: kierujący pojazdem uprzywilejowanym może nie stosować się do przepisów o ruchu pojazdów przy zachowaniu szczególnej ostrożności, a uczestnicy ruchu mają obowiązek ułatwić mu przejazd.'
  },
  {
    category: 'Dydaktyka',
    question: 'Na czym polega zasada stopniowania trudności podczas szkolenia praktycznego kandydata na kierowcę?',
    options: [
      'Na rozpoczynaniu jazdy od razu w ruchu miejskim o dużym natężeniu.',
      'Na przechodzeniu od zadań prostszych na placu manewrowym do zadań złożonych w ruchu drogowym.',
      'Na łączeniu nowych manewrów z wcześniej utrwalonymi umiejętnościami bez przeciążania uwagi kursanta.'
    ],
    correctAnswers: [1, 2],
    hasImagePlaceholder: false,
    explanation: 'Zasada dydaktyczna stopniowania trudności wymaga uporządkowanego przechodzenia od czynności prostych i bezpiecznych (plac) do złożonych sytuacji drogowych.'
  },
  {
    category: 'Psychologia',
    question: 'Co jest charakterystyczną przyczyną zjawiska tzw. widzenia tunelowego u młodego kierowcy?',
    options: [
      'Nadmierne obciążenie emocjonalne, stres lub zbyt duża prędkość jazdy.',
      'Zbyt niskie ciśnienie w ogumieniu osi przedniej.',
      'Zawężenie pola widzenia obwodowego i skupienie wzroku wyłącznie blisko przed maską pojazdu.'
    ],
    correctAnswers: [0, 2],
    hasImagePlaceholder: false,
    explanation: 'Silny stres oraz wysoka prędkość ograniczają pole widzenia obwodowego i utrudniają wczesne dostrzeganie zagrożeń z boków drogi.'
  },
  {
    category: 'Technika kierowania',
    question: 'Jakie zachowanie kierującego pojazdem wyposażonym w układ ABS jest prawidłowe podczas hamowania awaryjnego na śliskiej nawierzchni?',
    options: [
      'Hamowanie pulsacyjne polegające na cyklicznym zwalnianiu pedału hamulca.',
      'Zdecydowane, ciągłe wciśnięcie pedału hamulca aż do zatrzymania lub ominięcia przeszkody.',
      'Jednoczesne utrzymywanie możliwości kierowania pojazdem i omijania przeszkody podczas działania układu ABS.'
    ],
    correctAnswers: [1, 2],
    hasImagePlaceholder: false,
    explanation: 'Układ ABS zapobiega blokowaniu kół, dlatego kierowca powinien wcisnąć pedał hamulca zdecydowanie do oporu i jednocześnie może omijać przeszkodę.'
  },
  {
    category: 'Pierwsza pomoc',
    question: 'Jaki jest prawidłowy stosunek uciśnięć klatki piersiowej do oddechów ratowniczych podczas resuscytacji krążeniowo-oddechowej osoby dorosłej?',
    options: [
      '15 uciśnięć na 2 oddechy ratownicze.',
      '30 uciśnięć na 2 oddechy ratownicze.',
      '50 uciśnięć na 5 oddechów ratowniczych.'
    ],
    correctAnswers: [1],
    hasImagePlaceholder: false,
    explanation: 'Zgodnie z wytycznymi Europejskiej Rady Resuscytacji (ERC) dla osoby dorosłej stosuje się sekwencję 30 uciśnięć klatki piersiowej na 2 oddechy ratownicze.'
  },
  {
    category: 'Prawo o ruchu drogowym',
    question: 'W przedstawionej na rysunku sytuacji na skrzyżowaniu o ruchu okrężnym bez znaków określających pierwszeństwo, który pojazd ma pierwszeństwo?',
    options: [
      'Pojazd znajdujący się już na rondzie.',
      'Pojazd nadjeżdżający z prawej strony, czyli wjeżdżający na skrzyżowanie.',
      'Zasada prawej ręki obowiązuje, gdy przed wjazdem nie ma znaku A-7 "ustąp pierwszeństwa".'
    ],
    correctAnswers: [1, 2],
    hasImagePlaceholder: true,
    explanation: 'Samo rondo oznaczone wyłącznie znakiem C-12 bez znaku A-7 stanowi skrzyżowanie równorzędne, na którym obowiązuje zasada pierwszeństwa z prawej strony.'
  }
];

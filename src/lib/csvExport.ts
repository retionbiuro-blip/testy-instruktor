import { LicenseCategory, Question } from '../types';

export interface AnonymizedStudentResearchRow {
  anonymousId: string;
  totalAnswered: number;
  totalCorrect: number;
  accuracyPercent: number;
  masteredCount: number;
  completedLessonsCount: number;
  savedOutlinesCount: number;
  streakDays: number;
  examAttemptsCount: number;
}

function escapeCsvCell(value: string | number): string {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  if (/[;"\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function buildCsvString(headers: string[], rows: (string | number)[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(';');
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(';'));
  return [headerLine, ...dataLines].join('\r\n');
}

export function downloadUtf8BomCsv(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildAnonymizedStudentsCsv(rows: AnonymizedStudentResearchRow[]): string {
  const headers = [
    'Identyfikator_Anonimowy',
    'Liczba_Rozwiazanych_Odpowiedzi',
    'Poprawne_Odpowiedzi',
    'Skutecznosc_Procent',
    'Opanowane_Pytania',
    'Przeczytane_Lekcje',
    'Zapisane_Konspekty',
    'Dni_Nauki_Z_Rzedu_Streak',
    'Liczba_Podejsc_Do_Egzaminu'
  ];

  const dataRows = rows.map((row) => [
    row.anonymousId,
    row.totalAnswered,
    row.totalCorrect,
    row.accuracyPercent,
    row.masteredCount,
    row.completedLessonsCount,
    row.savedOutlinesCount,
    row.streakDays,
    row.examAttemptsCount
  ]);

  return buildCsvString(headers, dataRows);
}

function resolveQuestionLicenseCode(licenseCategory?: LicenseCategory): string {
  if (!licenseCategory) return 'B';
  if (licenseCategory === 'ALL') return 'Wspolne (ALL)';
  return licenseCategory;
}

export function buildQuestionDifficultyCsv(
  questions: Question[],
  wrongCounts: Record<string, number>
): string {
  const headers = [
    'ID_Pytania',
    'Dzial_Tematyczny',
    'Kategoria_Prawa_Jazdy',
    'Tresc_Pytania',
    'Liczba_Bledow_Grupy'
  ];

  const sorted = [...questions].sort((a, b) => {
    const wrongA = wrongCounts[a.id] ?? 0;
    const wrongB = wrongCounts[b.id] ?? 0;
    if (wrongB !== wrongA) return wrongB - wrongA;
    return a.category.localeCompare(b.category, 'pl') || a.id.localeCompare(b.id);
  });

  const dataRows = sorted.map((q) => [
    q.id,
    q.category,
    resolveQuestionLicenseCode(q.licenseCategory),
    q.question,
    wrongCounts[q.id] ?? 0
  ]);

  return buildCsvString(headers, dataRows);
}

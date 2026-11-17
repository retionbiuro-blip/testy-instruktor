export const DEFAULT_PRIVACY_POLICY_TEXT = `# Regulamin i Polityka Prywatności serwisu InstruktorPro

## 1. Informacje ogólne i Administrator danych
Serwis **InstruktorPro** jest edukacyjną platformą internetową wspierającą kandydatów na instruktorów nauki jazdy w przygotowaniu do egzaminu państwowego. Administratorem serwisu oraz danych przetwarzanych w ramach aplikacji jest jej twórca i administrator (kontakt: \`retion.biuro@gmail.com\`).

## 2. Zakres i cel przetwarzania danych osobowych
Korzystanie z aplikacji jest możliwe w dwóch trybach:
- **Tryb Gościa** — bez zakładania konta i bez przekazywania danych osobowych na serwer.
- **Konto Kursanta** — dobrowolna rejestracja wymagająca podania adresu e-mail, hasła oraz nazwy użytkownika (nicku).

Dane podane podczas rejestracji (adres e-mail oraz nick) są przetwarzane w infrastrukturze **Google Firebase (Authentication i Cloud Firestore)** wyłącznie w celu:
- uwierzytelnienia użytkownika i zapewnienia bezpiecznego dostępu do konta,
- synchronizacji postępów nauki, opanowanych pytań, notatek prywatnych, konspektów oraz historii egzaminów pomiędzy urządzeniami kursanta,
- obsługi zgłoszeń błędów w pytaniach i dostarczania odpowiedzi administratora,
- wyświetlania wybranego przez użytkownika nicku w rankingu grupowym kursu (bez ujawniania adresu e-mail innym uczestnikom).

## 3. Wykorzystanie zanonimizowanych danych do celów naukowo-badawczych
W ramach prowadzonych badań naukowych oraz przygotowywania **pracy dyplomowej (licencjackiej)** dotyczącej efektywności cyfrowych narzędzi dydaktycznych w kształceniu kandydatów na instruktorów nauki jazdy, administrator może analizować **w pełni zanonimizowane statystyki edukacyjne**.

Oznacza to, że zbiory statystyczne wykorzystywane do analizy naukowej:
- **nie zawierają** adresów e-mail, identyfikatorów UID, haseł ani prawdziwych nicków kursantów,
- obejmują wyłącznie anonimowe wskaźniki ilościowe (np. liczbę rozwiązanych zadań, procentową skuteczność, liczbę opanowanych pytań, przeczytanych lekcji, zapisanych konspektów, dni systematycznej nauki oraz zbiorczą trudność pytań),
- są oznaczane losowymi/kolejnymi kodami technicznymi (np. \`Kursant_01\`, \`Kursant_02\`), co całkowicie uniemożliwia identyfikację konkretnej osoby fizycznej.

## 4. Pamięć lokalna przeglądarki (IndexedDB / localStorage)
W celu ograniczenia zużycia transferu i umożliwienia płynnej nauki (również w trybie PWA / offline), baza pytań, materiałów oraz ustawienia motywu są zapisywane lokalnie w pamięci przeglądarki użytkownika (\`IndexedDB\` oraz \`localStorage\`).

## 5. Zasady korzystania i prawa użytkownika
- Materiały i testy mają charakter wyłącznie edukacyjny i pomocniczy w przygotowaniu do egzaminu; nie zastępują obowiązujących aktów prawnych publikowanych w Dzienniku Ustaw.
- Każdy użytkownik ma prawo wglądu do swoich danych, ich poprawiania oraz żądania usunięcia swojego konta wraz z zapisanymi postępami poprzez kontakt z administratorem (\`retion.biuro@gmail.com\`).
- Zgłaszanie uwag merytorycznych do pytań oraz publikowanie komentarzy wymaga poszanowania zasad kultury i merytorycznej dyskusji.
`;

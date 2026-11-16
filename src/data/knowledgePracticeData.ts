import { ExamTopic, GlossaryTerm } from '../types';

export type GlossaryDomain = 'Dydaktyka' | 'Metodyka' | 'Psychologia';

export const DEFAULT_EXAM_TOPICS: ExamTopic[] = [
  {
    id: 'topic_01',
    order: 1,
    category: 'Przepisy ruchu drogowego',
    title:
      'Zasady pierwszeństwa na skrzyżowaniach równorzędnych oraz ze znakami określającymi pierwszeństwo',
    commissionTips:
      'Omów regułę prawej ręki, znaki A-7, B-20, D-1, T-6a/T-6c oraz uprzywilejowaną pozycję pojazdu szynowego na skrzyżowaniu równorzędnym.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Zasady pierwszeństwa na skrzyżowaniach równorzędnych oraz ze znakami określającymi pierwszeństwo.
- **Cel ogólny:** Zapoznanie słuchaczy z hierarchią i regułami ustalania pierwszeństwa przejazdu na skrzyżowaniach oraz wykształcenie umiejętności bezpiecznego podejmowania decyzji przed wjazdem na skrzyżowanie.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant definiuje skrzyżowanie równorzędne i wymienia wyjątki dotyczące pojazdu szynowego oraz wyjazdu z drogi gruntowej lub strefy zamieszkania.
- Kursant rozpoznaje znaki określające pierwszeństwo (D-1, A-7, B-20, T-6a/T-6c) i prawidłowo ustala kolejność przejazdu w typowych sytuacjach kolizyjnych.

**Kategoria postaw (wychowawcze i BRD):**
- Kursant docenia zasadę ograniczonego zaufania przy dojeździe do skrzyżowania.
- Kursant kształtuje nawyk wczesnej obserwacji znaków i upewniania się, czy inni kierujący rzeczywiście ustępują pierwszeństwa.

### 3. Metody nauczania
- **Podająca:** zwięzły wykład i objaśnienie definicji z Prawa o ruchu drogowym.
- **Eksponująca:** pokaz na tablicy magnetycznej z modelami pojazdów i planszami znaków.
- **Problemowa:** wspólne rozwiązywanie 3 przykładów skrzyżowań z tramwajem i łamanym pierwszeństwem.

### 4. Środki dydaktyczne
- Tablica magnetyczna ze schematami skrzyżowań, modele samochodów i tramwaju, plansze ze znakami D-1, A-7, B-20, T-6a/T-6c, Ustawa Prawo o ruchu drogowym (art. 25).

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Powitanie, krótkie pytanie kontrolne o hierarchię sygnałów i znaków drogowych (policjant → sygnalizacja → znaki → reguła prawej ręki), podanie tematu i celów zajęć.
- **Część główna (11 min):**
  - *Min 3–5:* Skrzyżowanie równorzędne — reguła prawej ręki oraz wyjątek pojazdu szynowego.
  - *Min 6–9:* Skrzyżowania ze znakami pierwszeństwa, różnica między A-7 a B-20 (STOP), odczytywanie tabliczek T-6a i T-6c.
  - *Min 10–13:* Ćwiczenie problemowe na tablicy — 2 złożone sytuacje z udziałem tramwaju i pojazdu skręcającego w lewo.
- **Podsumowanie (2 min):** Zbiorcze powtórzenie 3 złotych zasad bezpiecznego wjazdu na skrzyżowanie oraz 2 krótkie pytania sprawdzające dla grupy.`
  },
  {
    id: 'topic_02',
    order: 2,
    category: 'Przepisy ruchu drogowego',
    title:
      'Ruch okrężny (ronda) — wjazd, zmiana pasa ruchu, sygnalizowanie i zjazd ze skrzyżowania',
    commissionTips:
      'Rozróżnij rondo zwykłe i turbinowe, wskaż zasady używania kierunkowskazów przy zjeździe oraz pierwszeństwo tramwaju wjeżdżającego i zjeżdżającego.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Ruch okrężny (ronda) — wjazd, zmiana pasa ruchu, sygnalizowanie i zjazd ze skrzyżowania.
- **Cel ogólny:** Nauczenie prawidłowej techniki pokonywania skrzyżowań o ruchu okrężnym jedno- i wielopasowych zgodnie z przepisami i zasadą płynności ruchu.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant wyjaśnia znaczenie znaków C-12 i A-7 przy wjeździe na rondo.
- Kursant rozróżnia zasady wyboru pasa na rondzie zwykłym i turbinowym oraz moment włączenia prawego kierunkowskazu przed zjazdem.

**Kategoria postaw (wychowawcze i BRD):**
- Kursant kształtuje nawyk czytelnego i wczesnego sygnalizowania zjazdu dla ułatwienia włączenia się innym kierującym.
- Kursant pamięta o obserwacji martwego pola lusterka przy zmianie pasa na obwiedni ronda.

### 3. Metody nauczania
- **Podająca:** objaśnienie organizacji ruchu na rondach jedno- i dwupasowych.
- **Eksponująca:** pokaz torów jazdy na tablicy ze schematem ronda zwykłego i turbinowego.
- **Problemowa:** analiza najczęstszego błędu (zjazd z wewnętrznego pasa wprost przed pojazd na pasie zewnętrznym).

### 4. Środki dydaktyczne
- Tablica ze schematem ronda zwykłego i turbinowego, modele pojazdów i tramwaju, plansza ze znakami C-12, A-7, F-10.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Nawiązanie do poprzednich zajęć o pierwszeństwie, wyjaśnienie dlaczego rondo poprawia bezpieczeństwo (redukcja punktów kolizyjnych), przedstawienie celów.
- **Część główna (11 min):**
  - *Min 3–5:* Oznakowanie wjazdu (C-12 + A-7 vs samo C-12) i pierwszeństwo tramwaju na rondzie.
  - *Min 6–9:* Wybór pasa przed wjazdem i sygnalizowanie zjazdu z ronda zwykłego oraz zmiana pasa na obwiedni.
  - *Min 10–13:* Specyfika ronda turbinowego (linie ciągłe P-2, brak możliwości zmiany pasa wewnątrz).
- **Podsumowanie (2 min):** Przypomnienie zasady: „prawy kierunkowskaz zawsze przy zjeździe” i krótkie pytanie o martwe pole przed zjazdem.`
  },
  {
    id: 'topic_03',
    order: 3,
    category: 'Przepisy ruchu drogowego',
    title:
      'Wyprzedzanie, omijanie i wymijanie — warunki bezpiecznego wykonania manewru oraz zakazy ustawowe',
    commissionTips:
      'Rozróżnij dokładnie definicje wyprzedzania, omijania i wymijania; wymień zakazy wyprzedzania (przejścia, wzniesienia, skrzyżowania) i wyjątki (np. sygnalizacja kierowana).',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Wyprzedzanie, omijanie i wymijanie — warunki bezpiecznego wykonania manewru oraz zakazy ustawowe.
- **Cel ogólny:** Opanowanie definicji prawnych i praktycznych kryteriów oceny ryzyka podczas wykonywania najbardziej niebezpiecznego manewru drogowego, jakim jest wyprzedzanie.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant bezbłędnie rozróżnia manewry: wyprzedzanie, omijanie i wymijanie.
- Kursant wymienia miejsca objęte ustawowym zakazem wyprzedzania oraz wyjątki pozwalające na wyprzedzanie z prawej strony.

**Kategoria postaw (wychowawcze i BRD):**
- Kursant wykształca krytyczną ocenę odległości i czasu potrzebnego do bezpiecznego powrotu na prawy pas.
- Kursant rezygnuje z wyprzedzania w warunkach niepewnej widoczności („na trzeciego”).

### 3. Metody nauczania
- **Podająca:** omówienie definicji z art. 2 i zasad z art. 24 Prawa o ruchu drogowym.
- **Problemowa:** obliczenie orientacyjnej drogi potrzebnej do wyprzedzenia ciężarówki przy 90 km/h.
- **Eksponująca:** schematy na tablicy (wyprzedzanie przed wierzchołkiem wzniesienia, przejście dla pieszych, B-25/B-26).

### 4. Środki dydaktyczne
- Tablica, plansze znaków B-25, B-26, A-15, znaki poziome P-3 i P-4, ustawa PoRD (art. 23 i 24).

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Podanie przykładu kolizji wynikającej z błędnego wyprzedzania i przedstawienie tematu oraz celów lekcji.
- **Część główna (11 min):**
  - *Min 3–5:* Definicje wyprzedzania, omijania i wymijania (wskazanie ruchu vs unieruchomienia obiektu).
  - *Min 6–9:* Trzy kroki bezpiecznego wyprzedzania (czy wolno → czy jest miejsce/widoczność → czy nikt z tyłu nie wyprzedza) oraz zakazy ustawowe.
  - *Min 10–13:* Wyprzedzanie z prawej strony oraz zachowanie bezpiecznego odstępu (min. 1 m od roweru/pieszego).
- **Podsumowanie (2 min):** Zadanie 2 krótkich pytań kontrolnych grupie i akcent na zasadę „wątpliwość = rezygnacja z manewru”.`
  },
  {
    id: 'topic_04',
    order: 4,
    category: 'Przepisy ruchu drogowego',
    title:
      'Używanie świateł zewnętrznych pojazdu w dzień, w nocy oraz w warunkach zmniejszonej przejrzystości powietrza',
    commissionTips:
      'Wskaż warunki użycia świateł do jazdy dziennej, mijania, drogowych oraz przeciwmgłowych przednich i tylnych (przejrzystość poniżej 50 m).',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Używanie świateł zewnętrznych pojazdu w dzień, w nocy oraz w warunkach zmniejszonej przejrzystości powietrza.
- **Cel ogólny:** Wykształcenie umiejętności prawidłowego doboru oświetlenia zewnętrznego do pory doby, pogody i sytuacji drogowej dla zapewnienia widoczności własnej i innych uczestników ruchu.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant wymienia warunki używania świateł do jazdy dziennej i wskazuje sytuacje wymuszające zmianę na światła mijania (zmierzch, tunel, opady).
- Kursant podaje warunki włączenia świateł drogowych oraz przeciwmgłowych przednich (kręte drogi nocą, zmniejszona przejrzystość) i tylnych (< 50 m).

**Kategoria postaw (wychowawcze i BRD):**
- Kursant pamięta o nieoślepianiu innych kierowców (w tym kierujących z naprzeciwka oraz przez tylną szybę).
- Kursant nie polega bezkrytycznie na trybie „AUTO” świateł w czasie mgły lub deszczu za dnia.

### 3. Metody nauczania
- **Pogadanka:** rozmowa z grupą o problemie jazdy „na światłach dziennych w deszczu i mgle” (brak oświetlonego tyłu).
- **Podająca:** usystematyzowanie art. 51 i art. 30 ustawy PoRD.
- **Eksponująca:** schemat rozkładu wiązki świateł mijania, drogowych i przeciwmgłowych.

### 4. Środki dydaktyczne
- Tablica, plansza z symbolami kontrolek deski rozdzielczej (kolory: zielony, niebieski, pomarańczowy), ustawa PoRD (art. 30 i 51).

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Pytanie wstępne: dlaczego niektóre auta w gęstej mgle za dnia są całkowicie niewidoczne z tyłu? Podanie tematu i celów.
- **Część główna (11 min):**
  - *Min 3–5:* Światła mijania vs światła do jazdy dziennej (kiedy obowiązkowo przełączamy).
  - *Min 6–9:* Światła drogowe — zmiana na mijania przy pojazdach z naprzeciwka, szynowych, kolumnach pieszych i z tyłu innego pojazdu.
  - *Min 10–13:* Warunki zmniejszonej przejrzystości powietrza — światła przeciwmgłowe przednie i tylne (granica 50 m, obowiązek wyłączenia po poprawie widoczności).
- **Podsumowanie (2 min):** Krótki test rozpoznawania 3 kontrolek świetlnych na planszy oraz podkreślenie zasady „widzieć i być widocznym”.`
  },
  {
    id: 'topic_05',
    order: 5,
    category: 'Przepisy ruchu drogowego',
    title:
      'Przejazdy kolejowe i tramwajowe — hierarchia sygnałów, zakazy i postępowanie w sytuacji awaryjnej',
    commissionTips:
      'Podkreśl zasadę szczególnej ostrożności, zakaz wjazdu gdy brak miejsca do zjazdu, znaczenie czerwonego światła oraz zachowanie przy zatrzaśnięciu między rogatkami.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Przejazdy kolejowe i tramwajowe — hierarchia sygnałów, zakazy i postępowanie w sytuacji awaryjnej.
- **Cel ogólny:** Przygotowanie kursantów do bezpiecznego pokonywania przejazdów szynowych oraz właściwego reagowania w sytuacjach zagrażających życiu na torowisku.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant wymienia zakazy obowiązujące na przejeździe kolejowym i przed nim (zakaz wyprzedzania, omijania oczekujących pojazdów, wjazdu bez miejsca na zjazd, wjazdu przy migającym świetle czerwonym lub ruchu zapór).
- Kursant opisuje procedurę ratunkową w razie unieruchomienia pojazdu lub zamknięcia między rogatkami (wyłamanie rogatki, nr 112 i Żółta Naklejka PLK).

**Kategoria postaw (wychowawcze i BRD):**
- Kursant odrzuca pośpiech i uleganie presji na przejazdach niestrzeżonych oraz z półrogatkami.

### 3. Metody nauczania
- **Podająca:** omówienie przepisów art. 28 PoRD oraz kategorii przejazdów.
- **Eksponująca:** prezentacja znaków A-9, A-10, G-1a/b/c, G-3, G-4 i przykładu Żółtej Naklejki PLK.
- **Problemowa:** scenariusz awaryjny — „Co robisz, gdy auto gaśnie na torach, a zapory zaczynają opadać?”.

### 4. Środki dydaktyczne
- Tablica, plansze znaków kolejowych, schemat Żółtej Naklejki PLK, model przejazdu z półrogatkami.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Krótka statystyka skutków zderzeń na przejazdach (droga hamowania pociągu 800–1200 m), podanie tematu i celów.
- **Część główna (11 min):**
  - *Min 3–6:* Oznakowanie przejazdów (słupki wskaźnikowe, krzyż św. Andrzeja, sygnalizator S-1 na przejeździe) i bezwzględne zakazy przed i na przejeździe.
  - *Min 7–10:* Zasada braku miejsca do kontynuowania jazdy — kiedy zatrzymać się przed torem.
  - *Min 11–13:* Postępowanie awaryjne — ewakuacja osób, wyłamanie rogatki (bezpiecznik drążkowy), wezwanie pomocy z podaniem numeru skrzyżowania z Żółtej Naklejki PLK.
- **Podsumowanie (2 min):** Powtórzenie hasła „Życie jest warte więcej niż rogatka” i 2 pytania kontrolne do słuchaczy.`
  },
  {
    id: 'topic_06',
    order: 6,
    category: 'Technika kierowania i BRD',
    title: 'Prędkość dopuszczalna i bezpieczna, droga zatrzymania pojazdu oraz systemy ABS i ESP',
    commissionTips:
      'Rozdziel czas reakcji (droga reakcji) od drogi hamowania; wyjaśnij fizykę przyczepności i prawidłowe hamowanie awaryjne z systemem ABS.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Prędkość dopuszczalna i bezpieczna, droga zatrzymania pojazdu oraz systemy ABS i ESP.
- **Cel ogólny:** Uświadomienie wpływu prędkości i stanu nawierzchni na długość drogi zatrzymania oraz nauczenie efektywnego wykorzystania systemów bezpieczeństwa czynnego.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant definiuje prędkość bezpieczną i odróżnia ją od prędkości administracyjnie dopuszczalnej.
- Kursant rozpisuje składowe drogi zatrzymania (droga przejechana w czasie reakcji + droga hamowania) oraz wyjaśnia działanie systemów ABS i ESP.

**Kategoria postaw (wychowawcze i BRD):**
- Kursant rozumie, że dwukrotny wzrost prędkości wydłuża drogę hamowania czterokrotnie.
- Kursant podczas hamowania awaryjnego nie zwalnia nacisku na pedał hamulca mimo pulsowania pedału ABS.

### 3. Metody nauczania
- **Problemowa:** porównanie drogi zatrzymania przy 50 km/h i 70 km/h przed nagłą przeszkodą.
- **Podająca:** definicja prędkości bezpiecznej (art. 19 PoRD) i omówienie zasad działania ABS/ESP.
- **Eksponująca:** wykres zależności drogi zatrzymania od prędkości i rodzaju nawierzchni na tablicy.

### 4. Środki dydaktyczne
- Tablica, wykres drogi zatrzymania (sucho / mokro / lód), tabela limitów prędkości w Polsce.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Zagadka liczbowo-sytuacyjna: z jaką prędkością uderzy w przeszkodę auto jadące 70 km/h w miejscu, gdzie jadące 50 km/h już się zatrzymało? Podanie celów.
- **Część główna (11 min):**
  - *Min 3–5:* Limity prędkości w Polsce vs prędkość bezpieczna (warunki drogi, ładunek, widoczność, umiejętności).
  - *Min 6–9:* Droga reakcji i droga hamowania — dlaczego rośnie z kwadratem prędkości.
  - *Min 10–13:* Rola systemów ABS (zachowanie sterowności podczas hamowania na granicy poślizgu) i ESP (stabilizacja toru jazdy w zakręcie).
- **Podsumowanie (2 min):** Wniosek o konieczności pozostawiania marginesu bezpieczeństwa oraz przypomnienie techniki „sprzęgło + hamulec w podłogę” z ABS.`
  },
  {
    id: 'topic_07',
    order: 7,
    category: 'Przepisy ruchu drogowego',
    title:
      'Ruch pieszych, rowerzystów oraz kierujących hulajnogami elektrycznymi — szczególna ostrożność kierującego',
    commissionTips:
      'Omów aktualne przepisy dotyczące pierwszeństwa pieszego wchodzącego na przejście, zakaz wyprzedzania na przejściu i przejeździe oraz zasady dla UTO/hulajnóg.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Ruch pieszych, rowerzystów oraz kierujących hulajnogami elektrycznymi — szczególna ostrożność kierującego.
- **Cel ogólny:** Wykształcenie umiejętności bezpiecznego współdzielenia przestrzeni drogowej z niechronionymi uczestnikami ruchu zgodnie z aktualnymi przepisami.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant wskazuje moment powstania obowiązku ustąpienia pierwszeństwa pieszemu (wchodzącemu i znajdującemu się na przejściu) oraz rowerzyście na przejeździe.
- Kursant wymienia zasady poruszania się hulajnogą elektryczną (jezdnia do 30 km/h, droga dla rowerów, chodnik z prędkością pieszego).

**Kategoria postaw (wychowawcze i BRD):**
- Kursant przejawia empatię i zachowuje obniżoną prędkość przed przejściem, nawet gdy nie widzi jeszcze pieszego za zaparkowanymi autami.

### 3. Metody nauczania
- **Podająca:** przedstawienie obowiązków z art. 26 i art. 27 ustawy PoRD.
- **Problemowa:** analiza zagrożenia przy omijaniu pojazdu, który zatrzymał się przed przejściem dla pieszych.
- **Eksponująca:** schematy przejścia dla pieszych i przejazdu dla rowerów (znaki D-6, D-6a, D-6b, P-10, P-11).

### 4. Środki dydaktyczne
- Tablica, plansze znaków D-6 / D-6b / C-13 / C-16, modele pojazdów i pieszego, ustawa PoRD.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Podkreślenie, że niechronieni uczestnicy nie mają stref zgniotu ani poduszek powietrznych; przedstawienie celów lekcji.
- **Część główna (11 min):**
  - *Min 3–6:* Pieszy na przejściu i wchodzący na przejście; bezwzględny zakaz wyprzedzania na przejściu i omijania auta zatrzymanego w celu ustąpienia pieszemu.
  - *Min 7–10:* Rowerzyści i przejazdy dla rowerzystów (skręt kierowcy w drogę poprzeczną, śluzy rowerowe).
  - *Min 11–13:* Hulajnogi elektryczne i UTO — gdzie mogą się poruszać, zakazy na przejściach dla pieszych.
- **Podsumowanie (2 min):** Zbiorcza checklista zachowania przed przejściem (zdejmij nogę z gazu, obserwuj chodnik i sąsiednie pasy).`
  },
  {
    id: 'topic_08',
    order: 8,
    category: 'Technika kierowania i BRD',
    title:
      'Jazda na autostradach i drogach ekspresowych — włączanie się do ruchu, jazda na suwak i korytarz życia',
    commissionTips:
      'Wyjaśnij prawidłowe wykorzystanie pasa włączania (rozbiegowego), minimalny odstęp (połowa prędkości w metrach), zakaz cofania/zawracania oraz zasady jazdy na suwak.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Jazda na autostradach i drogach ekspresowych — włączanie się do ruchu, jazda na suwak i korytarz życia.
- **Cel ogólny:** Przygotowanie przyszłych kierowców do bezpiecznego, płynnego i przepisowego poruszania się po drogach szybkiego ruchu.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant podaje limity prędkości, zakazy (cofanie, zawracanie, postój poza wyznaczonymi miejscami) oraz wzór na bezpieczny odstęp (min. 0,5 × prędkość w metrach).
- Kursant opisuje dokładny schemat tworzenia korytarza życia i jazdy na suwak (art. 9 i art. 22 PoRD).

**Kategoria postaw (wychowawcze i BRD):**
- Kursant rozumie znaczenie wpuszczania jednego pojazdu przy zwężeniu (kultura jazdy na suwak) oraz natychmiastowego zjeżdżania w zatorze pod korytarz życia.

### 3. Metody nauczania
- **Eksponująca:** rozrysowanie pasa rozbiegowego, jezdni wielopasowej (korytarz życia) oraz zwężenia („suwak”) na tablicy.
- **Podająca:** omówienie przepisów dotyczących dróg A i S oraz procedury awaryjnego postoju za barierą.
- **Pogadanka:** dlaczego gwałtowne hamowanie na pasie rozbiegowym stwarza ogromne zagrożenie.

### 4. Środki dydaktyczne
- Tablica, plansze D-9 (autostrada), D-7 (ekspresowa), modele pojazdów i pojazdu uprzywilejowanego.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Wskazanie różnic między drogą zwykłą a drogą szybkiego ruchu (brak skrzyżowań jednopoziomowych, wysokie prędkości), podanie celów.
- **Część główna (11 min):**
  - *Min 3–6:* Włączanie się do ruchu pasem rozbiegowym (przyspieszenie do prędkości potoku, użycie lusterka i martwego pola) oraz reguła bezpiecznego odstępu.
  - *Min 7–10:* Korytarz życia (lewy pas w lewo, pozostałe w prawo — bez wjeżdżania na pas awaryjny, chyba że konieczne) oraz jazda na suwak (na końcu zanikającego pasa).
  - *Min 11–13:* Awaria na autostradzie (pas awaryjny, kamizelka odblaskowa, trójkąt 100 m, opuszczenie auta za barierę).
- **Podsumowanie (2 min):** 2 krótkie pytania kontrolne o korytarz życia i odległość trójkąta ostrzegawczego (100 m).`
  },
  {
    id: 'topic_09',
    order: 9,
    category: 'Pierwsza pomoc',
    title:
      'Postępowanie na miejscu wypadku drogowego oraz zasady resuscytacji krążeniowo-oddechowej (RKO)',
    commissionTips:
      'Zawsze zacznij od bezpieczeństwa własnego i zabezpieczenia miejsca zdarzenia; podaj kolejność: ocena przytomności → udrożnienie dróg oddechowych → ocena oddechu (10 s) → 112 → 30:2.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Postępowanie na miejscu wypadku drogowego oraz zasady resuscytacji krążeniowo-oddechowej (RKO).
- **Cel ogólny:** Wykształcenie opanowanego, algorytmicznego działania na miejscu wypadku oraz znajomości podstawowych zabiegów ratujących życie (BLS).

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant wymienia kolejne kroki zabezpieczenia miejsca wypadku (kamizelka, światła awaryjne, trójkąt, wyłączenie zapłonu poszkodowanego pojazdu).
- Kursant podaje algorytm oceny poszkodowanego i parametry RKO u dorosłego (30 uciśnięć na głębokość 5–6 cm, tempo 100–120/min, 2 oddechy ratownicze).

**Kategoria postaw (wychowawcze i BRD):**
- Kursant przełamuje strach przed podjęciem resuscytacji, pamiętając o obowiązku prawnym i moralnym udzielenia pomocy.

### 3. Metody nauczania
- **Podająca:** omówienie łańcucha przeżycia i zasad bezpieczeństwa ratownika.
- **Eksponująca:** pokaz na fantomie ułożenia rąk na środku klatki piersiowej i ułożenia w pozycji bezpiecznej.
- **Problemowa:** analiza kiedy wolno ewakuować rannego z pojazdu (tylko bezpośrednie zagrożenie: pożar, woda, konieczność RKO).

### 4. Środki dydaktyczne
- Fantom RKO, apteczka samochodowa, kamizelka odblaskowa, trójkąt ostrzegawczy, plansza z algorytmem BLS i numerem 112.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Przypomnienie art. 162 Kodeksu karnego (obowiązek udzielenia pomocy) oraz naczelnej zasady: „Najpierw własne bezpieczeństwo”.
- **Część główna (11 min):**
  - *Min 3–5:* Zabezpieczenie miejsca zdarzenia i prawidłowe wezwanie pomocy na numer 112 (gdzie, co się stało, ile osób, stan, dane zgłaszającego — nigdy nie rozłączaj się pierwszy).
  - *Min 6–10:* Ocena przytomności i oddechu (10 s, odchylenie głowy), pozycja bezpieczna vs rozpoczęcie RKO 30:2 i użycie AED.
  - *Min 11–13:* Specyfika wypadku komunikacyjnego (stabilizacja odcinka szyjnego, zakaz zdejmowania kasku motocykliście bez potrzeby udrożnienia dróg oddechowych).
- **Podsumowanie (2 min):** Krótka powtórka rytmu 30:2 i kolejności działań przed przyjazdem ZRM.`
  },
  {
    id: 'topic_10',
    order: 10,
    category: 'Psychologia i BRD',
    title: 'Wpływ alkoholu, środków odurzających oraz zmęczenia na percepcję i czas reakcji kierowcy',
    commissionTips:
      'Wskaż zjawisko widzenia tunelowego, fałszywą pewność siebie, wydłużenie czasu reakcji psychicznej i motorycznej oraz progi prawne (0,2‰ vs 0,5‰).',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Wpływ alkoholu, środków odurzających oraz zmęczenia na percepcję i czas reakcji kierowcy.
- **Cel ogólny:** Uświadomienie mechanizmów psychologicznych i fizjologicznych zaburzających zdolność prowadzenia pojazdu pod wpływem używek oraz deficytu snu.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant rozróżnia stan po użyciu alkoholu (0,2–0,5‰) i stan nietrzeźwości (> 0,5‰).
- Kursant wyjaśnia pojęcia: widzenie tunelowe, wydłużony czas reakcji psychomotorycznej oraz zjawisko mikrosnu przy zmęczeniu.

**Kategoria postaw (wychowawcze i BRD):**
- Kursant kształtuje postawę bezwzględnej trzeźwości za kierownicą oraz umiejętność przerwania podróży przy pierwszych oznakach senności.

### 3. Metody nauczania
- **Pogadanka:** omówienie popularnych mitów („mocna kawa lub prysznic przyspieszają spalanie alkoholu”).
- **Podająca:** przedstawienie wpływu alkoholu na korę mózgową, ocenę odległości i ostrość widzenia.
- **Eksponująca:** demonstracja tzw. alkogogli lub schematu zawężenia pola widzenia (widzenie tunelowe).

### 4. Środki dydaktyczne
- Tablica, schemat zawężania pola widzenia, zestaw alkogogli (opcjonalnie), tabela tempa eliminacji alkoholu (ok. 0,1–0,15‰/h).

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Krótki opis jak niewielka dawka alkoholu daje złudne poczucie lepszej sprawności przy faktycznym spadku precyzji; cele zajęć.
- **Część główna (11 min):**
  - *Min 3–6:* Wpływ alkoholu na percepcję (widzenie tunelowe, olśnienie nocą, błędna ocena prędkości) i czas reakcji.
  - *Min 7–10:* Leki i środki odurzające (spowolnienie vs nadpobudliwość), alkohol dnia następnego („kac”).
  - *Min 11–13:* Zmęczenie i mikrosen (24 h bez snu ≈ 1,0‰ alkoholu we krwi) — jedynym skutecznym lekarstwem jest drzemka 15–20 min i przewietrzenie.
- **Podsumowanie (2 min):** Rozwianie mitu o „wytrzeźwieniu po kawie” i przypomnienie zasady: „Piłeś lub jesteś skrajnie zmęczony — nie jedź”.`
  },
  {
    id: 'topic_11',
    order: 11,
    category: 'Metodyka szkolenia',
    title:
      'Nauczanie podstawowych zadań na placu manewrowym: jazda pasem ruchu do przodu i do tyłu oraz ruszanie na wzniesieniu',
    commissionTips:
      'Odwołaj się do zasad stopniowania trudności i poglądowości, właściwej pozycji za kierownicą, ustawienia lusterek oraz metodyki instruktażu bez „uczenia na tyczki”.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Nauczanie podstawowych zadań na placu manewrowym: jazda pasem ruchu do przodu i do tyłu oraz ruszanie na wzniesieniu.
- **Cel ogólny:** Poznanie prawidłowej metodyki kształtowania u kursanta wyczucia gabarytów pojazdu, płynnego operowania sprzęgłem i obserwacji otoczenia bez mechanicznego wyuczania „na słupki”.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant zna kryteria egzaminacyjne zadań nr 1 i 2 na placu manewrowym (płynność, brak najechania na linie, obserwacja przez tylną szybę i lusterka, maksymalne cofnięcie na wzniesieniu 0,2 m).
- Kursant rozumie błędy metodyczne polegające na sztywnym wiązaniu skrętu kierownicy wyłącznie z pachołkami.

**Kategoria postaw (wychowawcze i BRD):**
- Kursant cierpliwie koryguje tor jazdy przez obserwację przestrzeni, a instruktor buduje w nim poczucie kontroli nad pojazdem.

### 3. Metody nauczania
- **Eksponująca:** pokaz instruktora za kierownicą (prawidłowa pozycja, lusterka, praca sprzęgłem na półsprzęgle).
- **Ćwiczeń praktycznych (instruktaż):** próby kursanta dzielone na etapy (najpierw sam przejazd do przodu, potem cofanie odcinkami).
- **Pogadanka:** omówienie korekty toru jazdy w trakcie cofania („patrz tam, dokąd jedziesz”).

### 4. Środki dydaktyczne
- Pojazd szkoleniowy (L), plac manewrowy z łukiem i wzniesieniem, pachołki, szkicownik do rysowania geometrii skrętu kół.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Przypomnienie zasady stopniowania trudności i sprawdzenie przygotowania do jazdy (fotel, pasy, lusterka).
- **Część główna (11 min):**
  - *Min 3–6:* Omówienie geometrii łuku i pracy wzrokiem (obserwacja obu krawędzi pasa, nie tylko jednego lusterka).
  - *Min 7–10:* Metodyka nauki jazdy do tyłu po łuku (prędkość kontrolowana półsprzęgłem, drobne korekty kierownicą, omówienie błędów).
  - *Min 11–13:* Ruszanie pod górę z hamulca postojowego (wyczucie momentu „przysiadania” tyłu / spadku obrotów przed zwolnieniem ręcznego).
- **Podsumowanie (2 min):** Podkreślenie różnicy między świadomym rozumieniem toru jazdy a mechanicznym liczeniem pachołków.`
  },
  {
    id: 'topic_12',
    order: 12,
    category: 'Dydaktyka i psychologia',
    title:
      'Praca z kursantem przejawiającym silny lęk przed jazdą lub nadmierną pewność siebie',
    commissionTips:
      'Wykorzystaj pojęcia eustresu i dystresu, zasady indywidualizacji oraz stopniowania trudności, a także spokojnej komunikacji zwrotnej (informacja korygująca zamiast krytyki).',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Praca z kursantem przejawiającym silny lęk przed jazdą lub nadmierną pewność siebie.
- **Cel ogólny:** Wyposażenie przyszłego instruktora w narzędzia psychologiczne i metodyczne pozwalające skutecznie regulować poziom pobudzenia oraz postawę ryzyka u skrajnych typów kursantów.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant rozróżnia stres mobilizujący (eustres) od paraliżującego (dystres) i wskazuje ich objawy w trakcie jazdy.
- Kursant dobiera strategie dydaktyczne dla kursanta lękowego oraz dla kursanta brawurowego.

**Kategoria postaw (wychowawcze i BRD):**
- Kursant (przyszły instruktor) buduje atmosferę bezpieczeństwa i wzajemnego zaufania w kabinie, unikając podnoszenia głosu i ironii.

### 3. Metody nauczania
- **Problemowa:** analiza dwóch skrajnych przypadków z praktyki szkoleniowej („paraliż na skrzyżowaniu” vs „młody kierowca po grach wyścigowych”).
- **Pogadanka:** sformułowanie zasad konstruktywnej informacji zwrotnej (FUKO / opis błędu i rozwiązania).
- **Podająca:** przypomnienie zasad indywidualizacji i stopniowania trudności.

### 4. Środki dydaktyczne
- Tablica z krzywą zależności sprawności od poziomu stresu (prawo Yerkesa-Dodsona), karty sytuacyjne.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Wskazanie, że połowa sukcesu szkolenia to psychologia relacji instruktor–kursant; określenie celów lekcji.
- **Część główna (11 min):**
  - *Min 3–6:* Kursant lękowy (dystres) — powrót na spokojniejsze ulice, wczesne i krótkie komendy, chwalenie małych postępów, normalizowanie błędów.
  - *Min 7–10:* Kursant nadmiernie pewny siebie — spokojne uświadomienie luk w obserwacji (np. analiza martwego pola, pytania „co gdyby?”), budowanie wewnętrznego lokusu kontroli.
  - *Min 11–13:* Komunikacja instruktorska w stresie — spokojny ton, omówienie sytuacji po bezpiecznym zatrzymaniu.
- **Podsumowanie (2 min):** Złota reguła: „Korygujemy błąd w zachowaniu, nigdy nie atakujemy osobowości kursanta”.`
  },
  {
    id: 'topic_13',
    order: 13,
    category: 'Technika kierowania i BRD',
    title:
      'Zasady eko-jazdy (ecodriving) — płynne ruszanie, zmiana biegów, hamowanie silnikiem i przewidywanie sytuacji',
    commissionTips:
      'Pokaż związek między eko-jazdą a bezpieczeństwem (płynność, patrzenie daleko przed pojazd, hamowanie silnikiem), a nie tylko oszczędnością paliwa.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Zasady eko-jazdy (ecodriving) — płynne ruszanie, zmiana biegów, hamowanie silnikiem i przewidywanie sytuacji.
- **Cel ogólny:** Przekonanie kursantów, że jazda ekonomiczna i ekologiczna jest równocześnie jazdą płynną, przewidywalną i najbezpieczniejszą.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant wymienia 5 kluczowych zasad eko-jazdy (dynamiczne ale płynne rozpędzanie, zmiana biegu na wyższy przy ~2000–2500 obr./min, hamowanie silnikiem, przewidywanie sygnalizacji, właściwe ciśnienie w oponach).
- Kursant wyjaśnia, dlaczego hamowanie silnikiem z włączonym biegiem daje zerowe zużycie paliwa i lepszą stabilność auta.

**Kategoria postaw (wychowawcze i BRD):**
- Kursant rezygnuje z jazdy „od zderzaka do zderzaka” i nerwowego dojeżdżania na luzie do czerwonego światła.

### 3. Metody nauczania
- **Podająca:** objaśnienie pracy silnika przy hamowaniu na biegu vs na biegu jałowym.
- **Pogadanka:** wspólne wyliczenie korzyści dla bezpieczeństwa, portfela i trwałości hamulców oraz sprzęgła.
- **Eksponująca:** schemat zmiany biegów i obserwacji dalekiego pola widzenia.

### 4. Środki dydaktyczne
- Tablica, schemat obrotomierza (strefa optymalna dla silnika benzynowego i Diesla), kalkulacja zużycia paliwa.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Rozwianie mitu, że „eko-jazda to zawalidroga” — pokazanie, że chodzi o płynność i obserwację daleko w przód.
- **Część główna (11 min):**
  - *Min 3–6:* Technika rozpędzania i moment zmiany biegów (z wyłączeniem „duszenia” silnika na zbyt niskich obrotach pod górę).
  - *Min 7–10:* Hamowanie silnikiem i stopniowa redukcja (bez jazdy „na luzie” przed skrzyżowaniem — wymóg egzaminacyjny!).
  - *Min 11–13:* Czynniki dodatkowe: ciśnienie w oponach, zbędny bagaż, bagażnik dachowy, korzystanie z klimatyzacji i systemu Start-Stop.
- **Podsumowanie (2 min):** Pytanie kontrolne o różnicę między jazdą na biegu jałowym a hamowaniem silnikiem.`
  },
  {
    id: 'topic_14',
    order: 14,
    category: 'Przepisy ruchu drogowego',
    title:
      'Strefa zamieszkania, strefa ruchu i droga wewnętrzna — różnice w obowiązywaniu przepisów i pierwszeństwie',
    commissionTips:
      'Wskaż limit prędkości 20 km/h, bezwzględne prawa pieszego na całej szerokości drogi, zakaz postoju poza miejscami wyznaczonymi oraz włączanie się do ruchu przy wyjeździe.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Strefa zamieszkania, strefa ruchu i droga wewnętrzna — różnice w obowiązywaniu przepisów i pierwszeństwie.
- **Cel ogólny:** Uporządkowanie wiedzy na temat obowiązywania przepisów Prawa o ruchu drogowym na obszarach osiedlowych i poza drogami publicznymi.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant rozpoznaje znaki D-40/D-41 (strefa zamieszkania) oraz D-52/D-53 (strefa ruchu) i wskazuje skutki ich ustawienia.
- Kursant wymienia zasady obowiązujące w strefie zamieszkania (20 km/h, pierwszeństwo pieszego wszędzie, postój tylko w miejscach wyznaczonych, włączanie się do ruchu na wyjeździe).

**Kategoria postaw (wychowawcze i BRD):**
- Kursant zachowuje szczególną uważność na osiedlach z uwagi na bawiące się dzieci i nieoznakowane progi zwalniające.

### 3. Metody nauczania
- **Podająca:** omówienie zakresu obowiązywania ustawy PoRD (art. 1 oraz art. 2 pkt 16).
- **Eksponująca:** plansze ze znakami D-40, D-41, D-52, D-53 oraz tabela porównawcza 3 stref.
- **Problemowa:** ustalenie pierwszeństwa przy wyjeździe ze strefy zamieszkania na skrzyżowanie bez znaków.

### 4. Środki dydaktyczne
- Tablica z tabelą porównawczą, plansze znaków D-40–D-53, ustawa PoRD.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Krótki opis typowej pułapki egzaminacyjnej na wyjeździe z osiedla; podanie tematu i celów.
- **Część główna (11 min):**
  - *Min 3–6:* Strefa zamieszkania — 4 żelazne zasady (prędkość 20 km/h, pieszy na całej szerokości drogi, parkowanie wyłącznie w wyznaczonych miejscach, wyjazd = włączanie się do ruchu).
  - *Min 7–10:* Strefa ruchu vs droga wewnętrzna (pełne stosowanie PoRD na parkingach marketów i osiedlach w strefie ruchu, wyjazd ze strefy ruchu też jest włączaniem się do ruchu).
  - *Min 11–13:* Droga wewnętrzna bez znaków D-52 — jakie przepisy działają (zasady unikania zagrożenia i znaki drogowe na niej umieszczone).
- **Podsumowanie (2 min):** Szybka runda pytań „Prawda / Fałsz” o parkowanie na chodniku w strefie zamieszkania i limit prędkości.`
  },
  {
    id: 'topic_15',
    order: 15,
    category: 'Obsługa i eksploatacja',
    title:
      'Przygotowanie pojazdu do jazdy, czynności kontrolno-obsługowe oraz przewożenie dzieci i ładunków',
    commissionTips:
      'Omów płyny pod maską, światła, ciśnienie i minimalny bieżnik opon (1,6 mm), widoczność z fotela kierowcy oraz zasady przewożenia dzieci w fotelikach (150 cm wzrostu).',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Przygotowanie pojazdu do jazdy, czynności kontrolno-obsługowe oraz przewożenie dzieci i ładunków.
- **Cel ogólny:** Nauczenie codziennej rutyny kontroli stanu technicznego pojazdu, ergonomicznej pozycji za kierownicą oraz bezpiecznego mocowania dzieci i bagażu.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant wskazuje pod maską wlewy i zbiorniki płynów (olej, płyn chłodniczy, hamulcowy, spryskiwaczy) oraz sprawdza wszystkie światła zewnętrzne.
- Kursant podaje wymagania dotyczące ogumienia (min. 1,6 mm bieżnika), wyposażenia obowiązkowego (trójkąt, gaśnica) oraz przewożenia dzieci (fotelik do 150 cm wzrostu, wyjątki i zakaz na przednim siedzeniu tyłem przy aktywnej poduszce).

**Kategoria postaw (wychowawcze i BRD):**
- Kursant nie bagatelizuje luźnych przedmiotów w kabinie (efekt pocisku przy hamowaniu awaryjnym).

### 3. Metody nauczania
- **Eksponująca:** pokaz elementów pod maską i prawidłowej regulacji fotela, zagłówka oraz lusterek.
- **Podająca:** omówienie przepisów o przewozie dzieci i zabezpieczeniu ładunku (art. 39 i 61 PoRD).
- **Pogadanka:** dlaczego zagłówek powinien sięgać do czubka głowy i jak ustawić nadgarstki na kierownicy.

### 4. Środki dydaktyczne
- Pojazd szkoleniowy (lub plansza komory silnika), gaśnica i trójkąt ostrzegawczy, model fotelika ISOFIX.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Wskazanie, że egzamin praktyczny zaczyna się właśnie od zadań obsługowych i przygotowania do jazdy; przedstawienie celów.
- **Część główna (11 min):**
  - *Min 3–6:* Kontrola zewnętrzna i komora silnika (opony, światła, sygnał dźwiękowy, poziomy płynów).
  - *Min 7–10:* Ergonomia w kabinie (fotel, zagłówek, pasy bez skręcenia, lusterka) — wpływ na bezpieczeństwo i czas reakcji.
  - *Min 11–13:* Przewożenie dzieci (150 cm, wyłączenie poduszki przy foteliku RWF z przodu) oraz zabezpieczenie ładunku i bagażu.
- **Podsumowanie (2 min):** Krótka checklista 3 rzeczy przed każdym ruszeniem z parkingu (opony/otoczenie → fotel i lusterka → światła i pasy).`
  },
  {
    id: 'topic_16',
    order: 16,
    category: 'Przepisy ruchu drogowego',
    title:
      'Zatrzymanie i postój pojazdu — miejsca ustawowo zabronione oraz prawidłowe unieruchomienie pojazdu',
    commissionTips:
      'Wylicz odległości 10 m / 15 m, różnicę między zatrzymaniem a postojem (powyżej 1 min), warunki postoju na chodniku (min. 1,5 m dla pieszych, DMC ≤ 2,5 t) oraz znaki B-35/B-36.',
    sampleOutline: `### 1. Temat i cel ogólny
- **Temat:** Zatrzymanie i postój pojazdu — miejsca ustawowo zabronione oraz prawidłowe unieruchomienie pojazdu.
- **Cel ogólny:** Opanowanie różnicy między zatrzymaniem a postojem oraz zasad bezpiecznego parkowania bez ograniczania widoczności i przejścia pieszym.

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant rozróżnia zatrzymanie (do 1 min lub wynikające z warunków ruchu) od postoju (> 1 min).
- Kursant podaje odległości zakazów (10 m przed przejściem/przejazdem/skrzyżowaniem, 15 m od przystanku/wysepki) oraz warunki postoju na chodniku (DMC ≤ 2,5 t, szerokość dla pieszych ≥ 1,5 m).

**Kategoria postaw (wychowawcze i BRD):**
- Kursant nie parkuje na łukach i tuż przed przejściami dla pieszych, rozumiejąc, że zasłania w ten sposób pieszych innym kierującym.

### 3. Metody nauczania
- **Podająca:** definicje i katalog zakazów z art. 46–50 ustawy PoRD.
- **Eksponująca:** schemat skrzyżowania i przejścia dla pieszych z naniesionymi strefami 10 m i 15 m oraz plansze B-35, B-36, T-25a/b/c.
- **Problemowa:** analiza kiedy za znakiem B-35 wolno zatrzymać się, by wysadzić pasażera.

### 4. Środki dydaktyczne
- Tablica, plansze znaków B-35, B-36, B-37, B-38, D-18, tabliczki T-25 i T-30, ustawa PoRD.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Pytanie otwierające: czy każda chwila bezruchu w korku jest zatrzymaniem z art. 49? Podanie tematu i celów.
- **Część główna (11 min):**
  - *Min 3–5:* Zatrzymanie wynikające z przepisów vs dobrowolne (≤ 1 min) a postój (> 1 min) — odniesienie do znaków B-35 (zakaz postoju) i B-36 (zakaz zatrzymywania się).
  - *Min 6–10:* Zakazy ustawowe: 10 m (skrzyżowania, przejścia, przejazdy kolejowe i rowerowe — nie dotyczy za przejściem na drodze dwukierunkowej przy szczególnych warunkach), 15 m (przystanki, wysepki).
  - *Min 11–13:* Parkowanie na chodniku (warunek 1,5 m i 2,5 t DMC, tabliczki T-30) oraz zabezpieczenie auta przed stoczeniem (bieg/P, ręczny, skręt kół przy krawężniku).
- **Podsumowanie (2 min):** Powtórzenie „liczby 10 i 15” oraz krótkie pytanie kontrolne o B-35 vs B-36.`
  }
];

export const DIDACTICS_GLOSSARY: GlossaryTerm[] = [
  {
    id: 'g01',
    order: 1,
    term: 'Transfer pozytywny',
    category: 'Dydaktyka',
    definition:
      'Zjawisko ułatwiania i przyspieszania nauki nowej umiejętności dzięki wcześniej zdobytej wiedzy lub utrwalonym nawykom o podobnej strukturze.',
    example:
      'Kursant znający budowę i obsługę skrzyni biegów z samochodu osobowego szybciej opanowuje płynne ruszanie i zmianę przełożeń w pojeździe dostawczym lub na kursie kat. C.',
    examTip: 'Komisja często pyta o przeciwieństwo transferu pozytywnego, czyli transfer negatywny (interferencję).'
  },
  {
    id: 'g02',
    order: 2,
    term: 'Transfer negatywny',
    category: 'Dydaktyka',
    definition:
      'Zjawisko utrudniania nauki lub popełniania błędów przy wykonyaniu nowej czynności na skutek przenoszenia starych, niepasujących nawyków.',
    example:
      'Kierowca przesiadający się z samochodu ze skrzynią manualną do pojazdu z automatem odruchowo próbuje wcisnąć lewą nogą nieistniejący pedał sprzęgła, naciskając gwałtownie na hamulec.',
    examTip: 'Podczas szkolenia warto uprzedzić kursanta o różnicach technicznych, aby zminimalizować błędny odruch.'
  },
  {
    id: 'g03',
    order: 3,
    term: 'Interferencja',
    category: 'Psychologia',
    definition:
      'Wzajemne zakłócanie się śladów pamięciowych lub nawyków (proaktywna: stare nawyki utrudniają nowe; retroaktywna: nowe treści zacierają starsze).',
    example:
      'Uczenie na jednej lekcji dwóch bardzo podobnych manewrów w odwrotnych kierunkach (np. parkowania prostopadłego przodem i tyłem bez utrwalenia pierwszego) powoduje mylenie punktów odniesienia.',
    examTip: 'Aby ograniczyć interferencję, należy wprowadzać trudne manewry etapami z przerwą na utrwalenie.'
  },
  {
    id: 'g04',
    order: 4,
    term: 'Percepcja (spostrzeganie)',
    category: 'Psychologia',
    definition:
      'Złożony proces poznawczy polegający na odbieraniu bodźców ze środowiska przez narządy zmysłów oraz ich interpretowaniu w mózgu na podstawie doświadczenia.',
    example:
      'Kierowca nie tylko „widzi” kształt i kolor znaku ostrzegawczego A-7, ale natychmiast rozpoznaje jego znaczenie i ocenia odległość oraz prędkość pojazdów na drodze z pierwszeństwem.',
    examTip: 'W ruchu drogowym ok. 90% informacji odbieranych jest drogą wzrokową.'
  },
  {
    id: 'g05',
    order: 5,
    term: 'Uwaga podzielna',
    category: 'Psychologia',
    definition:
      'Zdolność jednoczesnego kontrolowania i wykonywania dwóch lub więcej czynności albo równoległego obserwowania kilku źródeł informacji.',
    example:
      'Podczas dojazdu do skrzyżowania kursant jednocześnie redukuje bieg, kontroluje obraz w lusterku wstecznym, obserwuje przejście dla pieszych oraz sygnalizator świetlny.',
    examTip: 'Na początku kursu podzielność uwagi jest niska, bo obsługa auta nie jest jeszcze zautomatyzowana.'
  },
  {
    id: 'g06',
    order: 6,
    term: 'Uwaga selektywna i przerzutna',
    category: 'Psychologia',
    definition:
      'Selektywność pozwala wyłowić bodźce istotne i ignorować rozpraszacze; przerzutność umożliwia szybkie i świadome przenoszenie uwagi z jednego obiektu na inny.',
    example:
      'W gęstym mieście kierowca ignoruje kolorowe bilbordy reklamowe (selektywność) i szybko przenosi wzrok z pieszego przy krawężniku na lusterko boczne (przerzutność).',
    examTip: 'Rozmowa przez telefon (nawet przez zestaw głośnomówiący) drastycznie obniża przerzutność uwagi.'
  },
  {
    id: 'g07',
    order: 7,
    term: 'Metoda pogadanki',
    category: 'Metodyka',
    definition:
      'Słowna metoda nauczania oparta na kierowanej przez wykładowcę rozmowie z kursantami za pomocą przemyślanych pytań prowadzących do wspólnych wniosków.',
    example:
      'Zamiast podać gotową definicję, instruktor pyta grupę: „Co się stanie, gdy wjedziemy w zakręt zbyt szybko na śliskiej nawierzchni?” i wspólnie z kursantami formułuje zasady doboru prędkości.',
    examTip: 'Pogadanka aktywizuje słuchaczy znacznie skuteczniej niż czysty wykład podający.'
  },
  {
    id: 'g08',
    order: 8,
    term: 'Metoda problemowa',
    category: 'Metodyka',
    definition:
      'Metoda polegająca na postawieniu przed kursantami sytuacji wymagającej samodzielnego analizowania, poszukiwania rozwiązania i weryfikacji hipotez.',
    example:
      'Wykładowca pokazuje zdjęcie nietypowego skrzyżowania bez sygnalizacji z tramwajem i rowerzystą, prosząc kursantów o ustalenie kolejności przejazdu i uzasadnienie jej przepisami.',
    examTip: 'W konspekcie pokazu warto zaplanować choć 1 krótki problem sytuacyjny angażujący grupę.'
  },
  {
    id: 'g09',
    order: 9,
    term: 'Nauczanie programowane',
    category: 'Metodyka',
    definition:
      'Sposób kształcenia polegający na podziale materiału na małe, logiczne dawki (kroki) z natychmiastowym sprawdzeniem zrozumienia i informacją zwrotną przed przejściem dalej.',
    example:
      'Rozwiązywanie testów interaktywnych z natychmiastowym wyjaśnieniem podstawy prawnej po każdym pytaniu lub nauka manewru na placu podzielona na pojedyncze etapy kontrolne.',
    examTip: 'Umożliwia indywidualne tempo pracy i szybkie korygowanie błędnych skojarzeń.'
  },
  {
    id: 'g10',
    order: 10,
    term: 'Zasada poglądowości',
    category: 'Dydaktyka',
    definition:
      'Fundamentalna zasada dydaktyczna nakazująca opieranie procesu nauczania na bezpośrednim poznawaniu rzeczywistości za pomocą zmysłów lub jej modeli i obrazów.',
    example:
      'Wykorzystanie na wykładzie magnetycznej tablicy ze schematem skrzyżowania, modeli pojazdów, prawdziwych tarcz znaków drogowych lub krótkich nagrań wideo z realnych sytuacji drogowych.',
    examTip: 'Podczas pokazu na egzaminie instruktorskim komisja bardzo wysoko ocenia umiejętne użycie pomocy wizualnych.'
  },
  {
    id: 'g11',
    order: 11,
    term: 'Stres: eustres i dystres',
    category: 'Psychologia',
    definition:
      'Eustres to stres pozytywny, mobilizujący organizm do sprawnego działania i koncentracji; dystres to stres nadmierny lub długotrwały, który paraliżuje i dezorganizuje zachowanie.',
    example:
      'Lekkie pobudzenie przed egzaminem państwowym wyostrza czujność kursanta (eustres), natomiast krzyk instruktora po zgaśnięciu silnika powoduje blokadę i serię kolejnych błędów (dystres).',
    examTip: 'Zadaniem instruktora jest utrzymywanie kursanta w strefie eustresu przez spokojną, wspierającą postawę.'
  },
  {
    id: 'g12',
    order: 12,
    term: 'Czas reakcji psychicznej i motorycznej',
    category: 'Psychologia',
    definition:
      'Czas reakcji psychicznej to okres od pojawienia się bodźca do podjęcia decyzji; czas reakcji motorycznej to moment od decyzji do wykonania ruchu (np. przeniesienia nogi na hamulec).',
    example:
      'Łączny czas reakcji trzeźwego i wypoczętego kierowcy wynosi średnio ok. 0,8–1,0 sekundy — przy prędkości 90 km/h auto przejeżdża w tym czasie ok. 25 metrów, zanim w ogóle zacznie hamować.',
    examTip: 'Pamiętaj o rozróżnieniu obu faz: psychicznej (percepcja + decyzja) i motorycznej (ruch mięśni).'
  },
  {
    id: 'g13',
    order: 13,
    term: 'Habituacja',
    category: 'Psychologia',
    definition:
      'Stopniowe słabnięcie lub zanikanie reakcji na bodziec, który powtarza się wielokrotnie i nie niesie ze sobą bezpośredniego zagrożenia ani zmiany.',
    example:
      'Kierowca codziennie przejeżdżający przez ten sam przejazd kolejowy o małym natężeniu ruchu lub mijający stały znak „Ograniczenie prędkości” przestaje zwracać na niego należytą uwagę i jedzie „na pamięć”.',
    examTip: 'Habituacja oraz rutyna są częstą przyczyną wypadków w dobrze znanej okolicy kierowcy.'
  },
  {
    id: 'g14',
    order: 14,
    term: 'Konformizm na drodze',
    category: 'Psychologia',
    definition:
      'Uleganie presji otoczenia i dostosowywanie własnego zachowania do postępowania większości innych uczestników ruchu, nawet wbrew przepisom i rozsądkowi.',
    example:
      'Młody kierowca przekracza dopuszczalną prędkość w terenie zabudowanym tylko dlatego, że wszystkie auta wokół jadą szybciej lub kierujący z tyłu pogania go światłami.',
    examTip: 'Ucz kursantów asertywności — to kierowca odpowiada prawnie za własne manewry, nie tłum.'
  },
  {
    id: 'g15',
    order: 15,
    term: 'Metody podające',
    category: 'Metodyka',
    definition:
      'Grupa metod nauczania (wykład, opowiadanie, opis, objaśnienie), w których wykładowca przekazuje gotową, usystematyzowaną wiedzę w formie ustnej.',
    example:
      'Zwięzłe objaśnienie przez wykładowcę definicji ustawowych z Prawa o ruchu drogowym, np. różnicy między zatrzymaniem a postojem pojazdu przed przejściem do zadań.',
    examTip: 'W czystej formie powinny zajmować ograniczoną część zajęć; warto przeplatać je pytaniami do grupy.'
  },
  {
    id: 'g16',
    order: 16,
    term: 'Metody eksponujące',
    category: 'Metodyka',
    definition:
      'Metody dydaktyczne angażujące sferę emocjonalną i wzrokową odbiorcy poprzez prezentację zjawisk, pokaz praktyczny, film instruktażowy, planszę lub symulację.',
    example:
      'Pokaz działania poduszki powietrznej i pasów bezpieczeństwa na filmie z testu zderzeniowego albo prezentacja prawidłowej pozycji za kierownicą wykonana bezpośrednio przez instruktora.',
    examTip: 'Łącz pokaz ze słownym komentarzem wskazującym kluczowe detale obserwacji.'
  },
  {
    id: 'g17',
    order: 17,
    term: 'Metoda ćwiczeń praktycznych (instruktaż)',
    category: 'Metodyka',
    definition:
      'Metoda polegająca na wielokrotnym wykonywaniu przez uczącego się określonych czynności po wcześniejszym instruktażu i pokazie, prowadząca do wyrobienia nawyku.',
    example:
      'Instruktor demonstruje parkowanie równoległe, omawia punkty obserwacji, a następnie kursant kilkukrotnie samodzielnie wykonuje manewr z bieżącą korektą błędów.',
    examTip: 'Skuteczny cykl to: omówienie → pokaz instruktora → próba kursanta → informacja zwrotna.'
  },
  {
    id: 'g18',
    order: 18,
    term: 'Zasada stopniowania trudności',
    category: 'Dydaktyka',
    definition:
      'Zasada dydaktyczna wymagająca przechodzenia od treści łatwych do trudnych, od prostych czynności do złożonych oraz od rzeczy znanych do nieznanych.',
    example:
      'Kursant zaczyna naukę od obsługi pedałów i ruszania na placu manewrowym, następnie uczy się na ulicach o małym natężeniu ruchu, a dopiero później wjeżdża na wielopasmowe ronda w centrum.',
    examTip: 'Złamanie tej zasady (np. jazda w godzinach szczytu na 1. godzinie) rodzi silny dystres.'
  },
  {
    id: 'g19',
    order: 19,
    term: 'Zasada indywidualizacji nauczania',
    category: 'Dydaktyka',
    definition:
      'Dostosowanie tempa pracy, form komunikacji, liczby powtórzeń i metod dydaktycznych do indywidualnych predyspozycji, wieku, temperamentu i doświadczeń kursanta.',
    example:
      'Dla kursanta o typie wzrokowca instruktor częściej rysuje schematy skrzyżowań na kartce przed manewrem, a osobie nieśmiałej udziela dłuższych, spokojniejszych wskazówek wyprzedzających.',
    examTip: 'Indywidualizacja nie oznacza obniżenia wymagań egzaminacyjnych, lecz dobranie właściwej drogi do celu.'
  },
  {
    id: 'g20',
    order: 20,
    term: 'Zasada świadomego i aktywnego udziału',
    category: 'Dydaktyka',
    definition:
      'Zasada mówiąca, że uczenie się jest najtrwalsze wtedy, gdy kursant rozumie sens wykonywanych czynności i aktywnie uczestniczy w analizie sytuacji, zamiast działać mechanicznie.',
    example:
      'Instruktor nie mówi tylko „skręć teraz na tym słupku”, lecz tłumaczy dlaczego koła powinny znaleźć się w tym miejscu, aby tył pojazdu ominął krawężnik.',
    examTip: 'Uczenie „na tyczki” bez zrozumienia geometrii toru jazdy jest błędem metodycznym.'
  },
  {
    id: 'g21',
    order: 21,
    term: 'Motywacja wewnętrzna i zewnętrzna',
    category: 'Psychologia',
    definition:
      'Motywacja wewnętrzna wynika z własnej potrzeby rozwoju i chęci bezpiecznej jazdy; zewnętrzna opiera się na bodźcach z zewnątrz (nagrody, presja rodziny, zdanie egzaminu).',
    example:
      'Kursant z motywacją wewnętrzną dopytuje o trudne sytuacje drogowe, by czuć się pewnie jako kierowca; osoba z wyłącznie zewnętrzną uczy się jedynie pod kątem „zaliczenia placu”.',
    examTip: 'Chwalenie realnych postępów (wzmocnienie pozytywne) skutecznie wzmacnia motywację wewnętrzną.'
  },
  {
    id: 'g22',
    order: 22,
    term: 'Lokus kontroli (poczucie umiejscowienia kontroli)',
    category: 'Psychologia',
    definition:
      'Przekonanie człowieka o tym, czy o skutkach zdarzeń decyduje on sam (wewnętrzny lokus kontroli), czy czynniki zewnętrzne, takie jak pech, inni ludzie lub los.',
    example:
      'Kierowca z wewnętrznym lokusem kontroli po błędzie zastanawia się, co mógł przewidzieć lepiej; osoba z zewnętrznym obwinia wyłącznie „głupich innych kierowców” i śliską drogę.',
    examTip: 'W pracy dydaktycznej należy kształtować odpowiedzialność i wewnętrzne umiejscowienie kontroli.'
  },
  {
    id: 'g23',
    order: 23,
    term: 'Frustracja i agresja na drodze',
    category: 'Psychologia',
    definition:
      'Frustracja to stan napięcia wywołany przeszkodą w realizacji celu; u części kierowców prowadzi do agresji (wymuszanie pierwszeństwa, używanie klaksonu, jazda na zderzaku).',
    example:
      'Stanie w długim korku i spóźnienie na spotkanie wywołuje frustrację, przez co kierowca zaczyna gwałtownie zmieniać pasy bez kierunkowskazów i blokować wjazd innym pojazdom.',
    examTip: 'Przeciwdziałaniem agresji jest kultura jazdy, empatia i planowanie zapasu czasu na trasę.'
  },
  {
    id: 'g24',
    order: 24,
    term: 'Widzenie tunelowe',
    category: 'Psychologia',
    definition:
      'Zjawisko fizjologicznego i psychologicznego zawężenia pola widzenia ostrego wyłącznie do centralnego punktu przed pojazdem wraz ze wzrostem prędkości, zmęczenia lub pod wpływem alkoholu.',
    example:
      'Przy 130 km/h pole widzenia kierowcy zawęża się drastycznie w porównaniu z jazdą miejską 50 km/h — łatwo wtedy przeoczyć pojazd na pasie obok lub pieszego na poboczu.',
    examTip: 'Wraz ze wzrostem prędkości wzrok należy kierować znacznie dalej przed pojazd i częściej skanować boki.'
  },
  {
    id: 'g25',
    order: 25,
    term: 'Pamięć operacyjna i proceduralna',
    category: 'Psychologia',
    definition:
      'Pamięć operacyjna przechowuje informacje chwilowo potrzebne do bieżącego zadania; pamięć proceduralna (długotrwała) odpowiada za zautomatyzowane nawyki ruchowe.',
    example:
      'Na początku kursu zmiana biegu angażuje pamięć operacyjną i odrywa uwagę od znaków; u doświadczonego kierowcy przechodzi do pamięci proceduralnej, uwalniając zasoby uwagi.',
    examTip: 'Automatyzacja podstawowych czynności uwalnia pamięć operacyjną do obserwacji drogi.'
  }
];

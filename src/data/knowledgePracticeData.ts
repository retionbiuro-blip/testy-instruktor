export interface PresentationTopic {
  id: string;
  category: string;
  title: string;
  hint: string;
}

export type GlossaryDomain = 'Dydaktyka' | 'Metodyka' | 'Psychologia';

export interface GlossaryTerm {
  id: string;
  term: string;
  domain: GlossaryDomain;
  definition: string;
  drivingExample: string;
  examTip: string;
}

export const EXAM_PRESENTATION_TOPICS: PresentationTopic[] = [
  {
    id: 't1',
    category: 'Przepisy ruchu drogowego',
    title: 'Zasady pierwszeństwa na skrzyżowaniach równorzędnych oraz ze znakami określającymi pierwszeństwo',
    hint: 'Omów regułę prawej ręki, znaki A-7, B-20, D-1, T-6a/T-6c oraz sytuacje z pojazdem szynowym.'
  },
  {
    id: 't2',
    category: 'Przepisy ruchu drogowego',
    title: 'Ruch okrężny (ronda) — wjazd, zmiana pasa ruchu, sygnalizowanie i zjazd ze skrzyżowania',
    hint: 'Rozróżnij rondo zwykłe i turbinowe, zasady używania kierunkowskazów przy wjeździe i zjeździe oraz pierwszeństwo tramwaju.'
  },
  {
    id: 't3',
    category: 'Przepisy ruchu drogowego',
    title: 'Wyprzedzanie, omijanie i wymijanie — warunki bezpiecznego wykonania manewru oraz zakazy ustawowe',
    hint: 'Zwróć uwagę na widoczność, zakaz wyprzedzania na przejściach dla pieszych, przed wierzchołkiem wzniesienia i na skrzyżowaniach.'
  },
  {
    id: 't4',
    category: 'Przepisy ruchu drogowego',
    title: 'Używanie świateł zewnętrznych pojazdu w dzień, w nocy oraz w warunkach zmniejszonej przejrzystości powietrza',
    hint: 'Wskaż kiedy używamy świateł do jazdy dziennej, mijania, drogowych i przeciwmgłowych przednich oraz tylnych.'
  },
  {
    id: 't5',
    category: 'Przepisy ruchu drogowego',
    title: 'Przejazdy kolejowe i tramwajowe — hierarchia sygnałów, zakazy i postępowanie w sytuacji awaryjnej',
    hint: 'Podkreśl zasadę szczególnej ostrożności, zakaz wjazdu gdy brak miejsca do zjazdu oraz zachowanie przy zamykających się rogatkach.'
  },
  {
    id: 't6',
    category: 'Technika kierowania i BRD',
    title: 'Prędkość dopuszczalna i bezpieczna, droga zatrzymania pojazdu oraz systemy ABS i ESP',
    hint: 'Rozdziel pojęcie czasu reakcji i drogi hamowania; wyjaśnij jak prawidłowo hamować awaryjnie z systemem ABS.'
  },
  {
    id: 't7',
    category: 'Przepisy ruchu drogowego',
    title: 'Ruch pieszych, rowerzystów oraz kierujących hulajnogami elektrycznymi — szczególna ostrożność kierującego',
    hint: 'Omów pierwszeństwo pieszego wchodzącego na przejście, przejazdy dla rowerzystów oraz zakaz wyprzedzania na przejściu.'
  },
  {
    id: 't8',
    category: 'Technika kierowania i BRD',
    title: 'Jazda na autostradach i drogach ekspresowych — włączanie się do ruchu, jazda na suwak i korytarz życia',
    hint: 'Wyjaśnij bezpieczne korzystanie z pasa rozbiegowego, zachowanie odstępu oraz prawidłowe tworzenie korytarza życia.'
  },
  {
    id: 't9',
    category: 'Pierwsza pomoc',
    title: 'Postępowanie na miejscu wypadku drogowego oraz zasady resuscytacji krążeniowo-oddechowej (RKO)',
    hint: 'Zacznij od bezpieczeństwa własnego i zabezpieczenia miejsca zdarzenia, wezwania pomocy (112), oceny oddechu i rytmu 30:2.'
  },
  {
    id: 't10',
    category: 'Psychologia i BRD',
    title: 'Wpływ alkoholu, środków odurzających oraz zmęczenia na percepcję i czas reakcji kierowcy',
    hint: 'Wskaż mechanizm widzenia tunelowego, wydłużenie czasu reakcji psychicznej i motorycznej oraz błędną ocenę prędkości.'
  },
  {
    id: 't11',
    category: 'Metodyka szkolenia',
    title: 'Nauczanie podstawowych zadań na placu manewrowym: jazda pasem ruchu do przodu i do tyłu oraz ruszanie na wzniesieniu',
    hint: 'Zastosuj zasady stopniowania trudności, pokaz instruktorski, właściwe ustawienie fotela i lusterek oraz korektę błędów.'
  },
  {
    id: 't12',
    category: 'Dydaktyka i psychologia',
    title: 'Praca z kursantem przejawiającym silny lęk przed jazdą lub nadmierną pewność siebie',
    hint: 'Odwołaj się do budowania motywacji, dopasowania stopnia trudności trasy, eustresu vs dystresu i spokojnej komunikacji zwrotnej.'
  },
  {
    id: 't13',
    category: 'Technika kierowania i BRD',
    title: 'Zasady eko-jazdy (ecodriving) — płynne ruszanie, zmiana biegów, hamowanie silnikiem i przewidywanie sytuacji',
    hint: 'Pokaż związek między jazdą ekonomiczną a bezpieczeństwem ruchu drogowego oraz mniejszym zużyciem podzespołów.'
  },
  {
    id: 't14',
    category: 'Przepisy ruchu drogowego',
    title: 'Strefa zamieszkania, strefa ruchu i droga wewnętrzna — różnice w obowiązywaniu przepisów i pierwszeństwie',
    hint: 'Wskaż limity prędkości (20 km/h), prawa pieszego na całej szerokości drogi oraz włączanie się do ruchu przy wyjeździe ze strefy.'
  },
  {
    id: 't15',
    category: 'Obsługa i eksploatacja',
    title: 'Przygotowanie pojazdu do jazdy, czynności kontrolno-obsługowe oraz przewożenie dzieci i ładunków',
    hint: 'Omów światła, płyny eksploatacyjne, ciśnienie i głębokość bieżnika opon oraz zasady stosowania fotelików bezpieczeństwa.'
  },
  {
    id: 't16',
    category: 'Przepisy ruchu drogowego',
    title: 'Zatrzymanie i postój pojazdu — miejsca ustawowo zabronione oraz prawidłowe unieruchomienie pojazdu',
    hint: 'Wylicz odległości 10 m / 15 m, różnicę między zatrzymaniem a postojem (powyżej 1 min) oraz postój na chodniku.'
  }
];

export const DIDACTICS_GLOSSARY: GlossaryTerm[] = [
  {
    id: 'g01',
    term: 'Transfer pozytywny',
    domain: 'Dydaktyka',
    definition:
      'Zjawisko ułatwiania i przyspieszania nauki nowej umiejętności dzięki wcześniej zdobytej wiedzy lub utrwalonym nawykom o podobnej strukturze.',
    drivingExample:
      'Kursant znający budowę i obsługę skrzyni biegów z samochodu osobowego szybciej opanowuje płynne ruszanie i zmianę przełożeń w pojeździe dostawczym lub na kursie kat. C.',
    examTip: 'Komisja często pyta o przeciwieństwo transferu pozytywnego, czyli transfer negatywny (interferencję).'
  },
  {
    id: 'g02',
    term: 'Transfer negatywny',
    domain: 'Dydaktyka',
    definition:
      'Zjawisko utrudniania nauki lub popełniania błędów przy wykonywaniu nowej czynności na skutek przenoszenia starych, niepasujących nawyków.',
    drivingExample:
      'Kierowca przesiadający się z samochodu ze skrzynią manualną do pojazdu z automatem odruchowo próbuje wcisnąć lewą nogą nieistniejący pedał sprzęgła, naciskając gwałtownie na hamulec.',
    examTip: 'Podczas szkolenia warto uprzedzić kursanta o różnicach technicznych, aby zminimalizować błędny odruch.'
  },
  {
    id: 'g03',
    term: 'Interferencja',
    domain: 'Psychologia',
    definition:
      'Wzajemne zakłócanie się śladów pamięciowych lub nawyków (proaktywna: stare nawyki utrudniają nowe; retroaktywna: nowe treści zacierają starsze).',
    drivingExample:
      'Uczenie na jednej lekcji dwóch bardzo podobnych manewrów w odwrotnych kierunkach (np. parkowania prostopadłego przodem i tyłem bez utrwalenia pierwszego) powoduje mylenie punktów odniesienia.',
    examTip: 'Aby ograniczyć interferencję, należy wprowadzać trudne manewry etapami z przerwą na utrwalenie.'
  },
  {
    id: 'g04',
    term: 'Percepcja (spostrzeganie)',
    domain: 'Psychologia',
    definition:
      'Złożony proces poznawczy polegający na odbieraniu bodźców ze środowiska przez narządy zmysłów oraz ich interpretowaniu w mózgu na podstawie doświadczenia.',
    drivingExample:
      'Kierowca nie tylko „widzi” kształt i kolor znaku ostrzegawczego A-7, ale natychmiast rozpoznaje jego znaczenie i ocenia odległość oraz prędkość pojazdów na drodze z pierwszeństwem.',
    examTip: 'W ruchu drogowym ok. 90% informacji odbieranych jest drogą wzrokową.'
  },
  {
    id: 'g05',
    term: 'Uwaga podzielna',
    domain: 'Psychologia',
    definition:
      'Zdolność jednoczesnego kontrolowania i wykonywania dwóch lub więcej czynności albo równoległego obserwowania kilku źródeł informacji.',
    drivingExample:
      'Podczas dojazdu do skrzyżowania kursant jednocześnie redukuje bieg, kontroluje obraz w lusterku wstecznym, obserwuje przejście dla pieszych oraz sygnalizator świetlny.',
    examTip: 'Na początku kursu podzielność uwagi jest niska, bo obsługa auta nie jest jeszcze zautomatyzowana.'
  },
  {
    id: 'g06',
    term: 'Uwaga selektywna i przerzutna',
    domain: 'Psychologia',
    definition:
      'Selektywność pozwala wyłowić bodźce istotne i ignorować rozpraszacze; przerzutność umożliwia szybkie i świadome przenoszenie uwagi z jednego obiektu na inny.',
    drivingExample:
      'W gęstym mieście kierowca ignoruje kolorowe bilbordy reklamowe (selektywność) i szybko przenosi wzrok z pieszego przy krawężniku na lusterko boczne (przerzutność).',
    examTip: 'Rozmowa przez telefon (nawet przez zestaw głośnomówiący) drastycznie obniża przerzutność uwagi.'
  },
  {
    id: 'g07',
    term: 'Metoda pogadanki',
    domain: 'Metodyka',
    definition:
      'Słowna metoda nauczania oparta na kierowanej przez wykładowcę rozmowie z kursantami za pomocą przemyślanych pytań prowadzących do wspólnych wniosków.',
    drivingExample:
      'Zamiast podać gotową definicję, instruktor pyta grupę: „Co się stanie, gdy wjedziemy w zakręt zbyt szybko na śliskiej nawierzchni?” i wspólnie z kursantami formułuje zasady doboru prędkości.',
    examTip: 'Pogadanka aktywizuje słuchaczy znacznie skuteczniej niż czysty wykład podający.'
  },
  {
    id: 'g08',
    term: 'Metoda problemowa',
    domain: 'Metodyka',
    definition:
      'Metoda polegająca na postawieniu przed kursantami sytuacji wymagającej samodzielnego analizowania, poszukiwania rozwiązania i weryfikacji hipotez.',
    drivingExample:
      'Wykładowca pokazuje zdjęcie nietypowego skrzyżowania bez sygnalizacji z tramwajem i rowerzystą, prosząc kursantów o ustalenie kolejności przejazdu i uzasadnienie jej przepisami.',
    examTip: 'W konspekcie pokazu warto zaplanować choć 1 krótki problem sytuacyjny angażujący grupę.'
  },
  {
    id: 'g09',
    term: 'Nauczanie programowane',
    domain: 'Metodyka',
    definition:
      'Sposób kształcenia polegający na podziale materiału na małe, logiczne dawki (kroki) z natychmiastowym sprawdzeniem zrozumienia i informacją zwrotną przed przejściem dalej.',
    drivingExample:
      'Rozwiązywanie testów interaktywnych z natychmiastowym wyjaśnieniem podstawy prawnej po każdym pytaniu lub nauka manewru na placu podzielona na pojedyncze etapy kontrolne.',
    examTip: 'Umożliwia indywidualne tempo pracy i szybkie korygowanie błędnych skojarzeń.'
  },
  {
    id: 'g10',
    term: 'Zasada poglądowości',
    domain: 'Dydaktyka',
    definition:
      'Fundamentalna zasada dydaktyczna nakazująca opieranie procesu nauczania na bezpośrednim poznawaniu rzeczywistości za pomocą zmysłów lub jej modeli i obrazów.',
    drivingExample:
      'Wykorzystanie na wykładzie magnetycznej tablicy ze schematem skrzyżowania, modeli pojazdów, prawdziwych tarcz znaków drogowych lub krótkich nagrań wideo z realnych sytuacji drogowych.',
    examTip: 'Podczas pokazu na egzaminie instruktorskim komisja bardzo wysoko ocenia umiejętne użycie pomocy wizualnych.'
  },
  {
    id: 'g11',
    term: 'Stres: eustres i dystres',
    domain: 'Psychologia',
    definition:
      'Eustres to stres pozytywny, mobilizujący organizm do sprawnego działania i koncentracji; dystres to stres nadmierny lub długotrwały, który paraliżuje i dezorganizuje zachowanie.',
    drivingExample:
      'Lekkie pobudzenie przed egzaminem państwowym wyostrza czujność kursanta (eustres), natomiast krzyk instruktora po zgaśnięciu silnika powoduje blokadę i serię kolejnych błędów (dystres).',
    examTip: 'Zadaniem instruktora jest utrzymywanie kursanta w strefie eustresu przez spokojną, wspierającą postawę.'
  },
  {
    id: 'g12',
    term: 'Czas reakcji psychicznej i motorycznej',
    domain: 'Psychologia',
    definition:
      'Czas reakcji psychicznej to okres od pojawienia się bodźca do podjęcia decyzji; czas reakcji motorycznej to moment od decyzji do wykonania ruchu (np. przeniesienia nogi na hamulec).',
    drivingExample:
      'Łączny czas reakcji trzeźwego i wypoczętego kierowcy wynosi średnio ok. 0,8–1,0 sekundy — przy prędkości 90 km/h auto przejeżdża w tym czasie ok. 25 metrów, zanim w ogóle zacznie hamować.',
    examTip: 'Pamiętaj o rozróżnieniu obu faz: psychicznej (percepcja + decyzja) i motorycznej (ruch mięśni).'
  },
  {
    id: 'g13',
    term: 'Habituacja',
    domain: 'Psychologia',
    definition:
      'Stopniowe słabnięcie lub zanikanie reakcji na bodziec, który powtarza się wielokrotnie i nie niesie ze sobą bezpośredniego zagrożenia ani zmiany.',
    drivingExample:
      'Kierowca codziennie przejeżdżający przez ten sam przejazd kolejowy o małym natężeniu ruchu lub mijający stały znak „Ograniczenie prędkości” przestaje zwracać na niego należytą uwagę i jedzie „na pamięć”.',
    examTip: 'Habituacja oraz rutyna są częstą przyczyną wypadków w dobrze znanej okolicy kierowcy.'
  },
  {
    id: 'g14',
    term: 'Konformizm na drodze',
    domain: 'Psychologia',
    definition:
      'Uleganie presji otoczenia i dostosowywanie własnego zachowania do postępowania większości innych uczestników ruchu, nawet wbrew przepisom i rozsądkowi.',
    drivingExample:
      'Młody kierowca przekracza dopuszczalną prędkość w terenie zabudowanym tylko dlatego, że wszystkie auta wokół jadą szybciej lub kierujący z tyłu pogania go światłami.',
    examTip: 'Ucz kursantów asertywności — to kierowca odpowiada prawnie za własne manewry, nie tłum.'
  },
  {
    id: 'g15',
    term: 'Metody podające',
    domain: 'Metodyka',
    definition:
      'Grupa metod nauczania (wykład, opowiadanie, opis, objaśnienie), w których wykładowca przekazuje gotową, usystematyzowaną wiedzę w formie ustnej.',
    drivingExample:
      'Zwięzłe objaśnienie przez wykładowcę definicji ustawowych z Prawa o ruchu drogowym, np. różnicy między zatrzymaniem a postojem pojazdu przed przejściem do zadań.',
    examTip: 'W czystej formie powinny zajmować ograniczoną część zajęć; warto przeplatać je pytaniami do grupy.'
  },
  {
    id: 'g16',
    term: 'Metody eksponujące',
    domain: 'Metodyka',
    definition:
      'Metody dydaktyczne angażujące sferę emocjonalną i wzrokową odbiorcy poprzez prezentację zjawisk, pokaz praktyczny, film instruktażowy, planszę lub symulację.',
    drivingExample:
      'Pokaz działania poduszki powietrznej i pasów bezpieczeństwa na filmie z testu zderzeniowego albo prezentacja prawidłowej pozycji za kierownicą wykonana bezpośrednio przez instruktora.',
    examTip: 'Łącz pokaz ze słownym komentarzem wskazującym kluczowe detale obserwacji.'
  },
  {
    id: 'g17',
    term: 'Metoda ćwiczeń praktycznych (instruktaż)',
    domain: 'Metodyka',
    definition:
      'Metoda polegająca na wielokrotnym wykonywaniu przez uczącego się określonych czynności po wcześniejszym instruktażu i pokazie, prowadząca do wyrobienia nawyku.',
    drivingExample:
      'Instruktor demonstruje parkowanie równoległe, omawia punkty obserwacji, a następnie kursant kilkukrotnie samodzielnie wykonuje manewr z bieżącą korektą błędów.',
    examTip: 'Skuteczny cykl to: omówienie → pokaz instruktora → próba kursanta → informacja zwrotna.'
  },
  {
    id: 'g18',
    term: 'Zasada stopniowania trudności',
    domain: 'Dydaktyka',
    definition:
      'Zasada dydaktyczna wymagająca przechodzenia od treści łatwych do trudnych, od prostych czynności do złożonych oraz od rzeczy znanych do nieznanych.',
    drivingExample:
      'Kursant zaczyna naukę od obsługi pedałów i ruszania na placu manewrowym, następnie uczy się na ulicach o małym natężeniu ruchu, a dopiero później wjeżdża na wielopasmowe ronda w centrum.',
    examTip: 'Złamanie tej zasady (np. jazda w godzinach szczytu na 1. godzinie) rodzi silny dystres.'
  },
  {
    id: 'g19',
    term: 'Zasada indywidualizacji nauczania',
    domain: 'Dydaktyka',
    definition:
      'Dostosowanie tempa pracy, form komunikacji, liczby powtórzeń i metod dydaktycznych do indywidualnych predyspozycji, wieku, temperamentu i doświadczeń kursanta.',
    drivingExample:
      'Dla kursanta o typie wzrokowca instruktor częściej rysuje schematy skrzyżowań na kartce przed manewrem, a osobie nieśmiałej udziela dłuższych, spokojniejszych wskazówek wyprzedzających.',
    examTip: 'Indywidualizacja nie oznacza obniżenia wymagań egzaminacyjnych, lecz dobranie właściwej drogi do celu.'
  },
  {
    id: 'g20',
    term: 'Zasada świadomego i aktywnego udziału',
    domain: 'Dydaktyka',
    definition:
      'Zasada mówiąca, że uczenie się jest najtrwalsze wtedy, gdy kursant rozumie sens wykonywanych czynności i aktywnie uczestniczy w analizie sytuacji, zamiast działać mechanicznie.',
    drivingExample:
      'Instruktor nie mówi tylko „skręć teraz na tym słupku”, lecz tłumaczy dlaczego koła powinny znaleźć się w tym miejscu, aby tył pojazdu ominął krawężnik.',
    examTip: 'Uczenie „na tyczki” bez zrozumienia geometrii toru jazdy jest błędem metodycznym.'
  },
  {
    id: 'g21',
    term: 'Motywacja wewnętrzna i zewnętrzna',
    domain: 'Psychologia',
    definition:
      'Motywacja wewnętrzna wynika z własnej potrzeby rozwoju i chęci bezpiecznej jazdy; zewnętrzna opiera się na bodźcach z zewnątrz (nagrody, presja rodziny, zdanie egzaminu).',
    drivingExample:
      'Kursant z motywacją wewnętrzną dopytuje o trudne sytuacje drogowe, by czuć się pewnie jako kierowca; osoba z wyłącznie zewnętrzną uczy się jedynie pod kątem „zaliczenia placu”.',
    examTip: 'Chwalenie realnych postępów (wzmocnienie pozytywne) skutecznie wzmacnia motywację wewnętrzną.'
  },
  {
    id: 'g22',
    term: 'Lokus kontroli (poczucie umiejscowienia kontroli)',
    domain: 'Psychologia',
    definition:
      'Przekonanie człowieka o tym, czy o skutkach zdarzeń decyduje on sam (wewnętrzny lokus kontroli), czy czynniki zewnętrzne, takie jak pech, inni ludzie lub los.',
    drivingExample:
      'Kierowca z wewnętrznym lokusem kontroli po błędzie zastanawia się, co mógł przewidzieć lepiej; osoba z zewnętrznym obwinia wyłącznie „głupich innych kierowców” i śliską drogę.',
    examTip: 'W pracy dydaktycznej należy kształtować odpowiedzialność i wewnętrzne umiejscowienie kontroli.'
  },
  {
    id: 'g23',
    term: 'Frustracja i agresja na drodze',
    domain: 'Psychologia',
    definition:
      'Frustracja to stan napięcia wywołany przeszkodą w realizacji celu; u części kierowców prowadzi do agresji (wymuszanie pierwszeństwa, używanie klaksonu, jazda na zderzaku).',
    drivingExample:
      'Stanie w długim korku i spóźnienie na spotkanie wywołuje frustrację, przez co kierowca zaczyna gwałtownie zmieniać pasy bez kierunkowskazów i blokować wjazd innym pojazdom.',
    examTip: 'Przeciwdziałaniem agresji jest kultura jazdy, empatia i planowanie zapasu czasu na trasę.'
  },
  {
    id: 'g24',
    term: 'Widzenie tunelowe',
    domain: 'Psychologia',
    definition:
      'Zjawisko fizjologicznego i psychologicznego zawężenia pola widzenia ostrego wyłącznie do centralnego punktu przed pojazdem wraz ze wzrostem prędkości, zmęczenia lub pod wpływem alkoholu.',
    drivingExample:
      'Przy 130 km/h pole widzenia kierowcy zawęża się drastycznie w porównaniu z jazdą miejską 50 km/h — łatwo wtedy przeoczyć pojazd na pasie obok lub pieszego na poboczu.',
    examTip: 'Wraz ze wzrostem prędkości wzrok należy kierować znacznie dalej przed pojazd i częściej skanować boki.'
  },
  {
    id: 'g25',
    term: 'Pamięć operacyjna i proceduralna',
    domain: 'Psychologia',
    definition:
      'Pamięć operacyjna przechowuje informacje chwilowo potrzebne do bieżącego zadania; pamięć proceduralna (długotrwała) odpowiada za zautomatyzowane nawyki ruchowe.',
    drivingExample:
      'Na początku kursu zmiana biegu angażuje pamięć operacyjną i odrywa uwagę od znaków; u doświadczonego kierowcy przechodzi do pamięci proceduralnej, uwalniając zasoby uwagi.',
    examTip: 'Automatyzacja podstawowych czynności uwalnia pamięć operacyjną do obserwacji drogi.'
  }
];

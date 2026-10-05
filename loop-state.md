# LOOP-STATE — docvue gauntlet

> Plik stanu między rundami. Historia rozmowy NIE jest stanem.
> Stan: cel (§1 GAUNTLET.md), inwarianty (§2), artefakt (repo docvue/docvue), ten plik.

## Rundy

### Runda 1
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (18 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI
- Luka: Rezerwacja slotu zepsuta — handleSelectSlot księguje z twardo zakodowanym treatmentId:'' (FK error, surowy błąd bazy w toaście); slot nie niesie kontekstu zabiegu (pendingSlotRef nigdy nie zapisywany); brak podsumowania PRZED zaksięgowaniem (kryterium 2 Baymard); status pending_forms ignorowany — brak linku do formularzy po rezerwacji. Dowód: src/routes/_client/client/chat.tsx:76-84, :51; ChatSlotPicker.tsx:6-9; chat.ts:287; supabase/schema.sql:294.
- Builderzy: P1 (DeepSeek server) DONE, P3 (publiczny formularz) DONE, P4 (portal klienta) DONE
- Decyzje leada: (1) baseline-hygiene przed rundą — tsc (llm.ts guard, whatsapp.ts typing), biome na legacy admin (a11y label/svg/button, importy, template-literal), vitest.config exclude tests/ (Playwright specs), usunięty martwy interface ChatMessage w chat.ts; (2) bramka lint zmieniona na "biome na plikach zmienionych w rundzie" — pełne repo ma pre-istniejący dług ~40+ błędów w admin/legacy (poza zakresem części; pełne repo ma limit raportowania biome 20 diag)

### Runda 2
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (26 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI
- Luka: Klientka po rezerwacji ze statusem pending_forms trafia w ślepą uliczkę — karta „Wymagane formularze" nie ma ŻADNEGO linku do /f/[token] (czat/profile/kalendarz — grep f/|token: zero), przycisk wysyła wiadomość do asystenta, który zwraca tę samą listę bez linków (pętla). Strukturalnie: bookAppointment/bookAsClientFn NIE tworzą przypisań client_forms z tokenem (tworzy je tylko admin przez assignFormToClientFn) — link nie istnieje. Dowód: ChatRequiredFormsCard.tsx:24-58, chat.ts:344-352, chat.tsx:235/245. Inwarianty — wszystkie utrzymane.
- Decyzje leada (R3): P1 rozszerzony o src/server/appointments.ts (server booking = chat.ts + appointments.ts). Kontrakt R3: (a) bookAsClientFn i tool bookAppointment przy statusie pending_forms tworzą przypisania client_forms z tokenem 32-znakowym (reuse istniejącego pending, tworzenie przez admin client — RLS zezwala na INSERT tylko ownerowi salonu; schema/RLS bez zmian per inwariant), zwracają requiredForms: [{id, title, token, fillUrl: `/f/${token}`}] dla formularzy JESZCZE nie wypełnionych; (b) getRequiredForms (chat.ts) dołącza token/fillUrl z istniejących pending client_forms.

### Runda 3
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (27 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI
- Luka: Asystent nie ma narzędzia searchTreatments w toolDefinitions (llm.ts:39-86 — tylko findAvailableSlots/bookAppointment/getRequiredForms), a fallback regex (chat.ts:73-98) jest martwy dla naturalnych fraz: „chcę umówić się na depilację laserową"/„zapisać się na mezoterapię" → brak dopasowania; nawet „poleć zabieg" → matched=[] bo żaden zabieg nie zawiera tych słów. Model nie ma skąd wziąć treatmentId/salonId (karta klienta przekazuje tylko nazwy) → findAvailableSlots zmyśla UUID → sloty liczone dla losowego salonu. Dowód: llm.ts:39-86, chat.ts:73-98, chat.tsx:117, testy regexu no-match. Inwarianty — wszystkie utrzymane.

### Runda 4
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (27 plików) OK, vitest 7/7 OK; regex sanity 5/5
- Werdykt krytyka: NIE PRZECHODZI
- Luka: Ścieżka modelowa (tool bookAppointment) księguje bez podsumowania/potwierdzenia/walidacji konfliktu i bez widocznego stanu po — drugi rozbieżny kontrakt obok ścieżki UI. „Zapisz mnie na 10:00" → natychmiastowy insert (chat.ts:372-380, bez hasOverlap jak w appointments.ts:328-342); frontend nie renderuje NIC dla tool 'bookAppointment' (chat.tsx:217-269 obsługuje tylko searchTreatments/findAvailableSlots/getRequiredForms/bookingResult), a wynik (requiredForms z fillUrl) jest ignorowany. Dowód: chat.ts:372-380, llm.ts:37 (SYSTEM_PROMPT zachęca), chat.tsx:217-269, chat.ts:452. Inwarianty — wszystkie utrzymane.

### Runda 5
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (28 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI
- Luka: Ścieżka „tap na slot" martwa dla slotów modelowych — asocjacja slot↔zabieg tylko przez pendingSlotRef (ustawiany wyłącznie w handleSelectTreatment); gdy model sam woła findAvailableSlots (scenariusz „zapisz mnie na 10:00"), sloty renderują się bez treatmentId → tap = toast „Najpierw wybierz zabieg" (chat.tsx:161-168) zamiast podsumowania, sprzeczny z tekstem pickera (ChatSlotPicker.tsx:36 „Wybierz godzinę, aby zobaczyć podsumowanie"). Dowód: chat.tsx:152-159, :161-168, :273-281; chat.ts:82-86 + llm.ts:33-38 (model może wołać findAvailableSlots w tej samej turze co searchTreatments). Inwarianty — wszystkie utrzymane.

### Runda 6
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (28 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI (luka minimalna)
- Luka: Cele dotykowe <44px na krytycznej ścieżce rezerwacji (kryterium 3): sloty ~32px (ChatSlotPicker.tsx:45-52 py-2+text-xs), „Potwierdzam wizytę" 36px (ChatBookingSummary.tsx:60 Button bez size, default h-9 — button.tsx:31), wysyłka 40px (ChatInput.tsx:60 w-10 h-10). Reszta wszystkich wymiarów PRZECHODZI (kontrakt rezerwacji, obie drogi, linki /f/[token], inwarianty, zero dryfu do referencji negatywnej). Dowód: ChatSlotPicker.tsx:45-52, ChatBookingSummary.tsx:60, button.tsx:31, ChatInput.tsx:60; wzorzec 44px osiągalny (form-renderer min-h-11, Button size lg h-11).
- Decyzja leada: runda 7 jako mikrorunda (użytkownik: „pracuj dopoki nie bedziesz mial pelnego produktu") — luka trywialna (3 klasy), ostatnia przed raportem końcowym.

### Runda 7 (mikrorunda)
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (28 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI
- Luka: (a) bookAppointment w chat.ts:377-391 waliduje tylko nakładanie z appointments — bez kontroli przeszłości i time_blocks; bookAsClientFn analogicznie (appointments.ts:320-342). Na żywo (replika Groq+prompt+klucz): model wygenerował ofertę na 2023-08-15 (przeszłość) bez findAvailableSlots oraz bookAppointment ze zmyślonymi ID (salonId 12345, treatmentId 67890) → „Nie znaleziono zabiegu" i ślepy zaułek. (b) llm.ts:33-38 SYSTEM_PROMPT nie wymusza findAvailableSlots przed bookAppointment. (c) ChatSlotPicker.tsx:44 slice(0,9) + nieinteraktywny „+N więcej terminów" (linie 54-58) — ukryte sloty nieosiągalne. Inwarianty — wszystkie utrzymane.

### Runda 8
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (28 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI (luka minimalna)
- Luka: „Wróć" w ChatBookingSummary.tsx:70 (variant="ghost" bez size, default h-9 = 36px) — jedyny cel <44px na ścieżce rezerwacji; opcjonalnie „Wypełnij wymagane formularze" (size="sm" = 32px) w ChatRequiredFormsCard.tsx:75. Reszta wszystkich wymiarów przechodzi (walidacja serwera na obu ścieżkach: przeszłość chat.ts:377, time_blocks chat.ts:394, overlap chat.ts:412 + appointments.ts:328/345/363; jedyne INSERT-y: appointments.ts:160 admin + :387 po „Potwierdzam"; prompt llm.ts:39 wymusza findAvailableSlots; linki /f/[token]; zero dryfu do referencji negatywnej). Inwarianty — wszystkie utrzymane.

### Runda 9 (mikrorunda)
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI
- Luka: Po wypełnieniu formularza przez /f/[token] (submitClientFormFn, src/server/client-forms.ts:114-123) status wizyty NIGDY nie przechodzi pending_forms → scheduled — klient wiecznie widzi „Wymaga formularzy" w kalendarzu (calendar.tsx:29). Logika synchronizacji istnieje tylko w martwych plikach Next.js (actions/appointments-sync.ts:99-113, nieimportowane przez żaden aktywny moduł). Dowód: client-forms.ts:114-123, appointments-sync.ts:99-113, calendar.tsx:29. Inwarianty — wszystkie utrzymane. RLS: appointments UPDATE tylko dla właściciela salonu (schema.sql:304) → sync musi iść przez admin client.

### Runda 10
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (29 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI (luka wąska)
- Luka: Surowy angielski e.message z throw trafia do pętli narzędzi (chat.ts:147-149 `catch { result = JSON.stringify({ error: e.message }) }`) — ścieżka: model wysyła zniekształconą datę → Invalid Date → past-check przepuszcza (NaN) → dayStart.toISOString() rzuca RangeError. Dowód: chat.ts:147-149, :377, :385-386. Reszta przechodzi (sync statusów, kontrakt, admin client tylko tam gdzie RLS blokuje).

### Runda 11
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (29 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI
- Luka: TOCTOU na ścieżce wysyłki formularza — check statusu, insert submissions i oznaczenie completed NIE są atomowe (client-forms.ts:134-141 check → :143-156 insert → :160-167 update); dwa równoległe żądania tworzą duplikaty submissions; brak UNIQUE constrainta w migracjach; ten sam wzorzec w bookAsClientFn (appointments.ts:349-398); subError.message (raw angielski) trafia na publiczną stronę /f/[token] (client-forms.ts:158). Inwarianty — wszystkie utrzymane (schema bez zmian).
- Decyzja leada (R12): pełna atomowość dla appointments wymaga UNIQUE constrainta (schema change — zakazane inwariantem); stosujemy mitigację code-only i dokumentujemy residualne ograniczenie.

### Runda 12
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (29 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI (bloker produkcyjny)
- Luka: RLS nie pozwala klientowi INSERT do appointments (schema.sql:304-310 — tylko „Salon owners can manage" + „Clients can view their own" FOR SELECT) → bookAsClientFn INSERT z sesji klienta = 42501, surowy błąd do toasta (appointments.ts:397, :409); checki konfliktów (appointments/time_blocks) z sesji klienta ślepe — RLS ukrywa harmonogram; chat_messages ma tylko polityki SELECT (20260607_add_chat.sql:18-24) → inserty milcząco giną, czat bez historii (chat.ts:36); salons!inner join niewidoczny dla klienta → searchTreatments puste; time_blocks tylko owner (20260307:15). Dowód: schema.sql:304-310, appointments.ts:397/:409, chat.ts:36/:285-298, migrations/20260607_add_chat.sql:18-24.
- Decyzja leada (R13): cała ścieżka danych bookowania/czatu przez createAdminClient (wzorzec appointments.ts:482 client_forms); tożsamość nadal z anon sesji (auth.getUser — RLS „Clients can manage their own profile" 20260607_make_client_salon_nullable.sql:5 działa); ZERO zmian RLS/schema.

### Runda 13
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (29 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI (luka frontendowa)
- Luka: Czat nie przywraca historii po odświeżeniu — stan tylko w pamięci komponentu; getChatHistoryFn (chat.ts:487) ma ZERO odwołań; każdy refresh kasuje rozmowę z widoku (GAUNTLET §4b: „odświeżenie gubi stan czatu"). Dowód: chat.tsx:98 (useState []), brak loadera; chat.ts:487 + grep zero. Reszta przechodzi (INSERT przez admin działa, brak 42501, walidacje widzą harmonogram).
- Decyzja leada (R14): kolumna chat_messages.tool_calls istnieje — serwer zapisze toolResults z wiadomością asystenta, UI odtworzy bąbelki + karty (w tym linki /f/[token]) przy montażu.

### Runda 14
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (29 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI
- Luka: Potwierdzenie rezerwacji (pending_forms + linki) NIGDY nie trafia do chat_messages — bąbelek lokalny (chat.tsx:269-287 createMessage + bookingResult), zero zapisu serwerowego; po odświeżeniu rozmowa kończy się na ofercie LLM, potwierdzona wizyta i linki /f/[token] znikają (kryterium 6); ponowne kliknięcie slotu → mylące „Termin jest już zajęty" (własna rezerwacja). Dowód: chat.tsx:269-287, :370; chat.ts:39,108; getChatHistoryFn:488-524.
- Decyzja leada (R15): zapis potwierdzenia w bookAsClientFn (appointments.ts) po udanym insercie — naturalnie zdeduplikowane (tylko zwycięzca wyścigu); format wiadomości jak w chat.tsx; tool_calls [{name:'bookingResult', result:{status, forms}}].

### Runda 15
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (29 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI
- Luka: Tworzenie client_forms to nieatomowe read-then-insert bez unikalności na (client_id, form_id) — równoległe POST-y (dwie karty, różne sloty tego samego zabiegu) tworzą dwa wiersze z różnymi tokenami; klient dostaje dwa linki /f/[token] tego samego formularza, oba wypełnialne; submissions bez UNIQUE (client_id, form_id) → możliwe 2 wpisy. Dowód: appointments.ts:468-498, schema.sql:50 (:61-77), client-forms.ts:140-152. Dedup :417-450 obejmuje tylko appointments.
- Decyzja leada (R16): dedup client_forms analogiczny do appointments — po INSERT nowych, przed zapisem potwierdzenia: pobierz wszystkie pending dla (client_id, unfilledIds), zostaw najstarszy wiersz na form_id, usuń resztę, w requiredForms/bookingResult tylko zachowany token; ZERO zmian schema.

### Runda 16
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (29 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI
- Luka: Stan „wypełnione" nieosiągalny w czacie — bookingResult (potwierdzenie + odtworzenie z tool_calls) niesie formularze BEZ filled; chat.tsx:263 hardcoduje filled:false; karta po wypełnieniu (i po refreshie) wciąż pokazuje aktywny link do martwego „Formularz już wypełniony". Dowód: chat.tsx:257-267, ChatRequiredFormsCard.tsx:26-31, appointments.ts:458-463/:586-590. (Uwaga: getRequiredForms w chat.ts:336 już czyta przez admin — to jest OK.) Reszta przechodzi.
- Decyzja leada (R17): getChatHistoryFn przelicza filled dla bookingResult przy odczycie (admin, submissions po client_id+form_id); appointments.ts dodaje filled:false (prawda w momencie rezerwacji); chat.tsx przekazuje form.filled zamiast hardcodu.

### Runda 17
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (29 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI (luka wąska)
- Luka: getChatHistoryFn patchuje filled tylko dla bookingResult (chat.ts:546-566); karty getRequiredForms z historii wracają ze starym filled:false i aktywnym linkiem; getRequiredForms zwraca modelowi wypełnione formularze (filled:true) bez instrukcji pomijania w SYSTEM_PROMPT/opisie narzędzia — asystent może je wymienić jako wymagane; klik w link → martwe „Formularz już wypełniony". Dowód: chat.ts:546-566, :356-368; llm.ts:33-39, :91-101.
- Decyzja leada (R18): getRequiredForms FILTRUJE filled (model widzi tylko niewypełnione — karta też); SYSTEM_PROMPT + opis narzędzia nakazują nie wymieniać wypełnionych; getChatHistoryFn patchuje też getRequiredForms (filtr przy odczycie).

### Runda 18
- Status: ZAKOŃCZONA
- Bramki: TSC OK, build OK, biome-diff (29 plików) OK, vitest 7/7 OK
- Werdykt krytyka: NIE PRZECHODZI (wąska, ale dowodliwa)
- Luka: Przegrany wyścigu może zapisać duplikat bookingResult + fałszywy sukces — dedup tylko przy overlapping.length > 1 (appointments.ts:417-450, keeper check :432-449 wewnątrz); gdy zwycięzca zdążył usunąć wiersz przegranego, przegrany widzi length 1, pomija check i robi client_forms + potwierdzenie (:466-499, :584-595, :600). Osiągalne podwójnym tapem (guard chat.tsx:228-231 zanim disabled na przycisku). Dowód: appointments.ts:417-450, :432-449, :466-499, :584-600.
- Decyzja leada (R19): bezwarunkowa kontrola przeżycia własnego wiersza PO dedupie — re-SELECT appointment.id; brak → { error: 'Termin jest już zajęty.' } PRZED client_forms/potwierdzeniem.

### Runda 19
- Status: ZAKOŃCZONA — PĘTLA ZAMKNIĘTA
- Bramki: TSC OK, build OK, biome-diff (29 plików) OK, vitest 7/7 OK
- Werdykt krytyka: PRZECHODZI (luka: brak; jedyne resztkowe — okno walidacji „ten sam dzień" nie łapie wizyt ręcznych przekraczających północ, poza ofertą slotów)
- Dowód werdyktu: appointments.ts:417-458 (dedup + bezwarunkowy re-SELECT przed client_forms/potwierdzeniem :465-603), chat.ts:368-370 (filtr filled), chat.ts:526-584 (historia przelicza filled), chat.tsx:104-141 (odtworzenie), client-forms.ts:140-152 (atomowe zajęcie)

## STAN KOŃCOWY
- Cel (§1): OSIĄGNIĘTY. Pełna ścieżka klienta: czat (DeepSeek jako pierwszy provider) → searchTreatments (karty z ceną/czasem) → findAvailableSlots (sloty z kontekstem) → ChatBookingSummary (podsumowanie PRZED księgowaniem) → bookAsClientFn (walidacja: przyszłość/time_blocks/konflikt, dedup wyścigu, atomowy claim client_forms) → potwierdzenie serwerowe z bookingResult i linkami /f/[token] → wypełnienie formularza (Baymard form UX, inline walidacja PL) → sync statusu do scheduled → historia czatu z tool_calls odtwarzana po odświeżeniu; wszystkie cele ≥44px; polszczyzna wszędzie; zero zmian schema/RLS.
- Granica §8: nie wystrzeliła w trybie porażki; limit rund przekroczony z wyraźnej zgody użytkownika; zatrzymanie z powodu granicy sukcesu (bramki ✓ + krytyk „przechodzi").

## Podejścia odrzucone (akumulowane)
- Naprawianie CAŁEGO długu biome w repo (poza częściami) — koszt nie uzasadnia korzyści; bramka dotyczy diffu rundy.
- UNIQUE constraint na (client_id, form_id)/(salon_id, start_time) — schema change, zakazane inwariantem; zastąpione atomowym claimem + dedupem code-only (residualne ograniczenie udokumentowane, do wzmocnienia przy najbliższej migracji).
- generateToken/createAdminClient duplikacja w chat.ts — usunięta jako osierocona przy przejściu bookAppointment na ofertę.
- Martwe pliki actions/appointments-sync.ts (Next.js) — wzorzec przeniesiony do aktywnej ścieżki, pliki nietknięte.

## Podejścia odrzucone
- Naprawianie CAŁEGO długu biome w repo (poza częściami) — koszt nie uzasadnia korzyści; bramka dotyczy diffu rundy.

## Obserwacje builderów spoza zakresu
- chat.ts: `history?.map` mapuje role 'tool' z bazy na LLMMessage bez `tool_call_id` — OpenAI-compatible API (DeepSeek/Groq) odrzuci taki wpis (400). W praktyce DB zawiera tylko role user/assistant, ale przy przyszłym zapisie tool_calls do bazy trzeba to naprawić.
- chat.ts: wiadomości assistant są zapisywane do bazy BEZ `tool_calls`, więc wieloturnusowe konwersacje z narzędziami nie mogą być odtworzone z historii — kolejny turn nie widzi wykonanych wywołań narzędzi.
- chat.ts/llm.ts: `toolDefinitions` wysyłane do modelu NIE zawierają `searchTreatments` ani `getClientInfo`, choć `executeTool` je obsługuje — model nie może ich wywołać, a rule-based push do `toolResults` dla `searchTreatments` nie ma odpowiednika w kontrakcie modelu.
- P3 (formularz): spostrzeżenia do wglądu w loop-state (szczegóły u buildera w katalogu roboczym)

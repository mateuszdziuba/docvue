# Konsultacja holistyczna

Wewnętrzny dokument gabinetu: wywiad w pięciu obszarach, mapa twarzy 2.5D i plan terapii w trzech etapach.

## Wdrożenie bazy

Uruchom migracje po kolei:

```sql
-- Supabase → SQL Editor
-- 1. supabase/migrations/20261023_client_consultations.sql
-- 2. supabase/migrations/20261024_beauty_plan_consultation_link.sql
```

Pierwsza migracja dodaje:

- tabelę `public.client_consultations` (JSONB `data` + `face_analysis`),
- funkcję `public.can_access_salon(uuid)` (właściciel lub aktywny pracownik),
- polityki RLS dla konsultacji,
- prywatny bucket `consultation-photos` i jego polityki.

Druga dodaje `beauty_plans.consultation_id`, czyli powiązanie planu pielęgnacyjnego z konsultacją.

W środowisku produkcyjnym obie sekcje są dopisane na końcu `supabase/prod-setup.sql`.

## Dostęp

- Widzi i edytuje: właściciel salonu oraz aktywni pracownicy (`staff_members.is_active = true`).
- Klient nie ma dostępu — brak trasy w portalu klienta, brak publicznego linku.
- Zakończoną konsultację może usunąć tylko właściciel; szkic może usunąć każdy pracownik.

## Mapa twarzy

- Zdjęcie jest wysyłane do prywatnego bucketu przez podpisany URL.
- MediaPipe Face Landmarker wykrywa 478 punktów **lokalnie w przeglądarce**.
- Z tessellation powstaje siatka 2.5D; zdjęcie jest teksturą, a rysunki/piny są zapisywane w UV.
- Widok 2D działa bez WebGL i jest pełnoprawnym fallbackiem.
- Jeśli klient nie ma zdjęcia (np. nie wyraził zgody), personel może zaznaczać zmiany na wbudowanym szablonie twarzy (`public/face-template.webp`). Szablon działa w 2D, bez detekcji MediaPipe; po dodaniu zdjęcia mapa 3D wraca, a analiza zdjęciowa zastępuje szablon.
- Ilustracja szablonu: „Face Woman Cartoon Person Redhead” z Pixabay (Pixabay Content License, bez wymaganej atrybucji).
- Model i WASM są pobierane z CDN MediaPipe. Jeśli gabinet wymaga pełnego self-hostingu, pobierz katalog `wasm` z `node_modules/@mediapipe/tasks-vision` oraz model `face_landmarker.task` do `public/` i zmień adresy w `lib/face-detection.ts`.

## Prywatność

- Zdjęcie nie jest wysyłane do zewnętrznego AI.
- Zgoda na przetwarzanie wizerunku jest zapisywana z datą i autorem (`face_photo_consent_at`, `face_photo_consent_by`).
- Usunięcie zdjęcia usuwa też mapę twarzy. Usunięcie konsultacji usuwa zdjęcie ze storage.
- Przed wdrożeniem potwierdź treść zgody i podstawę przetwarzania danych zdrowotnych z polityką prywatności gabinetu.

## Główne pliki

| Obszar | Plik |
|---|---|
| Migracje | `supabase/migrations/20261023_client_consultations.sql`, `supabase/migrations/20261024_beauty_plan_consultation_link.sql` |
| Typy | `types/consultation.ts` |
| Schemat, opcje, treści info | `lib/consultation.ts` |
| Detekcja twarzy | `lib/face-detection.ts` |
| Geometria 3D | `components/admin/consultation/face/face-3d-utils.ts` |
| Edytor | `components/admin/consultation/face/face-editor.tsx` |
| Formularz | `components/admin/consultation/consultation-editor.tsx` |
| Server functions | `src/server/consultations.ts` |
| Trasy | `src/routes/_authed/dashboard/clients.$clientId_.consultations*.tsx` |

-- Seed: dodaje zabiegi ili Clinic Studio do istniejącego gabinetu
-- Jeśli nie masz jeszcze gabinetu, najpierw go utwórz przez /register

DO $$
DECLARE
  v_user_id UUID := '11688b73-e252-45ed-9180-a6c9961a51d9';
  v_salon_id UUID;
BEGIN
  -- Znajdź istniejący gabinet użytkownika
  SELECT id INTO v_salon_id FROM salons WHERE user_id = v_user_id;

  IF v_salon_id IS NULL THEN
    RAISE EXCEPTION 'Nie znaleziono gabinetu dla tego użytkownika. Najpierw utwórz konto przez /register.';
  END IF;

  -- Dodaj zabiegi jeśli jeszcze nie istnieją
  INSERT INTO treatments (id, salon_id, name, description, duration_minutes)
  SELECT gen_random_uuid(), v_salon_id, n.name, n.desc, n.dur
  FROM (VALUES
    ('Toksyna Botulinowa (Botoks)', 'Redukcja zmarszczek mimicznych. Naturalnie wygładzona skóra bez efektu maski.', 30),
    ('Depilacja Laserowa', 'Trwałe usuwanie owłosienia laserem AlexDual Xlase. Dla każdego typu skóry.', 45),
    ('Dermapen 4.0', 'Frakcyjna mikronakłuwanie dla regeneracji, redukcji blizn i odmłodzenia.', 60),
    ('Fala Radiowa Mikroigłowa', 'Gold Needle RF - przebudowa skóry i lifting przy użyciu złotych mikroigieł.', 60),
    ('Karboksyterapia', 'Terapia CO2 dla poprawy krążenia. Cienie pod oczami, cellulit, blizny.', 45),
    ('Królewski Lift MedEstelle', 'Autorski masaż liftingujący z kosmetykami MedEstelle. Relaksacja i odmłodzenie.', 60),
    ('Kwas Hialuronowy', 'Modelowanie twarzy, powiększanie ust, wypełnianie bruzd, konturowanie.', 60),
    ('Lipoliza Iniekcyjna', 'Redukcja tkanki tłuszczowej - modelowanie sylwetki bez chirurgii.', 45),
    ('Mezoterapia Igłowa', 'Aktywne składniki bezpośrednio do skóry. Nawilżenie, odmłodzenie, regeneracja.', 45),
    ('Oczyszczanie Wodorowe AquaSure H2', 'Głębokie oczyszczanie i nawilżenie aktywnego wodoru. Redukcja porów.', 60),
    ('Przekłuwanie Uszu Blomdahl', 'Medyczne przekłuwanie systemem Blomdahl. Bezpieczne, dla alergików.', 15),
    ('Stymulatory Tkankowe', 'Głęboka regeneracja i odmłodzenie. Poprawa owalu twarzy i jędrności.', 45),
    ('Termolifting Xlase', 'Laserowy lifting bez skalpela. Napięcie i odmłodzenie energią cieplną.', 60),
    ('Trychologia', 'Konsultacje i zabiegi skóry głowy. Stymulacja wzrostu włosów, leczenie łysienia.', 60)
  ) AS n(name, desc, dur)
  WHERE NOT EXISTS (
    SELECT 1 FROM treatments t WHERE t.salon_id = v_salon_id AND t.name = n.name
  );

  RAISE NOTICE 'Zabiegi dodane do istniejącego gabinetu!';
END $$;

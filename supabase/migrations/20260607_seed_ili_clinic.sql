-- Seed: ili Clinic Studio Pruszków
-- Używa konta: 11688b73-e252-45ed-9180-a6c9961a51d9

DO $$
DECLARE
  v_user_id UUID := '11688b73-e252-45ed-9180-a6c9961a51d9';
  v_salon_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM salons WHERE name = 'ili Clinic Studio') THEN
    INSERT INTO salons (id, user_id, name, phone, address)
    VALUES (v_salon_id, v_user_id, 'ili Clinic Studio', '+48 660 176 464', 'ul. Obrońców Pokoju 10/Lokal 4, 05-800 Pruszków');

    INSERT INTO treatments (id, salon_id, name, description, duration_minutes) VALUES
      (gen_random_uuid(), v_salon_id, 'Toksyna Botulinowa (Botoks)', 'Redukcja zmarszczek mimicznych. Naturalnie wygładzona skóra bez efektu maski.', 30),
      (gen_random_uuid(), v_salon_id, 'Depilacja Laserowa', 'Trwałe usuwanie owłosienia laserem AlexDual Xlase. Dla każdego typu skóry.', 45),
      (gen_random_uuid(), v_salon_id, 'Dermapen 4.0', 'Frakcyjna mikronakłuwanie dla regeneracji, redukcji blizn i odmłodzenia.', 60),
      (gen_random_uuid(), v_salon_id, 'Fala Radiowa Mikroigłowa', 'Gold Needle RF - przebudowa skóry i lifting przy użyciu złotych mikroigieł.', 60),
      (gen_random_uuid(), v_salon_id, 'Karboksyterapia', 'Terapia CO2 dla poprawy krążenia. Cienie pod oczami, cellulit, blizny.', 45),
      (gen_random_uuid(), v_salon_id, 'Królewski Lift MedEstelle', 'Autorski masaż liftingujący z kosmetykami MedEstelle. Relaksacja i odmłodzenie.', 60),
      (gen_random_uuid(), v_salon_id, 'Kwas Hialuronowy', 'Modelowanie twarzy, powiększanie ust, wypełnianie bruzd, konturowanie.', 60),
      (gen_random_uuid(), v_salon_id, 'Lipoliza Iniekcyjna', 'Redukcja tkanki tłuszczowej - modelowanie sylwetki bez chirurgii.', 45),
      (gen_random_uuid(), v_salon_id, 'Mezoterapia Igłowa', 'Aktywne składniki bezpośrednio do skóry. Nawilżenie, odmłodzenie, regeneracja.', 45),
      (gen_random_uuid(), v_salon_id, 'Oczyszczanie Wodorowe AquaSure H2', 'Głębokie oczyszczanie i nawilżenie aktywnego wodoru. Redukcja porów.', 60),
      (gen_random_uuid(), v_salon_id, 'Przekłuwanie Uszu Blomdahl', 'Medyczne przekłuwanie systemem Blomdahl. Bezpieczne, dla alergików.', 15),
      (gen_random_uuid(), v_salon_id, 'Stymulatory Tkankowe', 'Głęboka regeneracja i odmłodzenie. Poprawa owalu twarzy i jędrności.', 45),
      (gen_random_uuid(), v_salon_id, 'Termolifting Xlase', 'Laserowy lifting bez skalpela. Napięcie i odmłodzenie energią cieplną.', 60),
      (gen_random_uuid(), v_salon_id, 'Trychologia', 'Konsultacje i zabiegi skóry głowy. Stymulacja wzrostu włosów, leczenie łysienia.', 60);

    RAISE NOTICE 'Gabinet ili Clinic Studio + 14 zabiegów utworzone!';
  END IF;
END $$;

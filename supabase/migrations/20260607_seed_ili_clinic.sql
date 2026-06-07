-- Seed: ili Clinic Studio Pruszków
-- UWAGA: ZANIM uruchomisz, podmień 'REPLACE_WITH_YOUR_USER_ID' na UUID
-- swojego konta użytkownika (auth.users).
-- Możesz go znaleźć w Supabase Dashboard → Authentication → Users

DO $$
DECLARE
  v_user_id UUID := 'REPLACE_WITH_YOUR_USER_ID';
  v_salon_id UUID := gen_random_uuid();
BEGIN
  -- Sprawdź czy użytkownik został podmieniony
  IF v_user_id = 'REPLACE_WITH_YOUR_USER_ID' THEN
    RAISE EXCEPTION 'Najpierw podmień REPLACE_WITH_YOUR_USER_ID na swoje UUID z auth.users!';
  END IF;

  -- Sprawdź czy gabinet już istnieje
  IF NOT EXISTS (SELECT 1 FROM salons WHERE name = 'ili Clinic Studio') THEN
    INSERT INTO salons (id, user_id, name, phone, address)
    VALUES (
      v_salon_id,
      v_user_id,
      'ili Clinic Studio',
      '+48 660 176 464',
      'ul. Obrońców Pokoju 10/Lokal 4, 05-800 Pruszków'
    );

    -- Zabiegi
    INSERT INTO treatments (id, salon_id, name, description, duration_minutes, price) VALUES
      (gen_random_uuid(), v_salon_id, 'Toksyna Botulinowa (Botoks)',
       'Redukcja zmarszczek mimicznych przy użyciu toksyny botulinowej. Naturalnie wygładzona skóra bez efektu maski.',
       30, NULL),

      (gen_random_uuid(), v_salon_id, 'Depilacja Laserowa',
       'Trwałe usuwanie owłosienia laserem AlexDual Xlase. Bezpieczna i skuteczna metoda dla każdego typu skóry.',
       45, NULL),

      (gen_random_uuid(), v_salon_id, 'Dermapen 4.0',
       'Frakcyjna mikronakłuwanie skóry dla regeneracji, redukcji blizn i odmłodzenia. Złoty standard mikronakłuwania.',
       60, NULL),

      (gen_random_uuid(), v_salon_id, 'Fala Radiowa Mikroigłowa',
       'Gold Needle RF - intensywna przebudowa skóry i lifting przy użyciu złotych mikroigieł z falą radiową.',
       60, NULL),

      (gen_random_uuid(), v_salon_id, 'Karboksyterapia',
       'Terapia dwutlenkiem węgla dla poprawy krążenia. Cienie pod oczami, cellulit, blizny, rozstępy.',
       45, NULL),

      (gen_random_uuid(), v_salon_id, 'Królewski Lift MedEstelle',
       'Autorski masaż liftingujący w połączeniu z profesjonalnymi kosmetykami MedEstelle. Głęboka relaksacja i odmłodzenie.',
       60, NULL),

      (gen_random_uuid(), v_salon_id, 'Kwas Hialuronowy',
       'Modelowanie i odmładzanie twarzy przy użyciu kwasu hialuronowego. Powiększanie ust, wypełnianie bruzd, konturowanie.',
       60, NULL),

      (gen_random_uuid(), v_salon_id, 'Lipoliza Iniekcyjna',
       'Redukcja tkanki tłuszczowej poprzez iniekcje. Modelowanie sylwetki bez chirurgii - podbródek, boczki, uda.',
       45, NULL),

      (gen_random_uuid(), v_salon_id, 'Mezoterapia Igłowa',
       'Dostarczanie aktywnych składników bezpośrednio do skóry poprzez mikrowstrzyknięcia. Nawilżenie, odmłodzenie, regeneracja.',
       45, NULL),

      (gen_random_uuid(), v_salon_id, 'Oczyszczanie Wodorowe AquaSure H2',
       'Głębokie oczyszczanie i nawilżenie skóry przy użyciu aktywnego wodoru. Redukcja porów i nawilżenie.',
       60, NULL),

      (gen_random_uuid(), v_salon_id, 'Przekłuwanie Uszu Blomdahl',
       'Medyczne przekłuwanie uszu systemem Blomdahl. Bezpieczne, higieniczne, odpowiednie dla alergików.',
       15, NULL),

      (gen_random_uuid(), v_salon_id, 'Stymulatory Tkankowe',
       'Głęboka regeneracja i odmłodzenie skóry dzięki stymulatorom tkankowym. Poprawa owalu twarzy i jędrności.',
       45, NULL),

      (gen_random_uuid(), v_salon_id, 'Termolifting Xlase',
       'Laserowy lifting skóry bez skalpela. Napięcie i odmłodzenie dzięki kontrolowanej energii cieplnej.',
       60, NULL),

      (gen_random_uuid(), v_salon_id, 'Trychologia',
       'Konsultacje i zabiegi na skórę głowy. Diagnostyka, stymulacja wzrostu włosów, leczenie łysienia.',
       60, NULL);

    RAISE NOTICE 'Gabinet ili Clinic Studio + 14 zabiegów utworzone!';
  ELSE
    RAISE NOTICE 'Gabinet ili Clinic Studio już istnieje, pomijam.';
  END IF;
END $$;

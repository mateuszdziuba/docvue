# docvue

Nowoczesna platforma do zarządzania dokumentacją dla gabinetów kosmetycznych i beauty. Twórz formularze, zbieraj zgody, zarządzaj klientami i wizytami - wszystko w jednym miejscu.

![docvue](public/logo-dv.png)

## ✨ Funkcje

- 🎨 **Kreator formularzy** - Twórz profesjonalne ankiety i zgody metodą drag & drop
- ✍️ **Podpisy elektroniczne** - Klienci mogą podpisywać formularze na urządzeniach mobilnych
- 👥 **Zarządzanie klientami** - Pełna baza klientów z historią wizyt
- 📅 **System wizyt** - Planuj wizyty z automatycznym przypomnieniem o formularzach
- 📸 **Dokumentacja zdjęciowa** - Zdjęcia przed/po z porównaniem
- 🔗 **Linki do formularzy** - Wysyłaj spersonalizowane linki do wypełnienia
- 📱 **Responsywny design** - Działa na każdym urządzeniu
- 🌙 **Tryb ciemny** - Komfort pracy w każdych warunkach

## 🛠️ Stack technologiczny

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Baza danych**: [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **Stylowanie**: [Tailwind CSS](https://tailwindcss.com/)
- **Komponenty UI**: [shadcn/ui](https://ui.shadcn.com/)
- **Walidacja**: [Zod](https://zod.dev/)
- **Formularze**: [React Hook Form](https://react-hook-form.com/)

## 🚀 Uruchomienie lokalne

1. **Sklonuj repozytorium**
   ```bash
   git clone https://github.com/your-username/docvue.git
   cd docvue
   ```

2. **Zainstaluj zależności**
   ```bash
   pnpm install
   ```

3. **Skonfiguruj zmienne środowiskowe**
   ```bash
   cp .env.example .env.local
   ```
   
   Wypełnij `.env.local`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Uruchom serwer deweloperski**
   ```bash
   pnpm dev
   ```

5. Otwórz [http://localhost:3000](http://localhost:3000)

## 📁 Struktura projektu

```
├── app/                    # Next.js App Router
│   ├── (admin)/           # Panel administracyjny
│   ├── (auth)/            # Strony logowania/rejestracji
│   ├── f/                 # Publiczne formularze
│   └── page.tsx           # Landing page
├── components/            
│   ├── admin/             # Komponenty panelu admin
│   ├── form-builder/      # Kreator formularzy
│   └── ui/                # Komponenty UI (shadcn)
├── actions/               # Server Actions
├── lib/                   # Utilities i konfiguracja
└── supabase/              # Schema bazy danych
```

## 🗄️ Baza danych

Projekt wykorzystuje Supabase z następującymi tabelami:

- `salons` - Gabinety/konta użytkowników
- `clients` - Klienci gabinetu
- `forms` - Szablony formularzy
- `submissions` - Wypełnione formularze
- `appointments` - Wizyty
- `treatments` - Zabiegi/usługi
- `treatment_forms` - Powiązania zabiegów z formularzami
- `client_forms` - Formularze przypisane do klientów

## 📄 Licencja

MIT

---

Zbudowane z ❤️ dla branży beauty

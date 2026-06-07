-- Dodaje kolumnę indications do treatments dla lepszego dopasowania zabiegów do problemów klienta
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS indications TEXT[] DEFAULT '{}';

-- Indeks GIN dla szybkiego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_treatments_indications ON treatments USING GIN (indications);

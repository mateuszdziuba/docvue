-- 1. Funkcja sprawdzająca czy formularz ma wypełnienia
CREATE OR REPLACE FUNCTION check_form_schema_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Sprawdź, czy zmienia się struktura (schema)
  IF NEW.schema::text <> OLD.schema::text THEN
    -- Sprawdź, czy formularz ma jakiekolwiek wypełnienia (submissions)
    IF EXISTS (SELECT 1 FROM submissions WHERE form_id = OLD.id) THEN
      RAISE EXCEPTION 'Ten formularz został już wypełniony przez klientów. Edycja struktury jest zablokowana. Możesz go jedynie usunąć (co usunie również wszystkie odpowiedzi).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger uruchamiany przed aktualizacją
DROP TRIGGER IF EXISTS prevent_form_schema_update ON forms;
CREATE TRIGGER prevent_form_schema_update
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION check_form_schema_update();

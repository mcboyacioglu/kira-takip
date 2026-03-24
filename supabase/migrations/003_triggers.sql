-- ============================================================
-- 003_triggers.sql
-- updated_at otomatik güncelleme + hisse toplamı doğrulama
-- ============================================================

-- ============================================================
-- updated_at trigger fonksiyonu
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.guncelleme_tarihi = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tüm tablolara updated_at trigger'ı ekle
CREATE TRIGGER trg_updated_at_para_birimleri
  BEFORE UPDATE ON para_birimleri
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_updated_at_kisiler
  BEFORE UPDATE ON kisiler
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_updated_at_mulkler
  BEFORE UPDATE ON mulkler
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_updated_at_mulk_hisseleri
  BEFORE UPDATE ON mulk_hisseleri
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_updated_at_kiracilar
  BEFORE UPDATE ON kiracilar
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_updated_at_islemler
  BEFORE UPDATE ON islemler
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_updated_at_ekler
  BEFORE UPDATE ON ekler
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Hisse toplamı doğrulama trigger'ı
-- Aynı mülk için çakışan tarih aralığındaki aktif hisselerin
-- toplamı %100'ü geçemez.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_hisse_toplami()
RETURNS TRIGGER AS $$
DECLARE
  toplam NUMERIC;
BEGIN
  SELECT COALESCE(SUM(hisse_orani), 0)
  INTO toplam
  FROM mulk_hisseleri
  WHERE mulk_id = NEW.mulk_id
    AND id IS DISTINCT FROM NEW.id
    AND (bitis_tarihi  IS NULL OR bitis_tarihi  >= NEW.baslangic_tarihi)
    AND (NEW.bitis_tarihi IS NULL OR baslangic_tarihi <= NEW.bitis_tarihi);

  IF toplam + NEW.hisse_orani > 100.00 THEN
    RAISE EXCEPTION
      'Hisse toplamı %%100''u aşıyor. Mevcut toplam: %, eklenmek istenen: %',
      toplam, NEW.hisse_orani
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_hisse_toplami
  BEFORE INSERT OR UPDATE ON mulk_hisseleri
  FOR EACH ROW EXECUTE FUNCTION validate_hisse_toplami();

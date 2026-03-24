-- Migration: 008_doviz_kuru_trigger.sql
-- Description: Doviz kuru ve usd_tutari icin trigger ekleme + mevcut verileri doldurma

-- Doviz kuru hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION hesapla_doviz_kuru(p_tarih DATE, p_para_birimi TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_doviz_kuru NUMERIC;
  v_usd_alis NUMERIC;
  v_para_alis NUMERIC;
BEGIN
  -- USD ise doviz_kuru = 1
  IF p_para_birimi = 'USD' THEN
    RETURN 1;
  END IF;

  -- USD alis kurunu al
  SELECT alis INTO v_usd_alis
  FROM doviz_kurlari
  WHERE tarih = p_tarih AND para_birimi = 'USD';

  IF v_usd_alis IS NULL THEN
    RETURN NULL;
  END IF;

  -- TRY icin: doviz_kuru = 1/USD_alis
  IF p_para_birimi = 'TRY' THEN
    RETURN 1 / v_usd_alis;
  END IF;

  -- Diger para birimleri icin (EUR vb.)
  SELECT alis INTO v_para_alis
  FROM doviz_kurlari
  WHERE tarih = p_tarih AND para_birimi = p_para_birimi;

  IF v_para_alis IS NULL THEN
    RETURN NULL;
  END IF;

  -- doviz_kuru = para_birimi_alis / USD_alis
  RETURN v_para_alis / v_usd_alis;
END;
$$ LANGUAGE plpgsql;

-- Trigger fonksiyonu
CREATE OR REPLACE FUNCTION trigger_hesapla_doviz_kuru()
RETURNS TRIGGER AS $$
BEGIN
  -- Sadece doviz_kuru veya usd_tutari degismemisse hesapla
  IF NEW.doviz_kuru IS NULL OR NEW.usd_tutari IS NULL THEN
    NEW.doviz_kuru := hesapla_doviz_kuru(NEW.tarih, NEW.para_birimi);
    IF NEW.doviz_kuru IS NOT NULL THEN
      NEW.usd_tutari := NEW.tutar * NEW.doviz_kuru;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger ekle
DROP TRIGGER IF EXISTS trigger_islemler_doviz_kuru ON islemler;
CREATE TRIGGER trigger_islemler_doviz_kuru
  BEFORE INSERT OR UPDATE OF doviz_kuru, usd_tutari, tarih, para_birimi, tutar
  ON islemler
  FOR EACH ROW
  EXECUTE FUNCTION trigger_hesapla_doviz_kuru();

-- Mevcut verileri doldur (trigger calistirarak)
UPDATE islemler
SET doviz_kuru = doviz_kuru,  -- Trigger'i tetiklemek icin
    usd_tutari = usd_tutari
WHERE doviz_kuru IS NULL OR usd_tutari IS NULL;

-- Alternatif: Manuel doldurma (trigger calismazsa)
-- UPDATE islemler
-- SET 
--   doviz_kuru = hesapla_doviz_kuru(tarih, para_birimi),
--   usd_tutari = tutar * hesapla_doviz_kuru(tarih, para_birimi)
-- WHERE doviz_kuru IS NULL OR usd_tutari IS NULL;

-- Sonuc kontrol
SELECT 
  COUNT(*) as toplam_islem,
  COUNT(doviz_kuru) as kur_dolmus,
  COUNT(usd_tutari) as usd_tutari_dolmus
FROM islemler;

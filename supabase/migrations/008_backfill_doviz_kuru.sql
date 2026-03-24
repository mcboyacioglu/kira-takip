-- Migration: 008_backfill_doviz_kuru.sql
-- Description: Mevcut islemler icin doviz_kuru ve usd_tutari doldur
-- Not: Oncelikle doviz_kurlari tablosunun dolu olmasi gerekiyor

-- Doviz kuru hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION hesapla_doviz_kuru(p_tarih DATE, p_para_birimi TEXT, p_tutar NUMERIC)
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

-- islemler tablosunu guncelle
UPDATE islemler
SET 
  doviz_kuru = hesapla_doviz_kuru(tarih, para_birimi, tutar),
  usd_tutari = tutar * hesapla_doviz_kuru(tarih, para_birimi, tutar)
WHERE doviz_kuru IS NULL OR usd_tutari IS NULL;

-- Sonuc kontrol
SELECT 
  COUNT(*) as toplam_islem,
  COUNT(doviz_kuru) as kur_dolmus,
  COUNT(usd_tutari) as usd_tutari_dolmus
FROM islemler;

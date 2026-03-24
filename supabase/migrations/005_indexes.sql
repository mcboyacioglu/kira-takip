-- ============================================================
-- 005_indexes.sql
-- Performans için composite index'ler
-- ============================================================

-- Aktif kiracı sorgularını hızlandır
CREATE INDEX idx_kiracilar_mulk_aktif
  ON kiracilar (mulk_id)
  WHERE bitis_tarihi IS NULL;

-- İşlem tarih bazlı sorgular
CREATE INDEX idx_islemler_tarih       ON islemler (tarih DESC);
CREATE INDEX idx_islemler_kiraci      ON islemler (kiraci_id, tarih DESC);
CREATE INDEX idx_islemler_mulk        ON islemler (mulk_id, tarih DESC);
CREATE INDEX idx_islemler_tur         ON islemler (tur);

-- Hisse sorguları
CREATE INDEX idx_mulk_hisseleri_mulk  ON mulk_hisseleri (mulk_id);
CREATE INDEX idx_mulk_hisseleri_kisi  ON mulk_hisseleri (kisi_id);

-- Kişi arama
CREATE INDEX idx_kisiler_tam_ad       ON kisiler USING gin(to_tsvector('turkish', tam_ad));

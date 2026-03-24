-- ============================================================
-- 001_initial_schema.sql
-- Temel tablolar: para_birimleri, kisiler, mulkler,
--                 mulk_hisseleri, kiracilar, doviz_kurlari
-- ============================================================

-- Gerekli eklentiler
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Para Birimleri (lookup tablosu)
-- ============================================================
CREATE TABLE para_birimleri (
  kod                TEXT PRIMARY KEY,
  ad                 TEXT NOT NULL,
  sembol             TEXT,
  aktif              BOOLEAN DEFAULT true,
  olusturma_tarihi   TIMESTAMPTZ DEFAULT now(),
  guncelleme_tarihi  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO para_birimleri (kod, ad, sembol) VALUES
  ('TRY', 'Türk Lirası',       '₺'),
  ('USD', 'Amerikan Doları',    '$'),
  ('EUR', 'Euro',               '€');

-- ============================================================
-- Kişiler
-- ============================================================
CREATE TABLE kisiler (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tam_ad                      TEXT NOT NULL,
  kimlik_no                   TEXT,
  telefon                     TEXT,
  eposta                      TEXT,
  kullanici_hesabi_var_mi     BOOLEAN DEFAULT false,
  kullanici_id                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  baslangic_tarihi            DATE,
  bitis_tarihi                DATE,
  olusturma_tarihi            TIMESTAMPTZ DEFAULT now(),
  guncelleme_tarihi           TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Mülkler
-- ============================================================
CREATE TABLE mulkler (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad                   TEXT NOT NULL,
  detay                TEXT,
  adres                TEXT,
  satin_alma_fiyati    NUMERIC(15,2),
  para_birimi          TEXT DEFAULT 'TRY' REFERENCES para_birimleri(kod),
  baslangic_tarihi     DATE,
  bitis_tarihi         DATE,
  olusturma_tarihi     TIMESTAMPTZ DEFAULT now(),
  guncelleme_tarihi    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Mülk Hisseleri
-- ============================================================
CREATE TABLE mulk_hisseleri (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mulk_id              UUID NOT NULL REFERENCES mulkler(id) ON DELETE CASCADE,
  kisi_id              UUID NOT NULL REFERENCES kisiler(id) ON DELETE RESTRICT,
  hisse_orani          NUMERIC(5,2) NOT NULL
                         CHECK (hisse_orani > 0 AND hisse_orani <= 100),
  baslangic_tarihi     DATE NOT NULL,
  bitis_tarihi         DATE,
  olusturma_tarihi     TIMESTAMPTZ DEFAULT now(),
  guncelleme_tarihi    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Kiracılar
-- ============================================================
CREATE TABLE kiracilar (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mulk_id              UUID NOT NULL REFERENCES mulkler(id) ON DELETE RESTRICT,
  ad                   TEXT NOT NULL,
  uzun_ad              TEXT,
  vergi_dairesi        TEXT,
  vergi_no             TEXT,
  kimlik_no            TEXT,
  kira_tutari          NUMERIC(15,2) NOT NULL,
  kira_para_birimi     TEXT DEFAULT 'TRY' REFERENCES para_birimleri(kod),
  kontrat_baslangici   DATE,
  baslangic_tarihi     DATE NOT NULL,
  bitis_tarihi         DATE,
  stopaj_takibi        BOOLEAN DEFAULT false,
  olusturma_tarihi     TIMESTAMPTZ DEFAULT now(),
  guncelleme_tarihi    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Döviz Kurları (TCMB önbelleği)
-- ============================================================
CREATE TABLE doviz_kurlari (
  tarih              DATE NOT NULL,
  para_birimi        TEXT NOT NULL REFERENCES para_birimleri(kod),
  alis               NUMERIC(15,6),
  satis              NUMERIC(15,6),
  merkez_kuru        NUMERIC(15,6),
  olusturma_tarihi   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tarih, para_birimi)
);

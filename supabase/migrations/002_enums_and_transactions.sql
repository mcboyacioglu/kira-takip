-- ============================================================
-- 002_enums_and_transactions.sql
-- islem_turu ENUM + islemler tablosu + ekler tablosu
-- ============================================================

-- İşlem türü ENUM
CREATE TYPE islem_turu AS ENUM (
  'kira_tahakkuku',
  'kira_odeme_nakit',
  'kira_odeme_banka',
  'kira_odeme_stopaj',
  'masraf',
  'transfer',
  'depozito',
  'depozito_iade'
);

-- ============================================================
-- İşlemler
-- ============================================================
CREATE TABLE islemler (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tarih            DATE NOT NULL,
  saat             TIME,
  tur              islem_turu NOT NULL,
  tutar            NUMERIC(15,2) NOT NULL,
  para_birimi      TEXT DEFAULT 'TRY' REFERENCES para_birimleri(kod),
  odemeyi_alan     UUID REFERENCES kisiler(id) ON DELETE SET NULL,
  mulk_id          UUID REFERENCES mulkler(id) ON DELETE SET NULL,
  kiraci_id        UUID REFERENCES kiracilar(id) ON DELETE SET NULL,
  aciklama         TEXT,
  doviz_kuru       NUMERIC(15,6),
  usd_tutari       NUMERIC(15,2) GENERATED ALWAYS AS (
                     CASE
                       WHEN doviz_kuru IS NOT NULL
                       THEN ROUND(tutar * doviz_kuru, 2)
                       ELSE NULL
                     END
                   ) STORED,
  olusturma_tarihi  TIMESTAMPTZ DEFAULT now(),
  guncelleme_tarihi TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Ekler (attachments metadata)
-- ============================================================
CREATE TABLE ekler (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  iliski_turu      TEXT NOT NULL
                     CHECK (iliski_turu IN ('mulk', 'kiraci', 'islem')),
  iliski_id        UUID NOT NULL,
  dosya_adi        TEXT NOT NULL,
  depolama_yolu    TEXT NOT NULL,
  dosya_tipi       TEXT,
  boyut_bayt       BIGINT,
  yukleyen_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  olusturma_tarihi  TIMESTAMPTZ DEFAULT now(),
  guncelleme_tarihi TIMESTAMPTZ DEFAULT now()
);

-- Index for fast attachment lookups
CREATE INDEX idx_ekler_iliski ON ekler (iliski_turu, iliski_id);

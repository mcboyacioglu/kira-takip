-- ============================================================
-- 004_rls_policies.sql
-- Row Level Security: tüm authenticated kullanıcılar tam erişim
-- (ilerideki RBAC genişlemesi için tablo-bazlı policy yapısı)
-- ============================================================

-- RLS'yi tüm tablolarda etkinleştir
ALTER TABLE para_birimleri  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kisiler          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mulkler          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mulk_hisseleri  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiracilar        ENABLE ROW LEVEL SECURITY;
ALTER TABLE islemler         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ekler            ENABLE ROW LEVEL SECURITY;
ALTER TABLE doviz_kurlari    ENABLE ROW LEVEL SECURITY;

-- para_birimleri: herkes okuyabilir (giriş yapmadan da), yazma auth gerektirir
CREATE POLICY "pb_select_public"
  ON para_birimleri FOR SELECT
  USING (true);

CREATE POLICY "pb_write_auth"
  ON para_birimleri FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Geri kalan tüm tablolar: authenticated kullanıcılara tam erişim
CREATE POLICY "kisiler_auth_all"
  ON kisiler FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "mulkler_auth_all"
  ON mulkler FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "mulk_hisseleri_auth_all"
  ON mulk_hisseleri FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "kiracilar_auth_all"
  ON kiracilar FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "islemler_auth_all"
  ON islemler FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "ekler_auth_all"
  ON ekler FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "doviz_kurlari_auth_all"
  ON doviz_kurlari FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PartnerBalance {
  kisi_id: string;
  mulk_id: string;
  mulk_adi: string;
  ortak_adi: string;
  hisse_yuzde: number;
  bakiye: number;
  durum: 'Alacak' | 'Borç' | 'Kapalı';
  tutar: number;
}

export function PartnerBalanceReport() {
  const [balances, setBalances] = useState<PartnerBalance[]>([]);
  const [allBalances, setAllBalances] = useState<PartnerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMulk, setSelectedMulk] = useState<string>('');
  const [mulkler, setMulkler] = useState<{ id: string; ad: string }[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (selectedMulk === '') {
      setBalances(allBalances);
    } else {
      setBalances(allBalances.filter(b => b.mulk_id === selectedMulk));
    }
  }, [selectedMulk, allBalances]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_hisse_ozeti')
        .select('*')
        .order('ortak_adi');

      if (error) throw error;

      const data_ = data || [];
      setAllBalances(data_);
      setBalances(data_);

      // Benzersiz mülkleri çıkar
      const uniqueMulkler = Array.from(
        new Map(data_.map(b => [b.mulk_id, { id: b.mulk_id, ad: b.mulk_adi }])).values()
      ).sort((a, b) => a.ad.localeCompare(b.ad));
      setMulkler(uniqueMulkler);
    } catch (error) {
      console.error('Bakiyeler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });

  const totalAlacak = balances
    .filter(b => b.durum === 'Alacak')
    .reduce((sum, b) => sum + b.tutar, 0);

  const totalBorc = balances
    .filter(b => b.durum === 'Borç')
    .reduce((sum, b) => sum + b.tutar, 0);

  // Ortaklara göre grupla
  const ortaklar = Array.from(new Set(balances.map(b => b.ortak_adi)));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Ortaklar Arası Borç / Alacak</h2>

      {/* Mülk filtresi */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mülk Filtresi
        </label>
        <select
          value={selectedMulk}
          onChange={e => setSelectedMulk(e.target.value)}
          className="w-full max-w-xs border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm Mülkler</option>
          {mulkler.map(m => (
            <option key={m.id} value={m.id}>
              {m.ad}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      ) : balances.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Kayıt bulunamadı</div>
      ) : (
        <>
          {/* Özet kartlar */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Toplam Alacak</div>
              <div className="text-2xl font-bold text-green-700 mt-1">
                ₺{fmt(totalAlacak)}
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-600 font-medium">Toplam Borç</div>
              <div className="text-2xl font-bold text-red-700 mt-1">
                ₺{fmt(totalBorc)}
              </div>
            </div>
          </div>

          {/* Ortaklara göre gruplu tablo */}
          {ortaklar.map(ortak => {
            const ortakBalances = balances.filter(b => b.ortak_adi === ortak);
            const ortakNet = ortakBalances.reduce((sum, b) => sum + b.bakiye, 0);

            return (
              <div key={ortak} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">👤 {ortak}</h3>
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      ortakNet > 0
                        ? 'bg-green-100 text-green-700'
                        : ortakNet < 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Net: {ortakNet > 0 ? '+' : ''}₺{fmt(ortakNet)}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left py-3 px-4 font-semibold">Mülk</th>
                        <th className="text-right py-3 px-4 font-semibold">Hisse %</th>
                        <th className="text-right py-3 px-4 font-semibold">Durum</th>
                        <th className="text-right py-3 px-4 font-semibold">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ortakBalances.map(b => (
                        <tr key={b.mulk_id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{b.mulk_adi}</td>
                          <td className="text-right py-3 px-4">
                            %{Number(b.hisse_yuzde).toFixed(0)}
                          </td>
                          <td className="text-right py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                b.durum === 'Alacak'
                                  ? 'bg-green-100 text-green-800'
                                  : b.durum === 'Borç'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {b.durum}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4 font-semibold">
                            ₺{fmt(b.tutar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default PartnerBalanceReport;

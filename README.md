# Kira Takip

Kira Takip, mülk/kiracı/işlem takibi için React + Vite + Supabase tabanlı bir web uygulamasıdır.

## Geliştirme

### Gereksinimler
- Node.js 18+
- npm

### Kurulum
```bash
npm install
```

### Ortam Değişkenleri
Kök dizinde `env.example` dosyasını kopyalayıp yerel ortam dosyanızı oluşturun:

```bash
cp env.example .env.local
```

Gerekli değişkenler:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Çalıştırma
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Dağıtım (Netlify hazır)
- Build command: `npm run build`
- Publish directory: `dist`
- Gerekli env varlar:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Güvenlik Notu
- Gerçek anahtarları veya tokenları repoya commit etmeyin.
- Sadece örnek/env şablon dosyalarını repoda tutun.


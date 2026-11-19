# Rehber

YKS/LGS/YS'ye hazırlanan öğrencilerle derece yapmış mentorları buluşturan
Türkçe peer-mentor pazar yeri MVP'si. Öğrenci mentorunu ve açık saati seçer,
ders talebi gönderir; mentor talebi kabul veya reddeder.

> **v1 kapsamı:** Gerçek ödeme yoktur. Ders ücretleri profillerde bilgi amaçlı
> görünür; talep göndermek kart bilgisi gerektirmez. Rehber komisyon almaz ve
> ödeme garantisi vermez. Profil dereceleri mentorun kendi beyanıdır; v1'de
> belge doğrulaması yapılmaz. Yorum/testimonial bölümü yoktur.

## Stack

- Next.js 15.5 (App Router) + React 19 + Tailwind CSS
- Express 5 + better-sqlite3 (WAL, foreign keys)
- `tsx` + `concurrently`
- Pnpm, TypeScript strict
- Web `3000`, API `4500`

Next, `/api/*` isteklerini içeride Express'e (varsayılan
`http://127.0.0.1:4500`) yönlendirir. Tarayıcı aynı origin'i kullanır; ayrı
CORS ayarı gerekmez.

## Yerel çalıştırma

```bash
pnpm install
pnpm seed          # boş DB'ye demo verisi
pnpm dev           # web: 3000, api: 4500
```

`pnpm dev` çalışmadan önce `predev` boş veritabanını otomatik seed eder.
Mevcut veriyi temizlemek için:

```bash
pnpm seed:reset
```

### Demo hesaplar

Tüm demo hesapların şifresi: **`demo1234`**

| Rol | Kullanıcı adları |
| --- | --- |
| Mentor | `elif_yılmaz`, `mert_kaya`, `zeynep_demir`, `can_aydın`, `selin_arslan`, `burak_şahin`, `derya_koç`, `emre_çelik` |
| Öğrenci | `deniz_ak`, `ege_yıldız`, `ada_karaca`, `kerem_öz` |

Seed; 8 mentor profili, 4 öğrenci, gelecek 7 gün içinde 12 açık saat ve 2
bekleyen örnek talep oluşturur. Giriş Türkçe küçük harf anahtarıyla çalışır
(`DENİZ` = `deniz`). Mentor paneline girmek için örneğin `elif_yılmaz`, öğrenci
paneline girmek için `deniz_ak` kullanılabilir.

## Ortam değişkenleri

`.env.example` dosyasını kopyalayın. Üretimde (`NODE_ENV=production`)
`APP_ORIGINS` ve `COOKIE_SECURE` zorunludur; API bunlar yoksa başlamaz.

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `API_PORT` | `4500` | Express portu |
| `API_HOST` | `127.0.0.1` | Express bind adresi; Docker'da `0.0.0.0` |
| `API_URL` | `http://127.0.0.1:4500` | Next sunucu tarafı fetch adresi |
| `DB_PATH` | `./data/rehber.db` | SQLite dosyası |
| `APP_ORIGINS` | localhost:3000 | Virgülle ayrılmış izinli web origin'leri (CSRF Origin kontrolü) |
| `COOKIE_SECURE` | üretimde zorunlu | `1` = Secure çerez (HTTPS), `0` = yalnızca yerel HTTP demosu |
| `TRUST_PROXY` | kapalı | Ters proxy arkasında `1` |

Oturum çerezi `HttpOnly`, `SameSite=Lax`, `Path=/` ve 30 gün ömürlüdür.
Mutasyonlar `X-Rehber-Client: web` başlığı + allowlist'teki `Origin` ister.

## API

Tümü JSON; hatalar `{ "error": { "code", "message", "field?" } }` döner.

| Metot | Yol | Yetki | Not |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | herkes | `username`, `password`, `email?`, `role`, mentor için `mentorProfile` |
| POST | `/api/auth/login` | herkes | opak oturum çerezi |
| POST | `/api/auth/logout` | herkes | çerezi siler |
| GET | `/api/auth/me` | oturum | `{ user }` |
| GET | `/api/mentors` | herkes | `exam`, `subject`, `maxPrice` filtreleri; `nextSlot` |
| GET | `/api/mentors/:id` | herkes | profil + açık saatler |
| POST | `/api/bookings` | öğrenci | `{ slotId, message }` → 201 `pending`; slot açık kalır |
| GET | `/api/bookings` | oturum | role göre yalnızca kendi talepleri |
| POST | `/api/bookings/:id/accept` | mentor sahibi | slot `booked`; aynı saatteki diğer bekleyen talepler otomatik `declined` |
| POST | `/api/bookings/:id/decline` | mentor sahibi | talep `declined`, slot açık kalır |
| POST | `/api/bookings/:id/cancel` | öğrenci sahibi | `pending`/`accepted` iptal; kabul edilmişse slot yeniden açılır |
| GET | `/api/mentor/slots` | mentor | kendi saatleri + bekleyen talep sayısı |
| POST | `/api/mentor/slots` | mentor | `{ slots: [{ startsAt, durationMin }] }` (1–10) veya çıplak dizi |
| DELETE | `/api/mentor/slots/:id` | mentor sahibi | yalnızca `open` saat silinir |
| GET | `/api/health` | herkes | `{ ok: true }` |

`startsAt` epoch milisaniyedir. Saatler Türkiye saati (GMT+3) olarak gösterilir
ve en az 5 dakika sonrası, en fazla 60 gün sonrası için oluşturulabilir.

## Doğrulama

```bash
pnpm typecheck
pnpm typecheck:server
pnpm lint
pnpm build
pnpm smoke:api
```

`server/smoke-api.ts` geçici bir SQLite dosyası ve rastgele portta gerçek HTTP
sunucusu açar; kayıt/giriş, mentor filtreleri, slot oluşturma, talep, kabul,
reddetme, iptal, rol kontrolleri ve CSRF'i doğrular. `pnpm smoke` da aynı
komutu çalıştırır. Smoke testi çalışan bir dev sunucusu gerektirmez.

## Docker

```bash
cp .env.example .env
# .env içinde en az:
# APP_ORIGINS=http://localhost:3000
# COOKIE_SECURE=0

docker compose up --build
```

- Web: `http://localhost:3000`
- API: `http://localhost:4500`
- SQLite verisi `./data` bind mount'unda tutulur; container ilk açılışta boş
  veritabanını seed eder.
- HTTPS arkasında `APP_ORIGINS=https://alan-adiniz` ve `COOKIE_SECURE=1` ayarlayın,
  `TRUST_PROXY=1` kullanın.
- `docker compose` ortam değişkenleri eksikse başlamaz; bu bilinçli bir
  güvenlik kontrolüdür.

## Yapı

```text
shared/        tipler, sabitler, doğrulama
server/        Express API, SQLite şeması, repository/service katmanı, seed, smoke
src/app/       Next sayfaları (/ , /mentorlar, /mentorlar/[id], /giris, /kayit, /panel)
src/components/ui, site, mentors, panel
src/lib/       api/auth/server-api, biçimlendirme, cn
```

SQLite tek süreçte çalışır; oturum belirteçleri DB'de SHA-256 özetiyle,
şifreler scrypt ile saklanır. Rate limit'ler süreç içidir (restart'ta sıfırlanır).

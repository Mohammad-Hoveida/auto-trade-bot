# TradeBot Advanced - اسکلت اپ ترید پیشرفته (Node.js)

این پروژه یک نسخهٔ نمونه و قابل توسعه از یک ربات ترید پیشرفته است که امکانات زیر را فراهم می‌کند:

- دو حالت عملکرد: **Alert-only** (فقط پیشنهاد و اطلاع‌رسانی) و **Auto-trade** (اجرای خودکار). حالت Auto دو زیرحالت دارد: کاملاً خودکار و با تایید کاربر پیش از باز کردن پوزیشن.
- مدیریت ریسک شامل: حق ضرر روزانه پیش‌فرض 0.75%، درصد ریسک کل پیش‌فرض 3%، و ساز و کار مسدودسازی در صورت تکرار ضرر.
- استراتژی‌های نمونه (EMA crossover، RSI، Mean Reversion) و یک سازندهٔ «ترکیبی/هم‌افزا» که امتیازدهی انجام می‌دهد.
- ذخیره‌سازی محلی با SQLite به‌صورت پیش‌فرض و امکان مهاجرت به Postgres (فایل docker-compose موجود).
- Frontend موبایل-فرست (Pug templates) و PWA (manifest + service worker) برای نوتیفیکیشن و کاربرپسندی.
- ارتباط real-time با Socket.IO (اخطارها، تاییدها، لاگ‌ها).
- ساختار پروژه قابل توسعه و مستند شده.

> ⚠️ هشدار حقوقی/مالی: این نرم‌افزار صرفاً ابزاری برای تحلیل و اجرای معاملات است و **هیچ تضمینی برای سود** نیست. هرگونه تصمیم مالی مسئولیت خود شماست. من (یا این کد) تضمینی برای رسیدن به هدف درصد سود ماهانه نداریم. پیش از اجرای معاملات واقعی، کد را بازبینی، با اکانت تست اجرا و به صورت دستی آزمایش کنید.

## اجرای سریع (local)
1. کپی `.env.example` به `.env` و متغیرها را مقداردهی کن.
2. نصب وابستگی‌ها:
```bash
npm install
```
3. اجرای برنامه:
```bash
npm start
```
سپس به `http://localhost:3000` بروید.

## فایل‌ها و ماژول‌های مهم
- `index.js` — نقطهٔ ورود
- `src/server.js` — لایهٔ API + Socket.IO
- `src/orchestrator.js` — زمانبندی و چرخهٔ استراتژی
- `src/strategy/*` — استراتژی‌ها
- `src/riskManager.js` — منطق مدیریت ریسک و محدودیت‌ها
- `views/` — قالب‌های Pug (UI)
- `public/` — فایل‌های استاتیک و PWA

## نکات برای امن‌سازی و production
- از vault برای نگهداری API keys استفاده کن. `.env` نباید در repo قرار گیرد.
- برای دسترسی و امور حقیقی از حساب‌های sandbox/testnet استفاده کن.
- قبل از اجرا روی ولت واقعی، بک‌تست و paper-trade دقیق انجام بده.
- اضافه کردن متریک‌ها (Prometheus) و alerting برای نظارت پیشنهاد می‌شود.

## توسعهٔ بیشتر
در پروژه نمونه بخش‌های «خواندن اخبار»، «یادگیری خودکار در دورهٔ توقف» به صورت اسکلت پیاده‌سازی شده‌اند و نیاز به تکمیل با داده‌های واقعی و آموزش مدل دارند.

---


## v3 Additional Tools & How to Use

1. OHLCV Downloader:
- Example: `node src/data/ohlcvDownloader.js BTC/USDT 15m 1609459200000 1000 ./data/BTC-15m.csv`
- This will fetch historical candles and write CSV used by the backtester.

2. News Adapter:
- If you have `NEWS_API_KEY` (NewsAPI.org) put it into `.env` to enable news-sentiment in fundamentals.
- Without a key, the system falls back to CoinGecko events.

3. Live Execution:
- For Binance live trading, set `EXCHANGE=binance` and provide `BINANCE_API_KEY` and `BINANCE_SECRET`.
- Strongly recommended: use Binance testnet keys for futures/spots when testing.
- The executor includes retry logic and order polling. Review `src/exchanges/binanceLive.js` and `src/exchanges/ccxtAdapter.js` for exchange-specific settings.


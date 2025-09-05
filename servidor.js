const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

const corsOptions = {
  origin: [
    'https://socialfastsmm.com',
    'https://redirecionarsocialfast.shop',
    'https://lojasocialfast.com'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// sleep compatível com qualquer versão
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.get('/verificar', async (req, res) => {
  const linkTikTok = req.query.link_tiktok;
  const debug = String(req.query.debug || '').toLowerCase() === '1';

  if (!linkTikTok) {
    return res.status(400).json({ message: 'Parâmetro "link_tiktok" não fornecido.' });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const resp = await page.goto(linkTikTok, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Aguarda o DOM estabilizar (compatível)
    await sleep(1500);

    // Tenta esperar por alguma meta/canonical (não falha se não acharr)
    try {
      await page.waitForSelector('head link[rel="canonical"], head meta[property="og:site_name"]', { timeout: 3000 });
    } catch (_) {}

    const finalUrl = page.url();
    const status = resp ? resp.status() : 0;

    const info = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const canonical = q('link[rel="canonical"]')?.href || '';
      const ogSite = q('meta[property="og:site_name"]')?.content || '';
      const ogType = q('meta[property="og:type"]')?.content || '';
      const ogVideo = q('meta[property="og:video"]')?.content || q('meta[name="og:video"]')?.content || '';
      const title = document.title || '';
      const hasNext = !!q('script#__NEXT_DATA__') || !!q('script#SIGI_STATE');
      const bodyText = (document.body && document.body.innerText) ? document.body.innerText : '';
      const captchaTextHit = /Drag the puzzle piece|Slide to verify|puzzle/i.test(bodyText);
      return { canonical, ogSite, ogType, ogVideo, title, hasNext, captchaTextHit };
    });

    const isTikTokBrand =
      /tiktok/i.test(info.ogSite) ||
      /:\/\/([^\/]+\.)?tiktok\.com/i.test(info.canonical || finalUrl) ||
      /tiktok/i.test(info.title) ||
      info.hasNext;

    const isVideoOrProfile =
      /\/video\//i.test(info.canonical) ||
      /\/@/i.test(info.canonical) ||
      /video/i.test(info.ogType) ||
      Boolean(info.ogVideo);

    const captchaDetected = info.captchaTextHit === true;

    const correct = (status && status < 400) && isTikTokBrand && isVideoOrProfile;

    const payload = {
      linkTikTok,
      finalUrl,
      correct,
      captchaDetected,
      message: correct
        ? (captchaDetected ? 'Link parece correto (CAPTCHA detectado na página).' : 'Link está correto.')
        : (captchaDetected ? 'Não foi possível confirmar (CAPTCHA detectado).' : 'Link está incorreto.'),
    };

    if (debug) {
      payload.debug = {
        httpStatus: status,
        signals: {
          ogSite: info.ogSite,
          ogType: info.ogType,
          ogVideo: Boolean(info.ogVideo),
          canonical: info.canonical,
          title: info.title,
          hasNextData: info.hasNext,
        }
      };
    }

    return res.json(payload);

  } catch (error) {
    console.error('Erro ao verificar o link do TikTok:', error.message);
    return res.status(500).json({
      message: 'Erro ao verificar o link do TikTok.',
      error: error.message,
    });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

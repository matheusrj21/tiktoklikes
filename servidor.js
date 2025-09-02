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

app.get('/verificar', async (req, res) => {
  const linkTikTok = req.query.link_tiktok;
  if (!linkTikTok) {
    return res.status(400).json({ message: 'Parâmetro "link_tiktok" não fornecido.' });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    );

    console.log('Verificando o link:', linkTikTok);
    await page.goto(linkTikTok, { waitUntil: 'networkidle2', timeout: 60000 });

    // pequeno atraso para elementos dinâmicos
    await page.waitForTimeout(2000);

    // verifica pelo seletor desejado (ajuste se necessário)
    const isLinkCorrect = await page.evaluate(() => {
      return Boolean(document.querySelector('.css-1zpj2q-ImgAvatar.e1e9er4e1'));
    });

    console.log(isLinkCorrect ? 'Link está correto.' : 'Link está incorreto.');

    return res.json({
      linkTikTok,
      correct: isLinkCorrect,
      message: isLinkCorrect ? 'Link está correto.' : 'Link está incorreto.'
    });

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

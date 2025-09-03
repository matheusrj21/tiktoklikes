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
    return res.status(400).send('Parâmetro "link_tiktok" não fornecido.');
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
  );

  try {
    console.log('Verificando o link:', linkTikTok);
    await page.goto(linkTikTok, { waitUntil: 'networkidle2', timeout: 60000 });

    await new Promise(resolve => setTimeout(resolve, 5000));
    await autoScroll(page);

    const pageContent = await page.content();

    // Printar no console
    console.log("==== INÍCIO DO HTML CAPTURADO ====");
    console.log(pageContent);
    console.log("==== FIM DO HTML CAPTURADO ====");

    const isLinkCorrect = await page.evaluate(() => {
      return Boolean(document.querySelector('.css-1zpj2q-ImgAvatar.e1e9er4e1'));
    });

    if (isLinkCorrect) {
      console.log('Link está correto.');
      // Exibir o HTML direto no navegador (com resultado destacado)
      res.send(`
        <h2 style="color:green">✅ Link está correto.</h2>
        <hr/>
        ${pageContent}
      `);
    } else {
      console.log('Link está incorreto.');
      res.send(`
        <h2 style="color:red">❌ Link está incorreto.</h2>
        <hr/>
        ${pageContent}
      `);
    }
  } catch (error) {
    console.error('Erro ao verificar o link do TikTok:', error.message);
    res.status(500).send(`
      <h2 style="color:red">Erro ao verificar o link do TikTok</h2>
      <p>${error.message}</p>
    `);
  } finally {
    await browser.close();
  }
});

// Função para simular scroll até o final da página
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

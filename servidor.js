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

// util para escapar HTML e impedir execução
function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

app.get('/verificar', async (req, res) => {
  const linkTikTok = req.query.link_tiktok;
  const wantsJson = (req.query.format || '').toLowerCase() === 'json';

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

    // aguarda scripts iniciais
    await new Promise(resolve => setTimeout(resolve, 5000));
    await autoScroll(page);

    const pageContent = await page.content();

    // loga no console para debug
    console.log("==== INÍCIO DO HTML CAPTURADO ====");
    console.log(pageContent);
    console.log("==== FIM DO HTML CAPTURADO ====");

    // tira screenshot para visualização segura
    const screenshotB64 = await page.screenshot({ encoding: 'base64', fullPage: true });

    // seu seletor de validação
    const isLinkCorrect = await page.evaluate(() => {
      return Boolean(document.querySelector('.css-1zpj2q-ImgAvatar.e1e9er4e1'));
    });

    if (wantsJson) {
      return res.json({
        linkTikTok,
        correct: isLinkCorrect,
        html: pageContent,
        screenshot_base64: screenshotB64
      });
    }

    // responde uma página segura (SEM executar scripts do TikTok)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8" />
<title>Verificação TikTok</title>
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none';">
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 16px; line-height: 1.45; }
  .badge { padding: 8px 12px; border-radius: 8px; display: inline-block; font-weight: 600; }
  .ok { background:#e8f5e9; color:#1b5e20; }
  .err { background:#ffebee; color:#b71c1c; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fff; }
  pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; }
  .imgwrap { overflow:auto; }
  .imgwrap img { max-width: 100%; height:auto; border-radius: 8px; display:block; }
  .meta { color:#374151; font-size: 14px; }
  details summary { cursor: pointer; font-weight: 600; }
</style>
</head>
<body>
  <div class="meta">Link verificado: <strong>${escapeHtml(linkTikTok)}</strong></div>
  <div style="margin:12px 0;">
    <span class="badge ${isLinkCorrect ? 'ok' : 'err'}">
      ${isLinkCorrect ? '✅ Link está correto' : '❌ Link está incorreto'}
    </span>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Screenshot (renderizado via Puppeteer)</h3>
      <div class="imgwrap">
        <img alt="Screenshot da página" src="data:image/png;base64,${screenshotB64}" />
      </div>
      <small class="meta">* Imagem estática — segura contra redirecionamentos e execuções de script.</small>
    </div>

    <div class="card">
      <details open>
        <summary>HTML capturado (escapado)</summary>
        <pre>${escapeHtml(pageContent)}</pre>
      </details>
      <small class="meta">* O HTML é exibido como texto para evitar que scripts do TikTok rodem no seu domínio.</small>
    </div>
  </div>
</body>
</html>
    `);

  } catch (error) {
    console.error('Erro ao verificar o link do TikTok:', error.message);
    res.status(500).send(`
      <h2 style="color:red">Erro ao verificar o link do TikTok</h2>
      <p>${escapeHtml(error.message)}</p>
    `);
  } finally {
    await browser.close();
  }
});

// scroll automático
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 200;
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

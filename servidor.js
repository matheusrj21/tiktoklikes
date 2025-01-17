const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

const corsOptions = {
    origin: 'https://socialfastsmm.com',
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
        args: ['--no-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36');

    try {
        console.log('Verificando o link:', linkTikTok);
        await page.goto(linkTikTok, { waitUntil: 'networkidle0', timeout: 60000 });

        // Aguarda seletor ou tempo adicional
        await page.waitForSelector('.css-gcssxn-DivSideNavMask.e8agtid1', { timeout: 15000 });

        const pageContent = await page.content();

        fs.writeFileSync('pagina_tiktok.html', pageContent); // Salvar o HTML para depuração

        const classExists = await page.evaluate(() => {
            return !!document.querySelector('.css-gcssxn-DivSideNavMask.e8agtid1');
        });

        if (classExists) {
            res.json({
                linkTikTok,
                message: 'Vídeo encontrado.',
                exists: true,
                html: pageContent,
            });
        } else {
            res.json({
                linkTikTok,
                message: 'Vídeo não encontrado ou elemento ausente.',
                exists: false,
                html: pageContent,
            });
        }
    } catch (error) {
        res.status(500).json({
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
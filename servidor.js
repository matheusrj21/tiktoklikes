const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

const corsOptions = {
    origin: 'https://socialfastsmm.com', // Altere conforme necessário
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

    try {
        console.log('Verificando o link:', linkTikTok);
        await page.goto(linkTikTok, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Extrair o título do vídeo via meta tag
        const videoTitle = await page.evaluate(() => {
            const metaTitle = document.querySelector('meta[property="og:title"]');
            return metaTitle ? metaTitle.getAttribute('content') : 'Título não encontrado';
        });

        console.log('Título do vídeo:', videoTitle);

        res.json({
            linkTikTok,
            message: 'Título do vídeo obtido com sucesso.',
            title: videoTitle,
        });
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).send('Erro ao verificar o link do TikTok.');
    } finally {
        await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

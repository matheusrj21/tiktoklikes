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

        // Aguarda o carregamento do HTML
        await page.waitForSelector('body', { timeout: 15000 });

        // Verifica se o seletor com o nome do usuário existe e extrai o nome
        const userName = await page.evaluate(() => {
            const userElement = document.querySelector('span.css-1s16qmh-SpanUniqueId.e1ymawm011');
            return userElement ? userElement.textContent : null;
        });

        if (userName) {
            console.log(`Vídeo encontrado. Usuário: ${userName}`);
            res.json({
                linkTikTok,
                message: 'Vídeo encontrado.',
                exists: true,
                user: userName,
            });
        } else {
            console.log('Vídeo não encontrado.');
            res.json({
                linkTikTok,
                message: 'Vídeo não encontrado.',
                exists: false,
            });
        }
    } catch (error) {
        console.error('Erro ao verificar o link do TikTok:', error.message);
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
//
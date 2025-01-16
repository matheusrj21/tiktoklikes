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

        // Obter o código HTML da página
        const pageContent = await page.content();

        // Buscar informações do usuário (uniqueId e nickname)
        const userInfo = await page.evaluate(() => {
            const userId = document.querySelector('[data-e2e="user-id"]') || {};
            const nickname = document.querySelector('[data-e2e="nickname"]') || {};
            return {
                uniqueId: userId ? userId.textContent : null,
                nickname: nickname ? nickname.textContent : null
            };
        });

        // Verificar se o vídeo está disponível com base na presença do usuário
        if (userInfo.uniqueId && userInfo.nickname) {
            console.log('Vídeo encontrado.');
            res.json({
                linkTikTok,
                message: 'Vídeo encontrado.',
                exists: true,
                user: userInfo,
                html: pageContent, // Adiciona o código HTML da página
            });
        } else {
            console.log('Vídeo não encontrado ou informações do usuário ausentes.');
            res.json({
                linkTikTok,
                message: 'Vídeo não encontrado ou informações do usuário ausentes.',
                exists: false,
                html: pageContent, // Adiciona o código HTML da página
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

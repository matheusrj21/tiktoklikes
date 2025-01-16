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

        // Verificar a presença da classe específica
        const classExists = await page.evaluate(() => {
            return !!document.querySelector('.css-gcssxn-DivSideNavMask.e8agtid1');
        });

        if (classExists) {
            console.log('Vídeo encontrado.');
            res.json({
                linkTikTok,
                message: 'Vídeo encontrado.',
                exists: true,
                html: pageContent, // Adiciona o código HTML da página
            });
        } else {
            console.log('Vídeo não encontrado ou elemento ausente.');
            res.json({
                linkTikTok,
                message: 'Vídeo não encontrado ou elemento ausente.',
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

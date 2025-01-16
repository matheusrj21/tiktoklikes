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

        // Verificar se o vídeo existe pela classe
        const videoExistsByClass = await page.evaluate(() => {
            return !!document.querySelector('.css-12kupwv-DivContentContainer.ege8lhx2');
        });

        // Verificar se o vídeo existe pela meta tag
        const videoExistsByMetaTag = await page.evaluate(() => {
            const metaVideo = document.querySelector('meta[property="og:video"]');
            return !!metaVideo;
        });

        // Decidir mensagem com base nos resultados
        if (videoExistsByClass || videoExistsByMetaTag) {
            console.log('Vídeo encontrado.');
            res.json({
                linkTikTok,
                message: 'Vídeo encontrado.',
                exists: true,
                method: videoExistsByClass ? 'Classe' : 'Meta Tag',
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
        console.error('Erro:', error.message);
        res.status(500).send('Erro ao verificar o link do TikTok.');
    } finally {
        await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

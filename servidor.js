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
        
        const response = await page.goto(linkTikTok, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Verificar resposta HTTP
        if (!response.ok() || response.status() >= 400) {
            console.log('Página inacessível ou vídeo não existe.');
            return res.json({
                linkTikTok,
                message: 'Página inacessível ou vídeo não encontrado.',
                exists: false,
            });
        }

        // Verificar mensagens de erro específicas na página
        const videoExists = await page.evaluate(() => {
            const errorMessage = document.body.innerText.toLowerCase();
            return !(
                errorMessage.includes('video not found') || 
                errorMessage.includes('this account is private') || 
                errorMessage.includes('o vídeo foi removido')
            );
        });

        // Responder com base na análise da página
        if (videoExists) {
            console.log('Vídeo encontrado.');
            res.json({
                linkTikTok,
                message: 'Vídeo encontrado.',
                exists: true,
            });
        } else {
            console.log('Vídeo não encontrado ou inacessível.');
            res.json({
                linkTikTok,
                message: 'Vídeo não encontrado ou inacessível.',
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

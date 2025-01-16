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
        console.log('Verificando o status do link:', linkTikTok);

        const response = await page.goto(linkTikTok, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const statusCode = response.status();
        console.log(`Status HTTP: ${statusCode}`);

        if (statusCode >= 200 && statusCode < 300) {
            return res.json({
                linkTikTok,
                message: 'Vídeo encontrado.',
                status: statusCode,
                exists: true,
            });
        } else {
            return res.json({
                linkTikTok,
                message: 'Página inacessível ou vídeo não encontrado.',
                status: statusCode,
                exists: false,
            });
        }
    } catch (error) {
        console.error('Erro ao verificar o status HTTP:', error.message);
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

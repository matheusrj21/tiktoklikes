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

        // Aguarda o carregamento de um seletor específico para garantir que o HTML completo tenha sido carregado
        await page.waitForSelector('body', { timeout: 60000 });

        // Obter o código HTML completo da página
        const pageContent = await page.content();

        // Buscar a descrição diretamente no HTML
        const videoDescription = await page.evaluate(() => {
            const pageText = document.documentElement.innerText;

            // Procurar pela string "desc": seguido da descrição do vídeo
            const descMatch = pageText.match(/"desc":"(.*?)"/);

            // Retornar a descrição se encontrada
            if (descMatch) {
                return descMatch[1];
            } else {
                return null;
            }
        });

        // Verificar se a descrição foi encontrada
        if (videoDescription) {
            console.log('Descrição encontrada:', videoDescription);
            res.json({
                linkTikTok,
                message: 'Vídeo encontrado.',
                exists: true,
                description: videoDescription,
                html: pageContent, // Adiciona o código HTML da página
            });
        } else {
            console.log('Descrição não encontrada.');
            res.json({
                linkTikTok,
                message: 'Descrição não encontrada.',
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

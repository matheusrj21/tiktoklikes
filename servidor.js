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
        // Acessar o link fornecido
        console.log('Verificando o link:', linkTikTok);
        await page.goto(linkTikTok, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Aguardar o conteúdo carregar
        await page.waitForSelector('title', { timeout: 60000 });

        // Obter o código HTML da página
        const pageContent = await page.content();
        console.log('HTML da página:', pageContent); // Exibe o HTML da página no console

        // Puxar título da página via meta tag
        const pageTitle = await page.evaluate(() => {
            const metaTitle = document.querySelector('meta[property="og:title"]');
            return metaTitle ? metaTitle.getAttribute('content') : 'Título não encontrado';
        });
        console.log('Título da página:', pageTitle);

        // Puxar informação de se o vídeo está disponível via meta tag
        const videoStatus = await page.evaluate(() => {
            const metaStatus = document.querySelector('meta[property="og:availability"]');
            return metaStatus ? metaStatus.getAttribute('content') : 'Status não encontrado';
        });
        console.log('Status do vídeo:', videoStatus);

        // Verificar se o vídeo está indisponível ou o perfil está privado
        if (videoStatus === 'unavailable') {
            console.log('O vídeo está indisponível.');
            return res.json({
                linkTikTok,
                message: 'O vídeo está indisponível.',
                html: pageContent, // Incluir o código HTML da página na resposta
            });
        }

        // Verificar se o perfil está privado
        const isPrivate = await page.evaluate(() => {
            const privateText = document.querySelector('.private-message'); // Verifica o texto indicando perfil privado
            return privateText ? true : false;
        });

        if (isPrivate) {
            console.log('O perfil está privado.');
            return res.json({
                linkTikTok,
                message: 'O perfil está privado.',
                html: pageContent, // Incluir o código HTML da página na resposta
            });
        }

        // Obter informações do vídeo (caso seja um vídeo público)
        const videoInfo = await page.evaluate(() => {
            const videoTitle = document.querySelector('h1') ? document.querySelector('h1').innerText : 'Título não encontrado';
            const videoViews = document.querySelector('.view-count') ? document.querySelector('.view-count').innerText : 'Visualizações não encontradas';
            const videoDuration = document.querySelector('.video-duration') ? document.querySelector('.video-duration').innerText : 'Duração não encontrada';

            return {
                title: videoTitle,
                views: videoViews,
                videoDuration: videoDuration,
            };
        });
//
        console.log('Informações do vídeo:', videoInfo);

        if (!videoInfo) {
            console.log('Não foi possível obter as informações do vídeo.');
            return res.json({
                linkTikTok,
                message: 'Não foi possível obter as informações do vídeo.',
                html: pageContent, // Incluir o código HTML da página na resposta
            });
        }

        res.json({
            linkTikTok,
            message: 'Vídeo encontrado.',
            videoInfo: videoInfo,
            html: pageContent, // Incluir o código HTML da página na resposta
        });
    } catch (error) {
        console.error('Erro:', error.message); // Log de erro
        res.status(500).send('Erro ao verificar o link do TikTok.');
    } finally {
        await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

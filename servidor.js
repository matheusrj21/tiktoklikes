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
        headless: true, // Definido como false para ver o navegador (opcional)
        args: ['--no-sandbox'],
    });

    const page = await browser.newPage();

    try {
        console.log('Verificando o link:', linkTikTok);
        await page.goto(linkTikTok, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Aguarda o carregamento completo do HTML
        await page.waitForSelector('body', { timeout: 60000 });

        // Ajuste para garantir que o conteúdo da página seja totalmente carregado
        await page.evaluate(() => {
            return new Promise((resolve) => {
                // Espera a janela inteira carregar (totalmente carregado)
                window.onload = resolve;
            });
        });

        // Obter o conteúdo HTML da página
        const pageContent = await page.content();

        // Buscar a descrição no JSON ou conteúdo JavaScript carregado na página
        const videoDescription = await page.evaluate(() => {
            const jsonMatch = document.documentElement.innerHTML.match(/"desc":"(.*?)"/);
            if (jsonMatch) {
                return jsonMatch[1];  // Retorna a descrição encontrada
            }
            return null;  // Retorna null caso a descrição não seja encontrada
        });

        // Buscar o usuário (uniqueId e nickname)
        const userInfo = await page.evaluate(() => {
            const userMatch = document.documentElement.innerHTML.match(/"uniqueId":"(.*?)","nickname":"(.*?)"/);
            if (userMatch) {
                return {
                    uniqueId: userMatch[1],
                    nickname: userMatch[2],
                };
            }
            return null;  // Retorna null caso o usuário não seja encontrado
        });

        // Verificar se a descrição e o usuário foram encontrados
        if (videoDescription && userInfo) {
            console.log('Descrição e usuário encontrados:', videoDescription, userInfo);
            res.json({
                linkTikTok,
                message: 'Vídeo encontrado.',
                exists: true,
                description: videoDescription,
                user: userInfo,
                html: pageContent, // Inclui o código HTML da página na resposta
            });
        } else {
            console.log('Descrição ou usuário não encontrado.');
            res.json({
                linkTikTok,
                message: 'Descrição ou usuário não encontrado.',
                exists: false,
                html: pageContent, // Inclui o código HTML da página na resposta
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

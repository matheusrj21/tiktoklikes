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

        // Buscar dados JSON no conteúdo da página (uniqueId e nickname)
        const userInfo = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script'));
            let jsonData = null;

            // Itera pelos scripts para encontrar o JSON com uniqueId e nickname
            scripts.forEach(script => {
                if (script.textContent.includes('"uniqueId":')) {
                    try {
                        // Encontrar o JSON dentro do script
                        const jsonText = script.textContent.match(/{.*"uniqueId":".*"/);
                        if (jsonText) {
                            // Remover caracteres problemáticos e tentar fazer o parse
                            jsonData = JSON.parse(jsonText[0].replace(/,\s*$/, '')); // Remove possíveis vírgulas extras
                        }
                    } catch (error) {
                        console.error('Erro ao parsear JSON:', error);
                    }
                }
            });

            return jsonData ? {
                uniqueId: jsonData.uniqueId,
                nickname: jsonData.nickname
            } : null;
        });

        // Verificar se as informações do usuário existem
        if (userInfo && userInfo.uniqueId && userInfo.nickname) {
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

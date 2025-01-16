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
        headless: false, // Exibir o navegador para facilitar a depuração
        args: ['--no-sandbox'],
    });

    const page = await browser.newPage();

    try {
        console.log('Verificando o link:', linkTikTok);
        await page.goto(linkTikTok, { waitUntil: 'networkidle0', timeout: 60000 }); // Espera até que todas as requisições de rede tenham sido concluídas

        // Aguardar o carregamento completo do conteúdo
        await page.waitForSelector('body', { timeout: 60000 }); // Aguarda o carregamento do corpo da página
        await page.waitFor(5000); // Espera mais 5 segundos para garantir que todo o conteúdo dinâmico tenha carregado

        // Obter o conteúdo HTML completo da página
        const pageContent = await page.content();

        // Debug: Exibe o HTML completo para verificar se todos os dados estão presentes
        console.log('HTML Completo da Página:', pageContent);

        // Buscar a descrição diretamente no HTML carregado
        const videoDescription = await page.evaluate(() => {
            const jsonMatch = document.documentElement.innerHTML.match(/"desc":"(.*?)"/);
            if (jsonMatch) {
                return jsonMatch[1];  // Retorna a descrição encontrada
            }
            return null;  // Retorna null caso a descrição não seja encontrada
        });

        // Buscar o usuário (uniqueId e nickname) no HTML carregado
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

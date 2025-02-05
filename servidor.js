const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

const corsOptions = {
    origin: 'https://socialfastsmm.com', // Ajuste conforme necessário
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
        headless: true, // Utilize "new" se sua versão suportar: headless: 'new'
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Define um User Agent para simular um navegador real
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    );

    try {
        console.log('Verificando o link:', linkTikTok);
        await page.goto(linkTikTok, { waitUntil: 'networkidle2', timeout: 60000 });

        // Aguarda 5 segundos para que os scripts dinâmicos sejam executados
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Caso o conteúdo seja carregado conforme o scroll, simula um scroll até o fim da página:
        await autoScroll(page);

        // Verifica se existe um elemento com as classes desejadas
        const isLinkCorrect = await page.evaluate(() => {
            // O seletor abaixo busca um elemento que possua ambas as classes
            return Boolean(document.querySelector('.css-1zpj2q-ImgAvatar.e1e9er4e1'));
        });

        // Extrai o HTML completo da página (opcional, se precisar debugar)
        const pageContent = await page.evaluate(() => document.documentElement.outerHTML);

        if (isLinkCorrect) {
            console.log('Link está correto.');
            res.json({
                linkTikTok,
                message: "Link está correto.",
                correct: true,
                html: pageContent,
            });
        } else {
            console.log('Link está incorreto.');
            res.json({
                linkTikTok,
                message: "Link está incorreto.",
                correct: false,
                html: pageContent,
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

// Função para simular scroll até o final da página
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

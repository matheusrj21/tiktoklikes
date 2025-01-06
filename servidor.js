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
    const linkCanal = req.query.link_canal;
    if (!linkCanal) {
        return res.status(400).send('Parâmetro "link_canal" não fornecido.');
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox'],
    });

    const page = await browser.newPage();

    try {
        // Navegar para o link do canal (página de vídeos)
        const videosLink = `${linkCanal}/videos`;
        console.log('Redirecionando para:', videosLink); // Log do link de redirecionamento
        await page.goto(videosLink, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Aguardar até que o conteúdo de vídeos carregue
        await page.waitForSelector('script', { timeout: 60000 });
        console.log('Conteúdo carregado com sucesso.'); // Log de sucesso

        // Exibir o HTML completo da página (para depuração)
        const pageContent = await page.content();
        console.log('HTML da página:', pageContent); // Log do conteúdo HTML

        // Obter o título da página
        const pageTitle = await page.title();
        console.log('Título da página:', pageTitle); // Log do título da página

        // Verificar se o título indica que o canal não existe
        if (pageTitle === '404 Not Found') {
            console.log('O canal não existe ou está indisponível.');
            return res.json({
                linkCanal,
                message: 'O canal não existe ou está indisponível.',
            });
        }

        // Verificar os vídeos com base nas informações encontradas no HTML
        const videoInfo = await page.evaluate(() => {
            const videos = [];

            // Buscando os scripts que contêm as informações dos vídeos
            const scripts = Array.from(document.querySelectorAll('script'));
            scripts.forEach(script => {
                const content = script.textContent;
                if (content && content.includes('"title":{"runs":')) {
                    // Regex mais amplo para capturar título, visualizações, tempo de postagem e duração
                    const regex = /"title":\{"runs":\[\{"text":"(.*?)"\}\],"accessibility":\{"accessibilityData":\{"label":"(.*?)"\}\}/g;
                    let match;
                    while ((match = regex.exec(content)) !== null) {
                        const title = match[1];
                        const label = match[2];
                        const labelParts = label.split(' ');

                        let views = 'Visualizações não encontradas';
                        let timeAgo = 'Tempo não encontrado';
                        let videoDuration = 'Duração não encontrada';
                        let channelName = 'Nome do canal não encontrado';

                        if (labelParts.length >= 6) {
                            views = labelParts[0]; // Número de visualizações
                            timeAgo = labelParts[3] + ' ' + labelParts[4]; // Tempo de postagem (ex: "5 hours ago")
                            
                            // Ajustando a captura da duração, considerando segundos, minutos e horas
                            const durationRegex = /(\d+)\s*(hours?|minutes?|seconds?)/g;
                            const durationMatches = { hours: 0, minutes: 0, seconds: 0 };
                            let matchDuration;
                            while ((matchDuration = durationRegex.exec(label)) !== null) {
                                const unit = matchDuration[2].toLowerCase();
                                const value = parseInt(matchDuration[1]);

                                if (unit.includes('hour')) {
                                    durationMatches.hours = value;
                                } else if (unit.includes('minute')) {
                                    durationMatches.minutes = value;
                                } else if (unit.includes('second')) {
                                    durationMatches.seconds = value;
                                }
                            }

                            // Organizar as informações de duração na ordem correta (horas, minutos, segundos)
                            videoDuration = `${durationMatches.hours > 0 ? durationMatches.hours + ' hours' : ''} ${durationMatches.minutes > 0 ? durationMatches.minutes + ' minutes' : ''} ${durationMatches.seconds > 0 ? durationMatches.seconds + ' seconds' : ''}`;
                            channelName = labelParts.slice(2, labelParts.length - 3).join(' '); // Nome do canal (ex: "by IBNV LIVRAMENTO")
                        }

                        // Adicionar as informações do vídeo ao array
                        videos.push({
                            title,
                            views,
                            timeAgo,
                            videoDuration,
                            channelName,
                        });
                    }
                }
            });

            return videos;
        });

        console.log('Vídeos encontrados:', videoInfo); // Log dos vídeos encontrados

        if (videoInfo.length === 0) {
            console.log('O canal não possui vídeos postados.');
            return res.json({
                linkCanal,
                message: 'O canal não possui vídeos postados.',
            });
        }

        // Organizar vídeos por linha
        const videoList = videoInfo.map((video, index) => ({
            [`Vídeo ${index + 1}`]: {
                title: video.title,
                views: video.views,
                timeAgo: video.timeAgo,
                videoDuration: video.videoDuration,
                channelName: video.channelName,
            }
        }));

        // Retornar informações dos vídeos encontrados
        res.json({
            linkCanal,
            message: 'Vídeos encontrados no canal.',
            videos: videoList,
        });
    } catch (error) {
        console.error('Erro:', error.message); // Log de erro
        res.status(500).send('Erro ao verificar o canal.');
    } finally {
        await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

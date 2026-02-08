const { 
    giftedId,
    removeFile
} = require('../gift');
const QRCode = require('qrcode');
const express = require('express');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { sendButtons } = require('gifted-btns');
const {
    default: giftedConnect,
    useMultiFileAuthState,
    Browsers,
    delay,
    downloadContentFromMessage, 
    generateWAMessageFromContent, 
    normalizeMessageContent,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const sessionDir = path.join(__dirname, "session");

router.get('/', async (req, res) => {
    const id = giftedId();
    let responseSent = false;
    let sessionCleanedUp = false;

    async function cleanUpSession() {
        if (!sessionCleanedUp) {
            await removeFile(path.join(sessionDir, id));
            sessionCleanedUp = true;
        }
    }

    async function ERNEST_QR_CODE() {
        const { version } = await fetchLatestBaileysVersion();
        console.log(version);
        const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionDir, id));
        try {
            let Ernest = giftedConnect({
                version,
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Desktop"),
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000
            });

            Ernest.ev.on('creds.update', saveCreds);
            Ernest.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;
                
                if (qr && !responseSent) {
                    const qrImage = await QRCode.toDataURL(qr);
                    if (!res.headersSent) {
                        res.send(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Ernest Tech | QR Code Scanner</title>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                                <style>
                                    :root {
                                        --primary: #00d9ff;
                                        --secondary: #0066ff;
                                        --accent: #ff0080;
                                        --dark: #0a0e27;
                                        --light: #f8f9fa;
                                        --gray: #a8b2d1;
                                        --glow: 0 0 20px rgba(0, 217, 255, 0.4);
                                    }

                                    * {
                                        margin: 0;
                                        padding: 0;
                                        box-sizing: border-box;
                                    }

                                    body {
                                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                                        background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0a0e27 100%);
                                        color: var(--light);
                                        min-height: 100vh;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        padding: 2rem;
                                        position: relative;
                                    }

                                    body::before {
                                        content: '';
                                        position: fixed;
                                        top: 0;
                                        left: 0;
                                        width: 100%;
                                        height: 100%;
                                        background: 
                                            radial-gradient(circle at 20% 50%, rgba(0, 217, 255, 0.15) 0%, transparent 50%),
                                            radial-gradient(circle at 80% 80%, rgba(255, 0, 128, 0.15) 0%, transparent 50%);
                                        pointer-events: none;
                                        z-index: 0;
                                    }

                                    .home-btn {
                                        position: fixed;
                                        top: 1.5rem;
                                        right: 1.5rem;
                                        background: linear-gradient(135deg, var(--primary), var(--secondary));
                                        color: white;
                                        padding: 0.9rem 1.8rem;
                                        border-radius: 50px;
                                        font-weight: 600;
                                        text-decoration: none;
                                        box-shadow: 0 10px 30px rgba(0, 217, 255, 0.3);
                                        z-index: 100;
                                        display: flex;
                                        align-items: center;
                                        gap: 0.7rem;
                                        transition: all 0.3s ease;
                                    }

                                    .home-btn:hover {
                                        transform: translateY(-3px);
                                        box-shadow: 0 15px 40px rgba(0, 217, 255, 0.5);
                                    }

                                    .container {
                                        background: rgba(15, 23, 42, 0.9);
                                        padding: 3rem;
                                        border-radius: 25px;
                                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                                        width: 100%;
                                        max-width: 550px;
                                        text-align: center;
                                        position: relative;
                                        z-index: 1;
                                        backdrop-filter: blur(20px);
                                        border: 1px solid rgba(0, 217, 255, 0.2);
                                    }

                                    h1 {
                                        background: linear-gradient(135deg, var(--primary), var(--accent));
                                        -webkit-background-clip: text;
                                        background-clip: text;
                                        color: transparent;
                                        margin-bottom: 1rem;
                                        font-size: 2.2rem;
                                        font-weight: 800;
                                    }

                                    p {
                                        color: var(--gray);
                                        margin-bottom: 2rem;
                                        font-size: 1.05rem;
                                    }

                                    .qr-container {
                                        position: relative;
                                        margin: 2rem auto;
                                        width: 320px;
                                        height: 320px;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                    }

                                    .qr-code {
                                        width: 100%;
                                        height: 100%;
                                        padding: 15px;
                                        background: white;
                                        border-radius: 20px;
                                        box-shadow: var(--glow), 0 10px 40px rgba(0, 0, 0, 0.3);
                                        animation: pulse 2s infinite;
                                    }

                                    .qr-code img {
                                        width: 100%;
                                        height: 100%;
                                        border-radius: 10px;
                                    }

                                    @keyframes pulse {
                                        0%, 100% {
                                            box-shadow: 0 0 20px rgba(0, 217, 255, 0.4), 0 10px 40px rgba(0, 0, 0, 0.3);
                                        }
                                        50% {
                                            box-shadow: 0 0 40px rgba(0, 217, 255, 0.6), 0 10px 40px rgba(0, 0, 0, 0.3);
                                        }
                                    }

                                    .back-btn {
                                        display: inline-block;
                                        padding: 1rem 2.5rem;
                                        margin-top: 1.5rem;
                                        background: linear-gradient(135deg, var(--primary), var(--secondary));
                                        color: white;
                                        text-decoration: none;
                                        border-radius: 50px;
                                        font-weight: 700;
                                        border: none;
                                        cursor: pointer;
                                        transition: all 0.3s ease;
                                        box-shadow: 0 10px 30px rgba(0, 217, 255, 0.3);
                                        text-transform: uppercase;
                                        letter-spacing: 1px;
                                    }

                                    .back-btn:hover {
                                        transform: translateY(-3px);
                                        box-shadow: 0 15px 40px rgba(0, 217, 255, 0.5);
                                    }

                                    .instructions {
                                        background: rgba(0, 217, 255, 0.1);
                                        border: 1px solid rgba(0, 217, 255, 0.3);
                                        border-radius: 15px;
                                        padding: 1.5rem;
                                        margin-top: 1.5rem;
                                    }

                                    .instructions h3 {
                                        color: var(--primary);
                                        margin-bottom: 1rem;
                                        font-size: 1.2rem;
                                    }

                                    .instructions ol {
                                        text-align: left;
                                        color: var(--gray);
                                        line-height: 1.8;
                                        padding-left: 1.5rem;
                                    }

                                    .instructions li {
                                        margin-bottom: 0.5rem;
                                    }

                                    @media (max-width: 480px) {
                                        .container {
                                            padding: 2rem;
                                        }
                                        
                                        h1 {
                                            font-size: 1.8rem;
                                        }

                                        .qr-container {
                                            width: 280px;
                                            height: 280px;
                                        }

                                        .home-btn {
                                            top: 1rem;
                                            right: 1rem;
                                            padding: 0.7rem 1.2rem;
                                            font-size: 0.9rem;
                                        }
                                    }

                                    .particles {
                                        position: fixed;
                                        top: 0;
                                        left: 0;
                                        width: 100%;
                                        height: 100%;
                                        z-index: 0;
                                        pointer-events: none;
                                    }

                                    .particle {
                                        position: absolute;
                                        background: var(--primary);
                                        border-radius: 50%;
                                        opacity: 0.3;
                                        animation: float linear infinite;
                                    }

                                    @keyframes float {
                                        0% {
                                            transform: translateY(100vh) rotate(0deg);
                                            opacity: 0;
                                        }
                                        10% {
                                            opacity: 0.3;
                                        }
                                        90% {
                                            opacity: 0.3;
                                        }
                                        100% {
                                            transform: translateY(-100px) rotate(360deg);
                                            opacity: 0;
                                        }
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="particles" id="particles"></div>
                                
                                <a href="./" class="home-btn">
                                    <i class="fas fa-home"></i> Home
                                </a>
                                
                                <div class="container">
                                    <h1>ERNEST QR CODE</h1>
                                    <p>Scan this QR code with your WhatsApp</p>
                                    
                                    <div class="qr-container">
                                        <div class="qr-code">
                                            <img src="${qrImage}" alt="QR Code"/>
                                        </div>
                                    </div>

                                    <div class="instructions">
                                        <h3><i class="fas fa-info-circle"></i> How to Scan</h3>
                                        <ol>
                                            <li>Open WhatsApp on your phone</li>
                                            <li>Tap Menu (⋮) or Settings</li>
                                            <li>Tap "Linked Devices"</li>
                                            <li>Tap "Link a Device"</li>
                                            <li>Point your phone at this screen to scan the code</li>
                                        </ol>
                                    </div>
                                    
                                    <a href="./" class="back-btn">
                                        <i class="fas fa-arrow-left"></i> Back to Home
                                    </a>
                                </div>

                                <script>
                                    function createParticles() {
                                        const container = document.getElementById('particles');
                                        const particleCount = window.innerWidth < 768 ? 15 : 30;
                                        
                                        for (let i = 0; i < particleCount; i++) {
                                            const particle = document.createElement('div');
                                            particle.classList.add('particle');
                                            
                                            const size = Math.random() * 4 + 2;
                                            particle.style.width = \`\${size}px\`;
                                            particle.style.height = \`\${size}px\`;
                                            particle.style.left = \`\${Math.random() * 100}%\`;
                                            particle.style.bottom = '-10px';
                                            
                                            const duration = Math.random() * 10 + 15;
                                            particle.style.animationDuration = \`\${duration}s\`;
                                            particle.style.animationDelay = \`\${Math.random() * 5}s\`;
                                            
                                            container.appendChild(particle);
                                        }
                                    }
                                    
                                    createParticles();
                                </script>
                            </body>
                            </html>
                        `);
                        responseSent = true;
                    }
                }

                if (connection === "open") {
                    // Join Ernest Tech support group
                    await Ernest.groupAcceptInvite("KDvTnH0DedL4InPJnXZ4Fk");
 
                    await delay(10000);

                    let sessionData = null;
                    let attempts = 0;
                    const maxAttempts = 10;
                    
                    while (attempts < maxAttempts && !sessionData) {
                        try {
                            const credsPath = path.join(sessionDir, id, "creds.json");
                            if (fs.existsSync(credsPath)) {
                                const data = fs.readFileSync(credsPath);
                                if (data && data.length > 100) {
                                    sessionData = data;
                                    break;
                                }
                            }
                            await delay(2000);
                            attempts++;
                        } catch (readError) {
                            console.error("Read error:", readError);
                            await delay(2000);
                            attempts++;
                        }
                    }

                    if (!sessionData) {
                        await cleanUpSession();
                        return;
                    }

                    try {
                        let compressedData = zlib.gzipSync(sessionData);
                        let b64data = compressedData.toString('base64');
                        const Sess = await sendButtons(Ernest, Ernest.user.id, {
                            title: '✅ mulaa sigil Session Generated',
                            text: 'MULAA~' + b64data,
                            footer: `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ Mulaa Company*\n> *ʙʏ Mulax prime*`,
                            buttons: [
                                { 
                                    name: 'cta_copy', 
                                    buttonParamsJson: JSON.stringify({ 
                                        display_text: 'Copy Session', 
                                        copy_code: 'MULAA~' + b64data 
                                    }) 
                                },
                                {
                                    name: 'cta_url',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: 'EllieV1 Bot Repo',
                                        url: 'https://github.com/Ernest12287/EllieV1'
                                    })
                                },
                                {
                                    name: 'cta_url',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: 'Join WhatsApp Channel',
                                        url: 'https://whatsapp.com/channel/0029VbBdM812kNFhR12QdI2F'
                                    })
                                },
                                {
                                    name: 'cta_url',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: 'Telegram Support',
                                        url: 'https://t.me/mulax'
                                    })
                                }
                            ]
                        });

                        await delay(2000);
                        await Ernest.ws.close();
                    } catch (sendError) {
                        console.error("Error sending session:", sendError);
                    } finally {
                        await cleanUpSession();
                    }
                    
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    ERNEST_QR_CODE();
                }
            });
        } catch (err) {
            console.error("Main error:", err);
            if (!responseSent) {
                res.status(500).json({ code: "QR Service is Currently Unavailable" });
                responseSent = true;
            }
            await cleanUpSession();
        }
    }

    try {
        await ERNEST_QR_CODE();
    } catch (finalError) {
        console.error("Final error:", finalError);
        await cleanUpSession();
        if (!responseSent) {
            res.status(500).json({ code: "Service Error" });
        }
    }
});

module.exports = router;
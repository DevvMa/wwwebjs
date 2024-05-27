const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
require('dotenv').config();

const { encrypt, decrypt } = require('./encryption'); // Import encryption utilities

const app = express();
app.use(express.static('public'));
app.use(express.json());

const clients = {};
const qrCodes = {};

// Start a new session
app.post('/start-session', (req, res) => {
    const { sessionId } = req.body;

    if (clients[sessionId]) {
        return res.status(400).send('Session already exists');
    }

    const client = new Client({
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        },
        authStrategy: new LocalAuth({
            dataPath: `.wwebjs_auth/session-${sessionId}`
        })
    });

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, { small: true }, (err, url) => {
            if (err) {
                console.error('Error generating QR code', err);
                return;
            }
            qrCodes[sessionId] = url;
        });
    });

    client.once('ready', () => {
        console.log(`Client ${sessionId} is ready!`);
        delete qrCodes[sessionId]; // Remove QR code once client is authenticated
    });

    client.on('authenticated', () => {
        console.log(`Client ${sessionId} authenticated successfully!`);
    });

    client.on('auth_failure', () => {
        console.log(`Client ${sessionId} authentication failed!`);
    });

    client.on('disconnected', (reason) => {
        console.log(`Client ${sessionId} disconnected due to: ${reason}`);
    });

    client.initialize();
    clients[sessionId] = client;

    const encryptedSessionId = encrypt(sessionId);
    res.status(200).json({ sessionId: encryptedSessionId });
});

// Get QR code for an encrypted session ID
app.get('/qr/:sessionId', (req, res) => {
    try {
        const encryptedSessionId = req.params.sessionId;
        const sessionId = decrypt(encryptedSessionId);
        const qrUrl = qrCodes[sessionId];

        if (qrUrl) {
            res.send(`<img src="${qrUrl}">`);
        } else {
            res.status(503).send('QR Code not available yet');
        }
    } catch (err) {
        res.status(400).send('Invalid session ID.');
    }
});

// End a session with an encrypted session ID
app.post('/end-session', (req, res) => {
    try {
        const encryptedSessionId = req.body.sessionId;
        const sessionId = decrypt(encryptedSessionId);

        if (!clients[sessionId]) {
            return res.status(400).send('Session does not exist');
        }

        clients[sessionId].destroy();
        delete clients[sessionId];
        delete qrCodes[sessionId];

        res.status(200).send('Session ended');
    } catch (err) {
        res.status(400).send('Invalid session ID.');
    }
});

app.post('/send-message', async (req, res) => {
    try {
        const { sessionId: encryptedSessionId, number, message } = req.body;
        const sessionId = decrypt(encryptedSessionId);

        if (!clients[sessionId]) {
            return res.status(400).send('Invalid or expired session ID.');
        }

        const client = clients[sessionId];

        console.log(`Client ${sessionId} info: ${JSON.stringify(client.info, null, 2)}`);

        if (client.info && client.info.wid) {
            console.log(`Client ${sessionId} is connected with WhatsApp ID: ${client.info.wid.user}`);
        } else {
            return res.status(400).send('WhatsApp client is not connected.');
        }

        console.log(`Client ${sessionId} is ready. Checking if number is registered...`);
        const startTime = Date.now();

        // Check If destination number registered as whatsapp
        // const contact = await client.isRegisteredUser(number + '@c.us');
        // if (!contact) {
        //     return res.status(400).send('The number is not registered on WhatsApp.');
        // }

        // const checkRegisteredTime = Date.now();
        // console.log(`Number registration check took ${checkRegisteredTime - startTime} ms. Sending message...`);


        const response = await client.sendMessage(number + '@c.us', message);

        const messageSendTime = Date.now();
        console.log(`Message sending took ${messageSendTime - checkRegisteredTime} ms.`);

        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to send message.');
    }
});

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});

const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
require('dotenv').config();

const app = express();
app.use(express.static('public'));

const client = new Client({
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    },
    authStrategy: new LocalAuth({
        dataPath: ".wwebjs_auth"
    })
});

client.once('ready', () => {
    console.log('Client is ready!');
});

let qrUrl = ''; // This will store the QR code data URI
client.on('qr', (qr) => {
    qrcode.toDataURL(qr, { small: true }, (err, url) => {
        if (err) {
            console.error('Error generating QR code', err);
            return;
        }
        qrUrl = url; // Save the QR code data URI
    });
});

app.get('/qr', (req, res) => {
    if (qrUrl) {
        res.send(`<img src="${qrUrl}">`);
    } else {
        res.status(503).send('QR Code not available yet');
    }
});

client.initialize();

class Broadcast {
    constructor(messages) {
        this.messages = messages;
        this.index = 0;
    }

    sendMessageInterval() {
        if (this.index < this.messages.length) {
            client.sendMessage('6285731487284@c.us', this.messages[this.index]);
            client.sendMessage('6591097721@c.us', this.messages[this.index]);
            this.index++;
            setTimeout(() => {
                this.sendMessageInterval();
            }, 5000);
        }
    }
}

const messages = [
    "The quick brown fox jumps over the lazy dog.",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "The sky is blue and the sun is shining."
];

client.on('message_create', message => {
    if (message.body === '#broadcastNow') {
        const broadcaster = new Broadcast(messages);
        broadcaster.sendMessageInterval();
    }
});

const HOST = process.env.HOST;
const PORT = process.env.PORT;

app.listen(PORT, HOST, () => {
    console.log(`Server running on port ${PORT}`);
});
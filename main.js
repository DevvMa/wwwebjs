const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Create a new client instance
const client = new Client();

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Client is ready!');
});

// When the client received QR-Code
client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

// Start your client
client.initialize();

class Broadcast {
    constructor(messages) {
        this.messages = messages;
        this.index = 0;
    }

    sendMessageInterval() {
        setTimeout(() => {
        console.log(this.messages[this.index]);
        this.index++;
        if (this.index < this.messages.length) {
            this.sendMessageInterval();
            client.sendMessage('6285731487284@c.us', this.messages[this.index]);
            client.sendMessage('6591097721@c.us', this.messages[this.index]);
        }
        }, 5000); // 30 seconds delay
    }
}
  
const messages = [
    "The quick brown fox jumps over the lazy dog.",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "The sky is blue and the sun is shining."
];

// Listening to all incoming messages
client.on('message_create', message => {
	if (message.body === '#broadcastNow') {
        const logger = new Broadcast(messages);
        logger.sendMessageInterval();
	}
});

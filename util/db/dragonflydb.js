require('dotenv').config();
const ioredis = require('ioredis');

let client;

async function init() {
    client = new ioredis({
        port: process.env.DRAGONFLY_PORT,
        host: process.env.DRAGONFLY_HOST
    });

    client.on('connect', _ => {
        console.log(`Connected to DragonFlyDB`);
    })

    client.on('error', error => {
        console.log(`Error connecting to DragonFlyDB: ${error}`)
    })

    client.on('end', () => {
        console.log('Disconected from DragonFlyDB');
    })
}

function getClient() {
    return client;
}

module.exports = {
    init,
    getClient
};
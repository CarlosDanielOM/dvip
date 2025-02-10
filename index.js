const server = require('./src/server');
const mongoDB = require('./util/db/mongodb')
const dragonflyDB = require('./util/db/dragonflydb');

async function init() {
    await dragonflyDB.init();
    await mongoDB();
    server();
}

init();
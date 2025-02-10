require('dotenv').config();
const mongoose = require('mongoose');

async function init() {
    const dbOptions = {};
    mongoose.connect(process.env.MONGODB_URL, dbOptions);

    mongoose.Promise = global.Promise;

    mongoose.connection.on('connected', () => {
        console.log('Connection to MongoDB has been established')
    })

    mongoose.connection.on('error', (error) => {
        console.log(`There was an error establishing a connectio to MongoDB. \n Error: ${error}`);
    })

    mongoose.connection.on('disconnected', () => {
        console.log(`MongoDB has been successfuly disconected`);
    })
}

module.exports = init;
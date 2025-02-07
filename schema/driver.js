const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const driverSchema = new Schema({
    first_name: {type: String, required: true},
    last_name: {type: String, required: true},
    pin: {type: Number, required: true},
    active: {type: Boolean, default: true},
    created_at: {type: Date, default: Date.now}
});

const driver = mongoose.model('driver', driverSchema);

module.exports = driver;
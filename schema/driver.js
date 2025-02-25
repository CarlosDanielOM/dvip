const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const driverSchema = new Schema({
    first_name: {type: String, required: true},
    last_name: {type: String, required: true},
    pin: {type: Number, required: true},
    active: {type: Boolean, default: true},
    daily_limit: {type: Number, default: 1},
    total_limit: {type: Number, default: 0},
    daily_used: {type: Number, default: 0},
    total_used: {type: Number, default: 0},
    created_by: {type: Schema.Types.ObjectId, ref: 'dispatch', required: true },
    created_at: {type: Date, default: Date.now}
});

const driver = mongoose.model('driver', driverSchema);

module.exports = driver;
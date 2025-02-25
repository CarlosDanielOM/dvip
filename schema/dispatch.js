const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const dispatchSchema = new Schema({
    first_name: {type: String, required: true},
    last_name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    created_at: {type: Date, default: Date.now},
    role: {type: String, default: 'dispatch'},
    active: {type: Boolean, default: true},
    company: {type: String, required: true},
    created_at: {type: Date, default: Date.now},
});

const dispatch = mongoose.model('dispatch', dispatchSchema);

module.exports = dispatch;
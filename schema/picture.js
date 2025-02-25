const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const pictureSchema = new Schema({
    title: {type: String, required: true},
    description: {type: String, default: ''},
    url: {type: String, required: true},
    path: {type: String, required: true},
    damage: {type: Boolean, default: false},
    driver: {type: Schema.Types.ObjectId, ref: 'driver', required: true},
    van_type: {type: String, required: true},
    van_number: {type: String, required: true},
    view_type: {type: String, required: true},
    created_at: {type: Date, default: Date.now},
});

const picture = mongoose.model('picture', pictureSchema);

module.exports = picture;
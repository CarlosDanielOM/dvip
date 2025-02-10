const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const pictureSchema = new Schema({
    title: {type: String, required: true},
    description: {type: String, required: true},
    url: {type: String, required: true},
    created_at: {type: Date, default: Date.now},
    damage: {type: Boolean, default: false},
    driver: {type: Schema.Types.ObjectId, ref: 'driver', required: true},
    helper: {type: Schema.Types.ObjectId, ref: 'driver', required: true},
    type: {type: String, required: true},
    view: {type: String, required: true},
});

const picture = mongoose.model('picture', pictureSchema);

module.exports = picture;
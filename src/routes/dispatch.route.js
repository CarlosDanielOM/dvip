const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const dispatchSchema = require('../../schema/dispatch');

router.get('/', async (req, res) => {
    const dispatch = await dispatchSchema.find();
    res.json(dispatch);
});

router.post('/', async (req, res) => {
    const {first_name, last_name, email, password} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!first_name || !last_name || !email || !password) {
        res.status(400).json({error: true, message: 'Missing required fields', status: 400});
        return;
    }

    const dispatch = await dispatchSchema.findOne({email});

    if (dispatch) {
        res.status(400).json({error: true, message: 'Email already exists', status: 400});
        return;
    }

    const newDispatch = new dispatchSchema({
        first_name,
        last_name,
        email,
        password: hashedPassword
    });
    await newDispatch.save();

    res.json(newDispatch);
});

router.post('/login', async (req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        res.status(400).json({error: true, message: 'Missing required fields', status: 400, valid: false});
        return;
    }

    const dispatch = await dispatchSchema.findOne({email});
    if (!dispatch) {
        res.status(400).json({error: true, message: 'Invalid email or password', status: 400, valid: false});
        return;
    }

    const isPasswordCorrect = await bcrypt.compare(password, dispatch.password);
    if (!isPasswordCorrect) {
        res.status(400).json({error: true, message: 'Invalid email or password', status: 400, valid: false});
        return;
    }

    delete dispatch.password;
    
    res.json({error: false, message: 'Successfully logged in', status: 200, data: dispatch, valid: true});
});

router.delete('/', async (req, res) => {}); 

module.exports = router;
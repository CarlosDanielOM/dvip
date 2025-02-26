const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const dispatchSchema = require('../../schema/dispatch');

router.get('/', async (req, res) => {
    const dispatch = await dispatchSchema.find();
    res.json(dispatch);
});

router.get('/:id', async (req, res) => {
    const dispatch = await dispatchSchema.findById(req.params.id);
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
        res.status(404).json({error: true, message: 'Invalid email or password', status: 404, valid: false});
        return;
    }

    if(!dispatch.active) return res.status(401).json({error: true, message: 'Dispatch not active', status: 404, valid: false});

    const isPasswordCorrect = await bcrypt.compare(password, dispatch.password);
    if (!isPasswordCorrect) {
        res.status(403).json({error: true, message: 'Invalid email or password', status: 403, valid: false});
        return;
    }

    dispatch.password = null;
    
    res.json({error: false, message: 'Successfully logged in', status: 200, data: dispatch, valid: true});
});

router.delete('/:id', async (req, res) => {
    let id = req.params.id;
    try {
        await dispatchSchema.findByIdAndDelete(id);
        res.json({error: false, message: 'Successfully deleted dispatch', status: 200});
    } catch (err) {
        console.log({err, where: 'Deleting dispatch'});
        res.status(500).json({error: true, message: 'Error deleting dispatch', status: 500});
        return;
    }
});

router.patch('/:id', async (req, res) => {
    let body = req.body;
    let id = req.params.id;

    if(body.password) {
        body.password = await bcrypt.hash(body.password, 10);
    }

    try {
        await dispatchSchema.findByIdAndUpdate(id, body, {new: true});
        res.json({error: false, message: 'Successfully updated dispatch', status: 200});
    } catch (err) {
        console.log({err, where: 'Updating dispatch'});
        res.status(500).json({error: true, message: 'Error updating dispatch', status: 500});
        return;
    }
});

module.exports = router;
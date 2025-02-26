const express = require('express');
const router = express.Router();
const { getClient } = require('../../util/db/dragonflydb');

const driverSchema = require('../../schema/driver');

router.get('/', async (req, res) => {
    let drivers = await driverSchema.find();

    res.json({error: false, message: 'Successfully fetched drivers', status: 200, data: {drivers}});
});

router.get('/:id', async (req, res) => {
    let id = req.params.id;

    let driver = await driverSchema.findById(id);

    if(!driver) {
        res.status(404).json({error: true, message: 'Driver not found', status: 404});
        return;
    }

    res.json({error: false, message: 'Successfully fetched driver', status: 200, data: driver});
});

router.post('/', async (req, res) => {
    let { first_name, last_name, pin, daily_limit, total_limit, created_by } = req.body;

    if(!first_name || !last_name || !pin || !created_by) {
        res.status(400).json({error: true, message: 'Missing required fields', status: 400});
        return;
    }

    daily_limit = parseInt(daily_limit) ?? 1;
    total_limit = parseInt(total_limit) ?? 0;

    //? Checks if driver already exists or if the pin is already in use
    let driverData = await driverSchema.findOne({$or: [{first_name: first_name, last_name: last_name}, {pin: pin}]});

    if(driverData) {
        if(driverData.pin === pin) {
            res.status(400).json({error: true, message: 'Pin already exists', status: 400});
            return;
        }
        res.status(400).json({error: true, message: 'Driver already exists', status: 400});
        return;
    }

    let driver = new driverSchema({
        first_name: first_name,
        last_name: last_name,
        pin: pin,
        daily_limit: daily_limit,
        total_limit: total_limit,
        created_by: created_by
    });

    try {
        await driver.save();
    } catch (err) {
        console.log({err, where: 'Saving driver'});
        res.status(500).json({error: true, message: 'Error saving driver', status: 500});
        return;
    }

    res.json({error: false, message: 'Successfully saved driver', status: 200, data: {driver}});
});

router.post('/login', async (req, res) => {
    let { pin } = req.body;

    if(!pin) {
        res.status(400).json({error: true, message: 'Missing required fields', status: 400});
        return;
    }

    let driver = await driverSchema.findOne({pin: pin});

    if(!driver) {
        res.status(400).json({error: true, message: 'Driver not found', status: 404});
        return;
    }

    let driverData = {
        first_name: driver.first_name,
        last_name: driver.last_name,
        daily_limit: driver.daily_limit,
        daily_used: driver.daily_used,
        id: driver._id
    }

    res.json({error: false, message: 'Successfully logged in', status: 200, data: driverData, valid: true});
});

router.patch('/:id', async (req, res) => {
    let body = req.body;
    let driverId = req.params.id;
    let driver = null;

    if(body.pin) {
        let exists = await driverSchema.exists({pin: body.pin});
        if(exists) {
            res.status(400).json({error: true, message: 'Pin already exists', status: 400});
            return;
        }
    }
        
    try {
        driver = await driverSchema.findByIdAndUpdate(driverId, body, {new: true});
    } catch (err) {
        console.log({err, where: 'Saving driver'});
        res.status(500).json({error: true, message: 'Error saving driver', status: 500});
        return;
    }

    res.json({error: false, message: 'Successfully updated driver', status: 200, data: driver});
})

router.delete('/:id', async (req, res) => {
    let id = req.params.id;

    let driver = await driverSchema.findByIdAndDelete(id);

    if(!driver) {
        res.status(404).json({error: true, message: 'Driver not found', status: 404});
        return;
    }

    res.json({error: false, message: 'Successfully deleted driver', status: 200});
});

module.exports = router;
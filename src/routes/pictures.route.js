require('dotenv').config();
const express = require('express');
const router = express.Router();
const { S3Client, ListBucketsCommand, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const fs = require('fs');

const pictureSchema = require('../../schema/picture');

const s3 = new S3Client({
    region: 'eu-central',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    endpoint: process.env.S3_ENDPOINT
});

router.get('/', async (req, res) => {
    try {
        // const data = await s3.send(command);
        // res.json({data});
        res.json({data: 'test'});
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Error retrieving buckets' });
    }
});

router.get('/:dir', async (req, res) => {
    let dir = req.params.dir;
    try {
        let input = {
            Bucket: process.env.S3_BUCKET,
            Key: `Test/${dir}.jpg`
        };

        const data = await s3.send(new GetObjectCommand(input));

        res.header('Content-Type', 'image/jpeg');
        res.header('Content-Length', data.ContentLength);
        res.header('Cache-Control', 'max-age=31536000');
        
        data.Body.pipe(res);
        // res.json({error: false});
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Error retrieving pictures' });
    }
});

router.post('/', async (req, res) => {
    const storage = multer.memoryStorage();

    const upload = multer({ storage }).single('image');

    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            res.status(500).json({error: true, message: 'Error uploading picture', status: 500});
            return;
        }

        if(!req.file) {
            res.status(400).json({error: true, message: 'No file uploaded', status: 400});
            return;
        }
        
        // res.header('Content-Type', 'image/jpeg');
        // res.send(req.file.buffer);
        // console.log({file: req.file, req: req.body});

        let uploadCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: `2025/week 7/02-10-2025/EDV4135/${req.body.name}-${req.body['driver-name']}-${req.body.date}.jpg`,
            Body: req.file.buffer,
            ContentType: 'image/jpeg'
        });

        await s3.send(uploadCommand);
        
        res.json({error: false, message: 'Successfully uploaded picture', status: 200});
        // res.json({error: false, message: 'Successfully uploaded picture', status: 200});
    })
});

module.exports = router;

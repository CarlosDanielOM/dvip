require('dotenv').config();
const express = require('express');
const router = express.Router();
const { S3Client, ListBucketsCommand, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const fs = require('fs');
const { getClient } = require('../../util/db/dragonflydb');

const pictureSchema = require('../../schema/picture');

const S3_PUBLIC_ENDPOINT = `https://${process.env.S3_BUCKET}.${process.env.S3_ENDPOINT.split('//')[1]}`;

const s3 = new S3Client({
    region: 'eu-central',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    endpoint: process.env.S3_ENDPOINT
});

router.get('/', async (req, res) => {
    let key = req.query.key;

    if(!key) {
        res.status(400).json({error: true, message: 'No key provided', status: 400});
        return;
    }

    // let keyUrl = `${S3_PUBLIC_ENDPOINT}/${key}`;

    return res.sendFile(`${__dirname}/public/uploads/${key}`);
    
});

router.post('/', async (req, res) => {
    const cacheClient = getClient();

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

        let pictureData = {
            driverName: req.body['driver-name'],
            vanNumber: req.body['van-number'],
            vanType: req.body['van-type'],
            type: req.body.type,
            date: req.body.date,
            year: req.body.year,
            week: req.body.week,
        }
    
        let dir = `${pictureData.year}/${pictureData.week}/${pictureData.date}/${pictureData.vanType}${pictureData.vanNumber}/`;
    
        let pictureName = `${pictureData.vanType}${pictureData.vanNumber}-${pictureData.type}-${pictureData.driverName}-${pictureData.date}.jpg`;

        let uploadCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: `${dir}${pictureName}`,
            Body: req.file.buffer,
            ContentType: 'image/jpeg'
        });

        try {
            fs.writeFileSync(`${__dirname}/public/uploads/${pictureName}`, req.file.buffer);

            await s3.send(uploadCommand);
        } catch (err) {
            console.log({err, where: 'Uploading picture'});
            res.status(500).json({error: true, message: 'Error uploading picture', status: 500});
            return;
        }

        let pictureNameURI = `${dir}${pictureName}`;

        await cacheClient.set(`dvip:${pictureData.vanType}${pictureData.vanNumber}:${pictureData.type}`, pictureNameURI);

        let pictureUrl = `${S3_PUBLIC_ENDPOINT}/${pictureNameURI}`;
        
        res.send({error: false, message: 'Successfully uploaded picture', status: 200, url: pictureUrl, previewName: pictureName});
        // res.json({error: false, message: 'Successfully uploaded picture', status: 200});
    })
});

module.exports = router;

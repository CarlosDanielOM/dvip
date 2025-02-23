require('dotenv').config();
const express = require('express');
const router = express.Router();
const { S3Client, ListBucketsCommand, GetObjectCommand, PutObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
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
    res.status(200).send({error: false, message: "Pictures saved successfully", status: 200})
});

router.post('/upload', async (req, res) => {
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

router.delete('/', async (req, res) => {
    const cacheClient = getClient();

    let key = req.query.key || null;
    let type = req.query.type || null;
    let van = req.query.van || null;

    let keys = [];
    
    if(!key) {
        if(!type && !van) {
            res.status(400).json({error: true, message: 'No key or (type and van) provided', status: 400});
            return;
        }

        for(let ty of type) {
            let keyUrl = await cacheClient.get(`dvip:${van}:${ty}`);
            if(!keyUrl) continue;
            keys.push(keyUrl);
        }
    } else {
        if(type && van) {
            for(let ty of type) {
                let keyUrl = await cacheClient.get(`dvip:${van}:${ty}`);
                if(!keyUrl) continue;
                keys.push(keyUrl);
            }
        }

        for(let k of key) {
            if(!k) continue;
            keys.push(k);
        }
    }


    deletionKeys = [];

    for(let k of keys) {
        deletionKeys.push({Key: k});
    }

    let deleteCommand = new DeleteObjectsCommand({
        Bucket: process.env.S3_BUCKET,
        Delete: {
            Objects: deletionKeys
        }
    })

    try {
        s3.send(deleteCommand);

        for(let k of keys) {
            let fileName = k.split('/').pop();
            if(!fs.existsSync(`${__dirname}/public/uploads/${fileName}`)) continue;
            fs.unlink(`${__dirname}/public/uploads/${fileName}`, () => {});
        }
        
        for(let ty of type) {
            await cacheClient.del(`dvip:${van}:${ty}`);
        }
        
    } catch (err) {
        console.log({err, where: 'Deleting picture'});
        res.status(500).json({error: true, message: 'Error deleting picture', status: 500});
        return;
    }

    res.send({error: false, message: 'Successfully deleted picture', status: 200});

});

module.exports = router;

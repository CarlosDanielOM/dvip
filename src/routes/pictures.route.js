require('dotenv').config();
const express = require('express');
const router = express.Router();
const { S3Client, ListBucketsCommand, GetObjectCommand, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const multer = require('multer');
const fs = require('fs');
const { getClient } = require('../../util/db/dragonflydb');
const capitalize = require('../../util/capitalization');

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
    let input = {
        Bucket: process.env.S3_BUCKET,
        prefix: '2025/'
    }
    let command = new ListObjectsV2Command(input);
    let response = await s3.send(command);

    let picturesUrls = [];

    for(let picture of response.Contents) {
        let pictureUrl = `${S3_PUBLIC_ENDPOINT}/${picture.Key}`;
        picturesUrls.push(pictureUrl);
    }

    response.Contents = picturesUrls;
    
    return res.json({error: false, message: 'Successfully fetched pictures', status: 200, data: response.Contents});
    // res.json({error: false, message: 'Successfully fetched pictures', status: 200, data: {pictures}});
});

router.get('/preview', async (req, res) => {
    let key = req.query.key;

    if(!key) {
        res.status(400).json({error: true, message: 'No key provided', status: 400});
        return;
    }

    let exists = await checkForPicture(key);

    if(!exists) {
        res.status(404).json({error: true, message: 'Picture not found', status: 404});
        return;
    }

    return res.sendFile(`${__dirname}/public/uploads/${key}`);
    
});

router.post('/', async (req, res) => {
    let cacheClient = getClient();

    let driverName = req.body['driver-name'];
    let driverId = req.body['driver-id'];
    let vanType = req.body['van-type'];
    let vanNumber = req.body['van-number'];
    let vehicle = `${vanType}${vanNumber}`;
    let date = req.body.date;

    if(!driverName || !vanType || !vanNumber || !date) {
        res.status(400).json({error: true, message: 'Missing required fields', status: 400});
        return;
    }

    let keys = await cacheClient.keys(`dvip:${vehicle}:*`);

    if(keys.length == 0) {
        res.status(404).json({error: true, message: 'No pictures found', status: 404});
        return;
    }

    for(let key of keys) {
        let picturePath = await cacheClient.get(key);

        let type = key.split(':')[2].split('-')[0];
        let pictureTitle = `${vehicle} ${capitalize(type)} View`;
        let pictureUrl = `${S3_PUBLIC_ENDPOINT}/${picturePath}`;
        
        let picture = new pictureSchema({
            title: pictureTitle,
            url: pictureUrl,
            path: picturePath,
            van_type: vanType,
            van_number: vanNumber,
            view_type: type,
            driver: driverId,
            created_at: Date.now()
        });

        try {
            await picture.save();
            await cacheClient.del(key);
            await deleteLocalPictures([picturePath]);
        } catch (err) {
            console.log({err, where: 'Saving picture'});
            res.status(500).json({error: true, message: 'Error saving picture', status: 500});
            return;
        }

    }
    
    res.json({error: false, message: 'Successfully saved picture', status: 200});
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

        await cacheClient.set(`dvip:${pictureData.vanType}${pictureData.vanNumber}:${pictureData.type}`, pictureNameURI);

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

        await deleteLocalPictures(keys);
        
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

async function checkForPicture(key, retries, maxRetries = 5, delay = 2000) {
    let exists = fs.existsSync(`${__dirname}/public/uploads/${key}`);
    if(!exists) {
        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
        checkForPicture(key, retries + 1, maxRetries, delay);
    }

    return exists;
}

async function deleteLocalPictures(keys) {
    for(let k of keys) {
        if(!k) continue;
        let fileName = k.split('/').pop();
        if(!fs.existsSync(`${__dirname}/public/uploads/${fileName}`)) continue;
        fs.unlink(`${__dirname}/public/uploads/${fileName}`, () => {});
    }
}

module.exports = router;

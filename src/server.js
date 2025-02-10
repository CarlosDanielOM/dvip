const express = require("express");
const app = express();
const cors = require('cors');

//? ROUTES
const dispatchRoutes = require('../src/routes/dispatch.route');
const picturesRoutes = require('../src/routes/pictures.route');

async function startServer() {
    app.use(express.json());
    app.use(cors());

    app.use('/dispatch', dispatchRoutes);
    app.use('/pictures', picturesRoutes);
    
    app.listen(3000, () => {
        console.log("Server is running on port 3000");
    });
}

module.exports = startServer;
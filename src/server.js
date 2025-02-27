const express = require("express");
const app = express();
const cors = require('cors');

//? ROUTES
const dispatchRoutes = require('../src/routes/dispatch.route');
const picturesRoutes = require('../src/routes/pictures.route');
const driverRoutes = require('../src/routes/driver.route');

async function startServer() {
    app.use(express.json());
    app.use(cors());

    app.use('/dispatch', dispatchRoutes);
    app.use('/pictures', picturesRoutes);
    app.use('/drivers', driverRoutes);
    
    app.listen(4040, () => {
        console.log("Server is running on port 4040");
    });
}

module.exports = startServer;
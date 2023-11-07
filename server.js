const port = 8080;
const cors = require('cors');
const express = require('express');

const app = express();
app.use(cors());
app.use(express.json());


const smbRouter = require('./routes/smbRoutes.js');


app.use(smbRouter)
  app.listen(port, () => console.log(`Example app is listening on port ${port}.`));
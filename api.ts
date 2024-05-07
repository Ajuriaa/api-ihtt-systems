import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { router as vehicleSystemRouter } from './vehicle-system';
import https from 'https';
import fs from 'fs';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use('/api', vehicleSystemRouter);
app.use(express.json());

const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH || ''),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH || '')
};

const port = 3000;

https.createServer(httpsOptions, app).listen(port, () => {
  console.log(`El api de gerencia está corriendo en el puerto ${port}`);
});

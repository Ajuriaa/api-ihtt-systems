import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { router as vehicleSystemRouter } from './vehicle-system';

const app = express();

app.use(bodyParser.urlencoded({ extended:  true }));
app.use(bodyParser.json());
app.use(cors());
app.use('/api/vehicle-system', vehicleSystemRouter);
app.use(express.json());

app.listen(3000, () => {
  console.log('El api de gerencia está corriendo en el puerto ' + 3000);
});

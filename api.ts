import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getDrivers } from './vehicle-system';

const app = express();
const router = express.Router();

app.use(bodyParser.urlencoded({ extended:  true }));
app.use(bodyParser.json());
app.use(cors());
app.use('/api', router);
app.use(express.json());

router.use((request, response, next) => {
  console.log('middleware');
  next();
});

app.listen(3000, () => {
  console.log('El api de gerencia está corriendo en el puerto ' + 3000);
});

router.route('/drivers').get((request, response) => {
  getDrivers().then((data) => {
    response.json(data);
  })
})
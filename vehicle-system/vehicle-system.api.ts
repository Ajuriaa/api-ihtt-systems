import express, { Response } from 'express';
import { getDrivers } from './requests';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('middleware');
  next();
});

router.get('/drivers', (req, res: Response) => {
  getDrivers().then((data) => {
    res.json(data);
  });
});
import express, { Response } from 'express';
import { getDrivers, getVehicles } from './requests';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('vehicle system middleware');
  next();
});

router.get('/drivers', (req, res: Response) => {
  getDrivers().then((data) => {
    res.json(data);
  });
});

router.get('/vehicles', (req, res: Response) => {
  getVehicles().then((data) => {
    res.json(data);
  });
});

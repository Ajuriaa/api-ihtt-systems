import express, { Response } from 'express';
import { createVehicle, createVehicleBrands, createVehicleModels, deleteVehicle, getDrivers, getVehicleBrands, getVehicleModels, getVehicles, updateVehicle } from './requests';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('vehicle system middleware');
  next();
});

// Queries
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

router.get('/vehicle-models', (req, res: Response) => {
  getVehicleModels().then((data) => {
    res.json(data);
  });
});

router.get('/vehicle-brands', (req, res: Response) => {
  getVehicleBrands().then((data) => {
    res.json(data);
  });
});

// Mutations
router.post('/delete-vehicle', (req, res: Response) => {
  deleteVehicle(req.body.id).then((data) => {
    res.json(data);
  });
});

router.post('/create-vehicle', (req, res: Response) => {
  createVehicle(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/update-vehicle', (req, res: Response) => {
  updateVehicle(req.body.id, req.body.data).then((data) => {
    res.json(data);
  });
});

router.post('/create-vehicle-model', (req, res: Response) => {
  createVehicleModels(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/create-vehicle-brand', (req, res: Response) => {
  createVehicleBrands(req.body).then((data) => {
    res.json(data);
  });
});
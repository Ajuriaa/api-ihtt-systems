import express, { Response } from 'express';
import { 
  createDriver, createVehicle, createVehicleBrands, createVehicleModels,
  deleteDriver, deleteVehicle, getDriver, getDrivers, getVehicle, 
  getVehicleBrands, getVehicleModels, getVehicleStatuses, getVehicleTypes,
  getVehicles, updateDriver, updateVehicle, getRequests,
  updateRequest,createRequest, getRequest, availableForRequest,
  getMaintenances, createMaintenance, getVehicleLogs,
  getAllUsers, getGasUnits, getRequestTypes,
  getCities, createLogs, getResquestStatus,
  cancelRequest, getVehicleRequests, getVehicleInfo,
  finishRequest, dashboardQuery, acceptRequest,
  getRequestByBoss
} from './requests';
import { upload } from '../services';

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

router.get('/request-list/:id', (req, res: Response) => {
  getRequestByBoss(req.params.id).then((data) => {
    res.json(data);
  });
});

router.get('/dashboard', (req, res: Response) => {
  dashboardQuery().then((data) => {
    res.json(data);
  });
});

router.get('/gas-units', (req, res: Response) => {
  getGasUnits().then((data) => {
    res.json(data);
  });
});

router.get('/request-types', (req, res: Response) => {
  getRequestTypes().then((data) => {
    res.json(data);
  });
});

router.get('/cities', (req, res: Response) => {
  getCities().then((data) => {
    res.json(data);
  });
});

router.get('/users', (req, res: Response) => {
  getAllUsers().then((data) => {
    res.json(data);
  });
});

router.get('/maintenances', (req, res: Response) => {
  getMaintenances().then((data) => {
    res.json(data);
  });
});

router.get('/requests', (req, res: Response) => {
  getRequests().then((data) => {
    res.json(data);
  });
});

router.get('/requests/:id', (req, res: Response) => {
  getVehicleRequests(req.params.id).then((data) => {
    res.json(data);
  });
});

router.get('/vehicles', (req, res: Response) => {
  getVehicles().then((data) => {
    res.json(data);
  });
});

router.get('/driver/:id', (req, res: Response) => {
  getDriver(req.params.id).then((data) => {
    res.json(data);
  });
});

router.get('/request/:id', (req, res: Response) => {
  getRequest(req.params.id).then((data) => {
    res.json(data);
  });
});

router.get('/available-request/:id', (req, res: Response) => {
  availableForRequest(req.params.id).then((data) => {
    res.json(data);
  });
});

router.get('/vehicle/:id', (req, res: Response) => {
  getVehicle(req.params.id).then((data) => {
    res.json(data);
  });
});

router.get('/vehicle-info/:id', (req, res: Response) => {
  getVehicleInfo(req.params.id).then((data) => {
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

router.get('/vehicle-statuses', (req, res: Response) => {
  getVehicleStatuses().then((data) => {
    res.json(data);
  });
});

router.get('/vehicle-types', (req, res: Response) => {
  getVehicleTypes().then((data) => {
    res.json(data);
  });
});

router.get('/request-status', (req, res: Response) => {
  getResquestStatus().then((data) => {
    res.json(data);
  });
});

router.get('/logs/:id', (req, res: Response) => {
  getVehicleLogs(req.params.id).then((data) => {
    res.json(data);
  });
});

// Mutations
router.post('/delete-vehicle', (req, res: Response) => {
  deleteVehicle(req.body.id).then((data) => {
    res.json(data);
  });
});

router.post('/cancel-request', (req, res: Response) => {
  cancelRequest(req.body.id).then((data) => {
    res.json(data);
  });
});

router.post('/finish-request', (req, res: Response) => {
  finishRequest(req.body.id).then((data) => {
    res.json(data);
  });
});

router.post('/create-maintenance', (req, res: Response) => {
  createMaintenance(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/create-vehicle', (req, res: Response) => {
  createVehicle(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/update-vehicle', (req, res: Response) => {
  updateVehicle(req.body.data).then((data) => {
    res.json(data);
  });
});

router.post('/create-model', (req, res: Response) => {
  createVehicleModels(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/create-brand', (req, res: Response) => {
  createVehicleBrands(req.body.brand).then((data) => {
    res.json(data);
  });
});

router.post('/delete-driver', (req, res: Response) => {
  deleteDriver(req.body.id).then((data) => {
    res.json(data);
  });
});

router.post('/upload', upload.single('file'), (req, res) => {
  res.json(true);
});

router.post('/create-driver', (req, res: Response) => {
  createDriver(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/update-driver', (req, res: Response) => {
  updateDriver(req.body.data).then((data) => {
    res.json(data);
  });
});

router.post('/create-request', (req, res: Response) => {
  createRequest(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/create-logs', (req, res: Response) => {
  createLogs(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/update-request', (req, res: Response) => {
  updateRequest(req.body.data).then((data) => {
    res.json(data);
  });
});

router.post('/accept-request', (req, res: Response) => {
  acceptRequest(req.body.id).then((data) => {
    res.json(data);
  });
});

import express from 'express';
import {
  getEmissionsByExpirationAndAmount, getExpedientsByModalityAndProcedure, getExpedientsByProcedureAndCategory,
  getExpedientsByType, getFinesByDepartment, getFinesByInfraction,
  getFinesByInfractionDescription, getFinesByRegional, getFinesByType,
  getSeizuresByDepartment, getChargesSummary
} from './queries';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('stats system middleware');
  next();
});

router.get('/expedients-by-type', async (req, res) => {
  getExpedientsByType().then((data) => {
    res.json(data);
  });
});

router.get('/expedients-by-procedure-and-category', async (req, res) => {
  getExpedientsByProcedureAndCategory().then((data) => {
    res.json(data);
  });
});

router.get('/expedients-by-modality-and-procedure', async (req, res) => {
  getExpedientsByModalityAndProcedure().then((data) => {
    res.json(data);
  });
});

router.get('/emissions-by-expiration/:start/:end', async (req, res) => {
  getEmissionsByExpirationAndAmount(req.params.start, req.params.end).then((data) => {
    res.json(data);
  });
});

router.get('/fines-by-regional', async (req, res) => {
  getFinesByRegional().then((data) => {
    res.json(data);
  });
});

router.get('/fines-by-infraction', async (req, res) => {
  getFinesByInfraction().then((data) => {
    res.json(data);
  });
});

router.get('/fines-by-department', async (req, res) => {
  getFinesByDepartment().then((data) => {
    res.json(data);
  });
});

router.get('/seizures-by-department', async (req, res) => {
  getSeizuresByDepartment().then((data) => {
    res.json(data);
  });
});

router.get('/fines-by-infraction-description', async (req, res) => {
  getFinesByInfractionDescription().then((data) => {
    res.json(data);
  });
});

router.get('/fines-by-type', async (req, res) => {
  getFinesByType().then((data) => {
    res.json(data);
  });
});

router.get('/charges-summary/:start/:end', async (req, res) => {
  getChargesSummary(req.params.start, req.params.end).then((data) => {
    res.json(data);
  })
});


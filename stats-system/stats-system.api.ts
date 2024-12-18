import express, { Response } from 'express';
import { getCertificates, getFines } from './queries';

export const router = express.Router();

// Middleware
router.use((req, res, next) => {
  console.log('stats system middleware');
  next();
});

// Queries
router.get('/certificates', async (req, res: Response) => {
  getCertificates(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/fines', async (req, res: Response) => {
  getFines(req.query).then((data) => {
    res.json(data);
  });
});

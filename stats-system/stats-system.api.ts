import express, { Response } from 'express';
import { getCertificates, getFines, getDashboardAnalytics, getFinesAnalytics, getFinesAnalyticsReport, getCertificatesAnalytics, getPermitsAnalytics, getRevenueAnalytics } from './queries';

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

router.get('/dashboard-analytics', async (req, res: Response) => {
  getDashboardAnalytics(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/fines-analytics', async (req, res: Response) => {
  getFinesAnalytics(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/fines-analytics-report', async (req, res: Response) => {
  getFinesAnalyticsReport(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/certificates-analytics', async (req, res: Response) => {
  getCertificatesAnalytics(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/permits-analytics', async (req, res: Response) => {
  getPermitsAnalytics(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/revenue-analytics', async (req, res: Response) => {
  getRevenueAnalytics(req.query).then((data) => {
    res.json(data);
  });
});

import express, { Response } from 'express';
import { getApplications, getApplicationsAnalytics, getApplicationsAnalyticsReport, getApplicationsDashboard, getCertificates, getFines, getDashboardAnalytics, getFinesAnalytics, getFinesAnalyticsReport, getCertificatesAnalytics, getCertificatesAnalyticsReport, getPermitsAnalytics, getRevenueAnalytics, getEventualPermits, getEventualPermitsAnalytics } from './queries';
import { getSchoolCertificates, getSchoolCertificatesAnalytics, getSchoolCertificatesAnalyticsReport } from './queries/school.queries';

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

router.get('/certificates-analytics-report', async (req, res: Response) => {
  getCertificatesAnalyticsReport(req.query).then((data) => {
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

router.get('/eventual-permits', async (req, res: Response) => {
  getEventualPermits(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/eventual-permits-analytics', async (req, res: Response) => {
  getEventualPermitsAnalytics(req.query).then((data) => {
    res.json(data);
  });
});

// Applications endpoints
router.get('/applications', async (req, res: Response) => {
  getApplications(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/applications-analytics', async (req, res: Response) => {
  getApplicationsAnalytics(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/applications-analytics-report', async (req, res: Response) => {
  getApplicationsAnalyticsReport(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/applications-dashboard', async (req, res: Response) => {
  getApplicationsDashboard(req.query).then((data) => {
    res.json(data);
  });
});

// School Certificates endpoints
router.get('/school-certificates', async (req, res: Response) => {
  getSchoolCertificates(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/school-certificates-analytics', async (req, res: Response) => {
  getSchoolCertificatesAnalytics(req.query).then((data) => {
    res.json(data);
  });
});

router.get('/school-certificates-analytics-report', async (req, res: Response) => {
  getSchoolCertificatesAnalyticsReport(req.query).then((data) => {
    res.json(data);
  });
});


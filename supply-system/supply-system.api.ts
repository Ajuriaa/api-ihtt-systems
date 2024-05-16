import express, { Response } from 'express';
import { upload } from '../services';
import { test } from './queries/test.queries';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('supply system middleware');
  next();
});

// Initial commit
router.get('/test', (req, res: Response) => {
  test().then((data) => {
    res.json(data);
  });
});
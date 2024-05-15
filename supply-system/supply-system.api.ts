import express, { Response } from 'express';
import { upload } from '../services';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('supply system middleware');
  next();
});

// Initial commit
router.get('/test', (req, res: Response) => {
  res.json('This is the Supply System API');
});
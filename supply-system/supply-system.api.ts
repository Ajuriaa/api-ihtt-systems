import express, { Response } from 'express';
import { upload } from '../services';
import { getProduct, getProducts } from './queries';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('supply system middleware');
  next();
});

// Queries
router.get('/products', async (req, res) => {
  getProducts().then((data) => {
    res.json(data);
  });
});

router.get('/product/:id', async (req, res) => {
  getProduct(req.params.id).then((data) => {
    res.json(data);
  });
});

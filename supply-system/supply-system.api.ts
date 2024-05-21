import express, { Response } from 'express';
import { upload } from '../services';
import { getProduct, getProducts, getRequisition, getRequisitions, getSupplier, getSuppliers } from './queries';

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

router.get('/suppliers', async (req, res) => {
  getSuppliers().then((data) => {
    res.json(data);
  });
});

router.get('/supplier/:id', async (req, res) => {
  getSupplier(req.params.id).then((data) => {
    res.json(data);
  });
});

router.get('/requisitions', async (req, res) => {
  getRequisitions().then((data) => {
    res.json(data);
  });
});

router.get('/requisition/:id', async (req, res) => {
  getRequisition(req.params.id).then((data) => {
    res.json(data);
  });
});

import express, { Response } from 'express';
import { upload } from '../services';
import { getHistoryInfo, getNotifications, getProduct, getProductGroups, getProducts, getRequisition, getRequisitions, getSupplier, getSuppliers } from './queries';
import { createProduct, createRequisition, createSupplier, deleteProduct, deleteSupplier, updateProduct, updateSupplier } from './mutations';

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

router.get('/groups', async (req, res) => {
  getProductGroups().then((data) => {
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

router.get('/history', async (req, res) => {
  getHistoryInfo().then((data) => {
    res.json(data);
  });
});

router.get('/notifications', async (req, res) => {
  getNotifications().then((data) => {
    res.json(data);
  });
});

// Mutations
router.post('/upload', upload.single('file'), (req, res) => {
  res.json(true);
});

router.post('/create-product', async (req, res) => {
  createProduct(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/update-product', async (req, res) => {
  updateProduct(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/delete-product', async (req, res) => {
  deleteProduct(req.body.id).then((data) => {
    res.json(data);
  });
});

router.post('/create-supplier', async (req, res) => {
  createSupplier(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/update-supplier', async (req, res) => {
  updateSupplier(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/delete-supplier', async (req, res) => {
  deleteSupplier(req.body.id).then((data) => {
    res.json(data);
  });
});

router.post('/create-requisition', async (req, res) => {
  createRequisition(req.body.requisitions, req.body.username).then((data) => {
    res.json(data);
  });
});

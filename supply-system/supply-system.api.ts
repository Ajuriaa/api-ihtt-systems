import express, { Response } from 'express';
import { upload } from '../services';
import {
  getHistoryInfo, getNotifications, getProduct,
  getProductGroups, getProducts, getRequisition,
  getRequisitions, getSupplier, getSuppliers
} from './queries';
import {
  cancelRequisition, createEntries, createOutput,
  createProduct, createRequisition, createSupplier,
  deleteProduct, deleteSupplier, finishRequisition,
  printRequisition,
  updateProduct, updateProductsRequisition, updateRequisitionFile, updateSupplier
} from './mutations';
import jsPDF from 'jspdf';

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

router.post('/cancel-requisition', async (req, res) => {
  cancelRequisition(req.body.id).then((data) => {
    res.json(data);
  });
});

router.post('/finish-requisition', async (req, res) => {
  finishRequisition(req.body.id).then((data) => {
    res.json(data);
  });
});

router.post('/create-entries', async (req, res) => {
  createEntries(req.body.entry, req.body.products, req.body.batches).then((data) => {
    res.json(data);
  });
});

router.post('/create-output', async (req, res) => {
  createOutput(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/update-requisition', async (req, res) => {
  updateProductsRequisition(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/upload-requisition-file', async (req, res) => {
  updateRequisitionFile(req.body.id, req.body.file).then((data) => {
    res.json(data);
  });
});

router.get('/print-requisition', async (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=test.pdf');
  printRequisition(req.body.id).then((data) => {
    res.send(Buffer.from(data));
  });
});

import express, { Response } from 'express';
import { upload } from '../services';
import {
  getHistoryInfo, getNotifications, getProduct,
  getProductGroups, getProducts, getRequisition,
  getRequisitions, getSupplier, getSuppliers,
  generateReport, getYearlyStats, getDashboardInfo,
  getEntryInvoices, getEntryByInvoiceNumber, getEntryEditLogs
} from './queries';
import {
  cancelRequisition, createEntries, createGroup,
  createProduct, createRequisition, createSupplier,
  deleteProduct, deleteSupplier, finishRequisition,
  printRequisition, updateProduct, updateProductsRequisition,
  updateRequisitionFile, updateSupplier, createOutput,
  acceptRequisition, getBossRequisitions, getMyRequisitions,
  updateEntryInvoice
} from './mutations';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('supply system middleware');
  next();
});

// Queries
router.get('/print-requisition/:id', async (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=requisicion.pdf');
  printRequisition(+req.params.id).then((data) => {
    res.send(Buffer.from(data));
  });
});

router.get('/requisition-list/:id', async (req, res) => {
  getBossRequisitions(req.params.id).then((data) => {
    res.json(data);
  });
});

router.get('/my-requisition-list/:id', async (req, res) => {
  getMyRequisitions(req.params.id).then((data) => {
    res.json(data);
  });
});

router.get('/dashboard-top', async (req, res) => {
  getYearlyStats().then((data) => {
    res.json(data);
  });
});

router.get('/dashboard/:start/:end', async (req, res) => {
  getDashboardInfo(req.params.start, req.params.end).then((data) => {
    res.json(data);
  });
});

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

router.get('/invoice-list', async (req, res) => {
  getEntryInvoices().then((data) => {
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

router.get('/report/:type/:start/:end', async (req, res) => {
  generateReport(req.params.type, req.params.start, req.params.end).then((data) => {
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
  cancelRequisition(+req.body.id).then((data) => {
    res.json(data);
  });
});

router.post('/accept-requisition', async (req, res) => {
  acceptRequisition(+req.body.id).then((data) => {
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

router.post('/create-group', async (req, res) => {
  createGroup(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/create-output', async (req, res) => {
  createOutput(req.body).then((data) => {
    res.json(data);
  });
});

router.post('/update-requisition', async (req, res) => {
  updateProductsRequisition(req.body.productsRequisition, req.body.ranges).then((data) => {
    res.json(data);
  });
});

router.post('/upload-requisition-file', async (req, res) => {
  updateRequisitionFile(req.body.id, req.body.file).then((data) => {
    res.json(data);
  });
});

router.get('/entry-by-invoice/:invoiceNumber', async (req, res) => {
  getEntryByInvoiceNumber(req.params.invoiceNumber).then((data) => {
    res.json(data);
  });
});

router.post('/update-entry-invoice', async (req, res) => {
  const { originalInvoiceNumber, newInvoiceNumber, newInvoiceUrl, systemUser } = req.body;
  updateEntryInvoice(originalInvoiceNumber, newInvoiceNumber, newInvoiceUrl, systemUser).then((data) => {
    res.json(data);
  });
});

router.get('/entry-logs', async (req, res) => {
  getEntryEditLogs().then((data) => {
    res.json(data);
  });
});

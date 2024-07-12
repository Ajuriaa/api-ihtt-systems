import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `../${checkSystem(file.originalname)}/files/${extractFirstWord(file.originalname)}`);
  },
  filename: (req, file, cb) => {
    cb(null, removeFirstPart(file.originalname));
  },
});

function extractFirstWord(str: string): string {
  const words = str.split('-');
  return words[0];
}

function checkSystem(str: string): string {
  const supply = ['products', 'invoices', 'requisitions'];
  if (supply.some((word) => str.includes(word))) {
    return 'supply';
  }
  return 'Solicitud_Vehiculos';
}

function removeFirstPart(str: string): string {
  const index = str.indexOf('-');
  if (index !== -1) {
    return str.substring(index + 1);
  }
  return str;
}

export const upload = multer({ storage });

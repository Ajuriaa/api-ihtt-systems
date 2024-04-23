import fs from 'fs-extra';


export function uploadFile(filename: string, type: string): Promise<boolean> {
  return new Promise((resolve, reject) => {

    const uploadPath = `../Solicitud_Vehiculos/files/${type}/${filename}`;

    fs.move('temp/' + filename, uploadPath, { overwrite: true }).then(() => {
      resolve(true);
    }).catch((err) => {
      reject(err);
    });
  });
}
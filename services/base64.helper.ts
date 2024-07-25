import * as fs from 'fs';

export function getBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: 'base64' }, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}

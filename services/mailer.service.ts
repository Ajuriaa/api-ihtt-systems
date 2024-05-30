import nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

const transporter = nodemailer.createTransport({
  host: "correo.transporte.gob.hn",
  port: 587,
  secure: false,
  tls: {
    rejectUnauthorized: false
  },
  auth: {
    user: process.env.MAIL,
    pass: process.env.PASSWORD
  }
});

export interface requestMailInfo {
  employee: string;
  destination: string;
  purpose: string;
  departureDate: string;
  requestId: string;
}

export async function sendMail(to: string, requestInfo: requestMailInfo): Promise<void> {
  const __dirname = path.resolve();
  const filePath = path.join(__dirname, 'templates/vehicle-request.template.html');
  const source = fs.readFileSync(filePath, 'utf-8').toString();
  const template = handlebars.compile(source);
  const replacements = {
    employee: requestInfo.employee,
    destination: requestInfo.destination,
    purpose: requestInfo.purpose,
    departureDate: requestInfo.departureDate,
    requestId: requestInfo.requestId
  };
  const from =`"Sistema de Gestión de Vehículos" <${process.env.MAIL}>`;
  const subject = 'Solicitud de Vehículo';
  const html = template(replacements);

  const mail = await transporter.sendMail({ from, to, subject, html });
}
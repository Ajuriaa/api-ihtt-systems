import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "correo.transporte.gob.hn",
  port: 587,
  secure: false,
  auth: {
    user: process.env.USER,
    pass: process.env.PASSWORD
  }
});

export async function sendMail(to: string, subject: string, text: string) {

}
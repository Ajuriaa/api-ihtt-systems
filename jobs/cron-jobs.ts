import nodemailer from 'nodemailer';
import { exportApplications } from './applications';
import { exportFines } from './fines';
import { exportCertificates } from './certificates';
import { exportEventualPermits } from './eventual_permits';
import { exportSchoolCertificates } from './school_certificates';

interface JobResult {
  tableName: string;
  recordsObtained: number;
  recordsImported: number;
  success: boolean;
  error?: string;
}

// Mailer setup
const transporter = nodemailer.createTransport({
  host: "122.8.183.193",
  port: 465,
  secure: true,
  tls: {
    rejectUnauthorized: false
  },
  auth: {
    user: 'no-reply@transporte.gob.hn',
    pass: "aiv9GEAKTySEdga'(Xt"
  }
});

// Utility function to send mail
async function sendMail(subject: string, text: string): Promise<void> {
  const mailOptions = {
    from: `"Temp Tables Notifier" <no-reply@transporte.gob.hn>`,
    to: "aajuria@transporte.gob.hn",
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`${formatDateForLog()} --- Email sent: ${subject}`);
  } catch (error) {
    console.error(`Error sending email: ${error}`);
  }
}

function formatDateForLog(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Main orchestrator function to run all jobs sequentially
async function runAllJobs(): Promise<void> {
  console.log("Starting all data export jobs...");

  const results: JobResult[] = [];
  const startTime = new Date();

  try {
    // Run applications export
    console.log("\n=== Running Applications Export ===");
    const applicationsResult = await exportApplications();
    results.push(applicationsResult);
    console.log(`Applications: ${applicationsResult.success ? 'SUCCESS' : 'FAILED'}`);

    // Run fines export
    console.log("\n=== Running Fines Export ===");
    const finesResult = await exportFines();
    results.push(finesResult);
    console.log(`Fines: ${finesResult.success ? 'SUCCESS' : 'FAILED'}`);

    // Run certificates export
    console.log("\n=== Running Certificates Export ===");
    const certificatesResult = await exportCertificates();
    results.push(certificatesResult);
    console.log(`Certificates: ${certificatesResult.success ? 'SUCCESS' : 'FAILED'}`);

    // Run eventual permits export
    console.log("\n=== Running Eventual Permits Export ===");
    const eventualPermitsResult = await exportEventualPermits();
    results.push(eventualPermitsResult);
    console.log(`Eventual Permits: ${eventualPermitsResult.success ? 'SUCCESS' : 'FAILED'}`);

    // Run school certificates export
    console.log("\n=== Running School Certificates Export ===");
    const schoolCertificatesResult = await exportSchoolCertificates();
    results.push(schoolCertificatesResult);
    console.log(`School Certificates: ${schoolCertificatesResult.success ? 'SUCCESS' : 'FAILED'}`);

    // Generate comprehensive report
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    let emailBody = `Reporte de Importación de Datos - ${formatDateForLog()}\n\n`;
    emailBody += `Duración total: ${duration} segundos\n\n`;

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    emailBody += `Resumen:\n`;
    emailBody += `- Trabajos exitosos: ${successCount}\n`;
    emailBody += `- Trabajos fallidos: ${failureCount}\n\n`;

    emailBody += `Detalles por tabla:\n`;
    results.forEach(result => {
      emailBody += `\n${result.tableName}:\n`;
      emailBody += `  - Registros obtenidos: ${result.recordsObtained}\n`;
      emailBody += `  - Registros importados en SQLite: ${result.recordsImported}\n`;
      emailBody += `  - Estado: ${result.success ? 'EXITOSO' : 'FALLIDO'}\n`;
      if (result.error) {
        emailBody += `  - Error: ${result.error}\n`;
      }
    });

    const subject = failureCount > 0
      ? `Importación de Datos Completada con ${failureCount} Errores`
      : "Importación de Datos Completada Exitosamente";

    await sendMail(subject, emailBody);
    console.log("\n=== All Jobs Completed ===");

  } catch (error) {
    console.error("Error in runAllJobs:", error);
    await sendMail("Error en la Importación de Datos", `Error crítico: ${error}`);
    throw error;
  }
}

// Main function wrapping everything
async function main() {
  try {
    console.log("Starting script...");
    await runAllJobs();
    console.log("Script completed successfully!");
  } catch (error) {
    console.error("Error in script execution:", error);
    await sendMail("Script Failed", `Error: ${error}`);
    process.exit(1); // Exit with error
  } finally {
    process.exit(0); // Exit successfully
  }
}

// Call the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1); // Exit with error
});

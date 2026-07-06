import PDFDocument from 'pdfkit';
import { Buffer } from 'node:buffer';

export const generateSubscriptionPDF = (data: {
  companyName: string;
  plan: string;
  amount: number;
  date: string;
  transactionId: string;
  billingCycle?: string;
}): Promise<any> => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    const onData = buffers.push.bind(buffers);
    const onEnd = () => {
      doc.off('data', onData);
      doc.off('end', onEnd);
      resolve(Buffer.concat(buffers));
    };

    doc.on('data', onData);
    doc.on('end', onEnd);

    // Header
    doc.fillColor('#ff5722').fontSize(25).text('BAMOUSSO RH', { align: 'center' });
    doc.fillColor('#444444').fontSize(10).text('Le Manager de votre Entreprise', { align: 'center' });
    doc.moveDown();
    doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, 100).lineTo(550, 100).stroke();

    doc.moveDown(2);

    // Title
    doc.fillColor('#111111').fontSize(18).text('FACTURE DE SOUSCRIPTION', { align: 'center', underline: true });
    doc.moveDown(2);

    // Info
    doc.fontSize(12).fillColor('#333333');
    doc.text(`Client : ${data.companyName}`);
    doc.text(`Date : ${data.date}`);
    doc.text(`N° Transaction : ${data.transactionId}`);
    doc.moveDown();

    // Table Header
    doc.fillColor('#ff5722').rect(50, 250, 500, 25).fill();
    doc.fillColor('#ffffff').text('Description', 60, 257);
    doc.text('Quantité', 350, 257);
    doc.text('Prix Total', 480, 257);

    const isYearly = data.billingCycle === 'YEARLY';
    const cycleText = isYearly ? 'Annuel' : 'Mensuel';
    const durationText = isYearly ? '365 jours' : '30 jours';

    // Table Content
    doc.fillColor('#333333');
    doc.text(`Abonnement ${cycleText} - Formule ${data.plan}`, 60, 285);
    doc.text('1', 350, 285);
    doc.text(`${data.amount.toLocaleString()} FCFA`, 450, 285);

    doc.strokeColor('#eeeeee').moveTo(50, 310).lineTo(550, 310).stroke();

    // Total
    doc.moveDown(4);
    doc.fontSize(15).fillColor('#111111').text(`TOTAL RÉGLÉ : ${data.amount.toLocaleString()} FCFA`, { align: 'right' });

    // Footer
    doc.fontSize(10).fillColor('#999999').text(
      `Merci de votre confiance. Votre abonnement est activé pour une durée de ${durationText}.`,
      50, 700, { align: 'center', width: 500 }
    );

    doc.end();
  });
};

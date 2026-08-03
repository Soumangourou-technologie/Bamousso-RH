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

export const generateSaleInvoicePDF = (data: {
  companyName: string;
  invoiceNumber: string;
  clientName: string;
  clientPhone?: string;
  date: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
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
    doc.fillColor('#2c3e50').fontSize(25).text(data.companyName, { align: 'center' });
    doc.moveDown();
    doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, 100).lineTo(550, 100).stroke();

    doc.moveDown(2);

    // Title
    doc.fillColor('#111111').fontSize(18).text('FACTURE DE VENTE', { align: 'center', underline: true });
    doc.moveDown(2);

    // Info
    doc.fontSize(12).fillColor('#333333');
    doc.text(`N° Facture : ${data.invoiceNumber}`);
    doc.text(`Date : ${data.date}`);
    doc.text(`Client : ${data.clientName}`);
    if (data.clientPhone) {
      doc.text(`Téléphone : ${data.clientPhone}`);
    }
    doc.moveDown(2);

    // Table Header
    const tableTop = doc.y;
    doc.fillColor('#f8f9fa').rect(50, tableTop, 500, 25).fill();
    doc.fillColor('#111111').fontSize(11).text('Désignation', 60, tableTop + 7);
    doc.text('Qté', 300, tableTop + 7);
    doc.text('Prix Unit.', 380, tableTop + 7);
    doc.text('Total', 480, tableTop + 7);

    doc.strokeColor('#eeeeee').moveTo(50, tableTop + 25).lineTo(550, tableTop + 25).stroke();
    
    // Table Rows
    let y = tableTop + 35;
    doc.fillColor('#333333').fontSize(10);
    
    data.items.forEach(item => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.text(item.name, 60, y, { width: 230 });
      doc.text(item.quantity.toString(), 300, y);
      doc.text(`${item.unitPrice.toLocaleString()} F`, 380, y);
      doc.text(`${item.total.toLocaleString()} F`, 480, y);
      
      const height = doc.heightOfString(item.name, { width: 230 });
      y += height + 10;
      doc.strokeColor('#f0f0f0').moveTo(50, y - 5).lineTo(550, y - 5).stroke();
    });

    // Totals
    doc.moveDown(2);
    y = doc.y;
    doc.fontSize(12).fillColor('#111111');
    doc.text('Total HT :', 380, y);
    doc.text(`${data.totalHT.toLocaleString()} FCFA`, 450, y, { align: 'right' });
    
    y += 20;
    doc.text('TVA :', 380, y);
    doc.text(`${data.totalVAT.toLocaleString()} FCFA`, 450, y, { align: 'right' });
    
    y += 20;
    doc.fontSize(14).text('NET À PAYER :', 350, y);
    doc.text(`${data.totalTTC.toLocaleString()} FCFA`, 450, y, { align: 'right' });

    // Footer
    doc.fontSize(10).fillColor('#999999').text(
      'Merci de votre visite.',
      50, 700, { align: 'center', width: 500 }
    );

    doc.end();
  });
};

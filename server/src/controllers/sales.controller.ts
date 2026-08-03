import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { generateSaleInvoicePDF } from "../utils/pdfGenerator.js";
import { uploadToSupabase } from "../utils/supabase.js";

// ==========================================
// --- GESTION DU CATALOGUE (PRODUITS)    ---
// ==========================================

export const createProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, description, price, vatRate, stock } = req.body;
    const companyId = (req as any).user?.companyId;

    if (!companyId) return res.status(403).json({ message: "Non autorisé." });

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: Number(price),
        vatRate: vatRate ? Number(vatRate) : 0,
        stock: stock ? Number(stock) : null,
        companyId
      }
    });

    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

export const getProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const companyId = (req as any).user?.companyId;
    if (!companyId) return res.status(403).json({ message: "Non autorisé." });

    const products = await prisma.product.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { name, description, price, vatRate, stock } = req.body;
    const companyId = (req as any).user?.companyId;

    if (!companyId) return res.status(403).json({ message: "Non autorisé." });

    const product = await prisma.product.update({
      where: { id, companyId },
      data: { 
        name, 
        description, 
        price: Number(price), 
        vatRate: vatRate ? Number(vatRate) : 0, 
        stock: stock ? Number(stock) : null
      }
    });

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user?.companyId;

    if (!companyId) return res.status(403).json({ message: "Non autorisé." });

    await prisma.product.delete({
      where: { id, companyId }
    });

    res.json({ message: "Produit supprimé avec succès." });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

// ==========================================
// --- GESTION DES VENTES (POS)           ---
// ==========================================

export const checkout = async (req: Request, res: Response): Promise<any> => {
  try {
    const companyId = (req as any).user?.companyId;
    const cashierId = (req as any).user?.id;

    if (!companyId || !cashierId) return res.status(403).json({ message: "Non autorisé." });

    const { clientName, clientPhone, paymentMethod, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Le panier est vide." });
    }

    // 1. Récupérer la compagnie pour le logo/nom
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ message: "Entreprise introuvable." });

    // 2. Calculer les totaux
    let totalHT = 0;
    let totalVAT = 0;
    let totalTTC = 0;

    const saleItemsData = items.map((item: any) => {
      const lineHT = Number(item.unitPrice) * Number(item.quantity);
      const lineVAT = lineHT * (Number(item.vatRate) / 100);
      const lineTTC = lineHT + lineVAT;

      totalHT += lineHT;
      totalVAT += lineVAT;
      totalTTC += lineTTC;

      return {
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: Number(item.vatRate),
        totalLineTTC: lineTTC
      };
    });

    const invoiceNumber = `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Créer la vente en DB
    const saleInvoice = await prisma.saleInvoice.create({
      data: {
        invoiceNumber,
        clientName: clientName || "Client de passage",
        clientPhone,
        totalHT,
        totalVAT,
        totalTTC,
        paymentMethod: paymentMethod || "CASH",
        companyId,
        cashierId,
        items: {
          create: saleItemsData
        }
      }
    });

    // 4. Imputation en comptabilité (Création d'une Recette)
    const transaction = await prisma.companyTransaction.create({
      data: {
        title: `Vente POS - ${clientName || "Client de passage"}`,
        amount: totalTTC,
        type: "INCOME",
        category: "Vente",
        reference: invoiceNumber,
        description: `Facture de vente n° ${invoiceNumber}`,
        companyId
      }
    });

    // Mettre à jour la facture avec la ref de la transaction
    await prisma.saleInvoice.update({
      where: { id: saleInvoice.id },
      data: { transactionRef: transaction.id }
    });

    // 5. Générer le PDF
    const pdfData = {
      companyName: company.name,
      invoiceNumber: invoiceNumber,
      clientName: clientName || "Client de passage",
      clientPhone: clientPhone,
      date: new Date().toLocaleDateString('fr-FR'),
      items: items.map((i: any) => ({
        name: i.name,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: (Number(i.unitPrice) * Number(i.quantity)) + ((Number(i.unitPrice) * Number(i.quantity)) * (Number(i.vatRate) / 100))
      })),
      totalHT,
      totalVAT,
      totalTTC
    };

    const pdfBuffer = await generateSaleInvoicePDF(pdfData);

    // Fake MulterFile object for uploadToSupabase
    const file = {
      fieldname: 'file',
      originalname: `${invoiceNumber}.pdf`,
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      buffer: pdfBuffer
    };

    const pdfUrl = await uploadToSupabase(file, 'bamousso-documents');

    if (pdfUrl) {
      await prisma.saleInvoice.update({
        where: { id: saleInvoice.id },
        data: { pdfUrl }
      });
    }

    res.status(201).json({
      message: "Vente enregistrée avec succès.",
      invoiceId: saleInvoice.id,
      pdfUrl
    });

  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

export const getSalesHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const companyId = (req as any).user?.companyId;
    if (!companyId) return res.status(403).json({ message: "Non autorisé." });

    const sales = await prisma.saleInvoice.findMany({
      where: { companyId },
      include: {
        cashier: { select: { firstName: true, lastName: true } },
        items: {
          include: { product: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

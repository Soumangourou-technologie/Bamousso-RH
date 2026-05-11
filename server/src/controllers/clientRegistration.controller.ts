import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { uploadToSupabase } from "../utils/supabase.js";
import { notifyAdmins } from "../utils/notifications.js";

/**
 * Crée un nouvel enregistrement client (COMMERCIAL uniquement).
 * Gère l'upload de la pièce d'identité et des signatures.
 */
export const createClientRegistration = async (req: Request, res: Response): Promise<any> => {
  try {
    const currentUser = (req as any).user as { id: string; role: string; companyId: string; firstName?: string; lastName?: string };
    const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const {
      // Client identity
      lastName, firstName, gender, birthDate,
      // Client type
      clientType,
      // Enterprise info
      companyName, legalStatus, sector, companyDescription,
      // Location
      address, city, commune, country,
      // Contacts
      phoneFix, phoneMobile, whatsapp, email,
      // ID document
      idDocumentType,
      // RDV
      rdvSubject, rdvDescription, rdvDate, rdvTime, rdvMode,
      // Consent
      consentMode, consentGiven,
      // Signatures as base64 (from canvas)
      clientSignatureBase64, commercialSignatureBase64,
    } = req.body;

    if (!lastName || !firstName) {
      return res.status(400).json({ message: "Le nom et le prénom du client sont obligatoires." });
    }

    // Upload pièce d'identité si fournie
    let idDocumentUrl: string | null = null;
    if (files && files['idDocument'] && files['idDocument'][0]) {
      idDocumentUrl = await uploadToSupabase(files['idDocument'][0], 'bamousso');
    }

    // Upload signatures si base64 fournie — on les convertit en Buffer et upload
    let clientSignatureUrl: string | null = null;
    let commercialSignatureUrl: string | null = null;

    if (clientSignatureBase64) {
      const sigBuffer = Buffer.from(clientSignatureBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const sigFile = {
        fieldname: 'clientSignature',
        originalname: `client-signature-${Date.now()}.png`,
        encoding: '7bit',
        mimetype: 'image/png',
        size: sigBuffer.length,
        buffer: sigBuffer,
      };
      clientSignatureUrl = await uploadToSupabase(sigFile as any, 'bamousso');
    }

    if (commercialSignatureBase64) {
      const sigBuffer = Buffer.from(commercialSignatureBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const sigFile = {
        fieldname: 'commercialSignature',
        originalname: `commercial-signature-${Date.now()}.png`,
        encoding: '7bit',
        mimetype: 'image/png',
        size: sigBuffer.length,
        buffer: sigBuffer,
      };
      commercialSignatureUrl = await uploadToSupabase(sigFile as any, 'bamousso');
    }

    // Upload documents additionnels
    const additionalDocs: { title: string; url: string; type: string }[] = [];
    if (files && files['documents']) {
      for (const docFile of files['documents']) {
        const docUrl = await uploadToSupabase(docFile, 'bamousso');
        if (docUrl) {
          additionalDocs.push({
            title: docFile.originalname,
            url: docUrl,
            type: 'LEGAL',
          });
        }
      }
    }

    const registration = await prisma.clientRegistration.create({
      data: {
        commercialId: currentUser.id,
        companyId: currentUser.companyId,
        lastName,
        firstName,
        gender: gender || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        clientType: clientType || 'PARTICULIER',
        companyName: companyName || null,
        legalStatus: legalStatus || null,
        sector: sector || null,
        companyDescription: companyDescription || null,
        address: address || null,
        city: city || null,
        commune: commune || null,
        country: country || 'Mali',
        phoneFix: phoneFix || null,
        phoneMobile: phoneMobile || null,
        whatsapp: whatsapp || null,
        email: email || null,
        idDocumentType: idDocumentType || null,
        idDocumentUrl,
        rdvSubject: rdvSubject || null,
        rdvDescription: rdvDescription || null,
        rdvDate: rdvDate ? new Date(rdvDate) : null,
        rdvTime: rdvTime || null,
        rdvMode: rdvMode || null,
        clientSignatureUrl,
        commercialSignatureUrl,
        consentMode: consentMode || 'SIGNATURE',
        consentGiven: consentGiven === 'true' || consentGiven === true,
        consentDate: new Date(),
        status: 'VALIDATED',
        documents: {
          create: additionalDocs,
        },
      },
      include: {
        documents: true,
        commercial: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Notifier les admins
    await notifyAdmins(
      currentUser.companyId,
      "Nouvel enregistrement client",
      `${currentUser.firstName || ''} ${currentUser.lastName || ''} a enregistré un nouveau client : ${firstName} ${lastName}.`,
      "CLIENT_REGISTRATION",
      registration.id
    );

    res.status(201).json({ success: true, data: registration });
  } catch (error: any) {
    console.error("Erreur création enregistrement client:", error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * Récupère les enregistrements du commercial connecté.
 */
export const getMyRegistrations = async (req: Request, res: Response): Promise<any> => {
  try {
    const currentUser = (req as any).user as { id: string; role: string; companyId: string };

    const registrations = await prisma.clientRegistration.findMany({
      where: { commercialId: currentUser.id },
      include: {
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: registrations });
  } catch (error: any) {
    console.error("Erreur récupération enregistrements:", error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * Récupère tous les enregistrements de l'entreprise, groupés par commercial (ADMIN/HR).
 */
export const getAllRegistrations = async (req: Request, res: Response): Promise<any> => {
  try {
    const currentUser = (req as any).user as { id: string; role: string; companyId: string };

    const registrations = await prisma.clientRegistration.findMany({
      where: { companyId: currentUser.companyId },
      include: {
        documents: true,
        commercial: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Grouper par commercial
    const grouped: Record<string, {
      commercial: { id: string; firstName: string; lastName: string; email: string };
      registrations: typeof registrations;
      count: number;
    }> = {};

    for (const reg of registrations) {
      const key = reg.commercialId;
      if (!grouped[key]) {
        grouped[key] = {
          commercial: reg.commercial,
          registrations: [],
          count: 0,
        };
      }
      grouped[key].registrations.push(reg);
      grouped[key].count++;
    }

    res.json({ success: true, data: Object.values(grouped) });
  } catch (error: any) {
    console.error("Erreur récupération enregistrements admin:", error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * Récupère le détail d'un enregistrement client.
 */
export const getRegistrationById = async (req: Request, res: Response): Promise<any> => {
  try {
    const currentUser = (req as any).user as { id: string; role: string; companyId: string };
    const id = req.params.id as string;

    const registration = await prisma.clientRegistration.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
      include: {
        documents: true,
        commercial: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!registration) {
      return res.status(404).json({ message: "Enregistrement non trouvé." });
    }

    // Commercial ne peut voir que ses propres enregistrements
    if (currentUser.role === 'COMMERCIAL' && registration.commercialId !== currentUser.id) {
      return res.status(403).json({ message: "Accès non autorisé." });
    }

    res.json({ success: true, data: registration });
  } catch (error: any) {
    console.error("Erreur récupération enregistrement:", error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * Ajoute un document à un enregistrement existant.
 */
export const addDocument = async (req: Request, res: Response): Promise<any> => {
  try {
    const currentUser = (req as any).user as { id: string; role: string; companyId: string };
    const id = req.params.id as string;
    const file = (req as any).file;
    const { title, type } = req.body;

    if (!file) {
      return res.status(400).json({ message: "Aucun fichier fourni." });
    }

    // Vérifier que l'enregistrement existe et appartient au commercial
    const registration = await prisma.clientRegistration.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
    });

    if (!registration) {
      return res.status(404).json({ message: "Enregistrement non trouvé." });
    }

    if (currentUser.role === 'COMMERCIAL' && registration.commercialId !== currentUser.id) {
      return res.status(403).json({ message: "Accès non autorisé." });
    }

    const fileUrl = await uploadToSupabase(file, 'bamousso');
    if (!fileUrl) {
      return res.status(500).json({ message: "Erreur lors de l'upload du fichier." });
    }

    const doc = await prisma.clientDocument.create({
      data: {
        title: title || file.originalname,
        url: fileUrl,
        type: type || 'LEGAL',
        clientRegistrationId: id,
      },
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error: any) {
    console.error("Erreur ajout document:", error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

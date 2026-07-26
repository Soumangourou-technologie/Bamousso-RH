import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PIXEL_ID = '3595484767284161';

// Helper pour récupérer ou initialiser la configuration Meta Pixel
const getOrCreateConfig = async () => {
  let config = await prisma.metaPixelConfig.findFirst();
  if (!config) {
    config = await prisma.metaPixelConfig.create({
      data: {
        pixelId: DEFAULT_PIXEL_ID,
        isEnabled: true,
        isCapiEnabled: true,
        trackPageViews: true,
        trackRegistrations: true,
        trackSubscribes: true,
      },
    });
  }
  return config;
};

// 1. Endpoint Public : Obtenir la configuration minimale pour le frontend
export const getPublicPixelConfig = async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    return res.json({
      pixelId: config.pixelId,
      isEnabled: config.isEnabled,
      trackPageViews: config.trackPageViews,
      trackRegistrations: config.trackRegistrations,
      trackSubscribes: config.trackSubscribes,
    });
  } catch (error) {
    console.error('Erreur getPublicPixelConfig:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de la configuration Pixel' });
  }
};

// 2. Super-Admin : Obtenir la configuration complète (avec CAPI Token & Test Code)
export const getMetaPixelConfig = async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    return res.json(config);
  } catch (error) {
    console.error('Erreur getMetaPixelConfig:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de la config Super-Admin' });
  }
};

// 3. Super-Admin : Mettre à jour la configuration Meta Pixel & CAPI
export const updateMetaPixelConfig = async (req: Request, res: Response) => {
  try {
    const {
      pixelId,
      conversionsApiToken,
      testEventCode,
      webhookVerifyToken,
      isEnabled,
      isCapiEnabled,
      trackPageViews,
      trackRegistrations,
      trackSubscribes,
    } = req.body;

    const currentConfig = await getOrCreateConfig();

    const updatedConfig = await prisma.metaPixelConfig.update({
      where: { id: currentConfig.id },
      data: {
        pixelId: pixelId !== undefined ? pixelId.trim() : currentConfig.pixelId,
        conversionsApiToken: conversionsApiToken !== undefined ? conversionsApiToken.trim() : currentConfig.conversionsApiToken,
        testEventCode: testEventCode !== undefined ? testEventCode.trim() : currentConfig.testEventCode,
        webhookVerifyToken: webhookVerifyToken !== undefined ? webhookVerifyToken.trim() : currentConfig.webhookVerifyToken,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : currentConfig.isEnabled,
        isCapiEnabled: isCapiEnabled !== undefined ? Boolean(isCapiEnabled) : currentConfig.isCapiEnabled,
        trackPageViews: trackPageViews !== undefined ? Boolean(trackPageViews) : currentConfig.trackPageViews,
        trackRegistrations: trackRegistrations !== undefined ? Boolean(trackRegistrations) : currentConfig.trackRegistrations,
        trackSubscribes: trackSubscribes !== undefined ? Boolean(trackSubscribes) : currentConfig.trackSubscribes,
      },
    });

    return res.json({
      message: 'Configuration Meta Pixel enregistrée avec succès',
      config: updatedConfig,
    });
  } catch (error) {
    console.error('Erreur updateMetaPixelConfig:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la configuration Pixel' });
  }
};

// 4. Enregistrer un Événement Pixel (Navigateur et/ou API Conversions CAPI)
export const trackEvent = async (req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();

    if (!config.isEnabled) {
      return res.status(200).json({ message: 'Pixel désactivé' });
    }

    const {
      eventName,
      eventSource = 'BROWSER',
      url,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      fbclid,
      customData,
    } = req.body;

    if (!eventName) {
      return res.status(400).json({ error: 'eventName requis' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    // Enregistrement initial en base
    const pixelEvent = await prisma.metaPixelEvent.create({
      data: {
        eventName,
        eventSource,
        userIp: clientIp,
        userAgent,
        url: url || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmContent: utmContent || null,
        utmTerm: utmTerm || null,
        fbclid: fbclid || null,
        customData: (customData || {}) as any,
        status: 'SUCCESS',
      },
    });

    let capiResponse = null;

    // Si CAPI est activé et qu'un Token CAPI Meta est configuré, relayer à l'API Graph Meta
    if (config.isCapiEnabled && config.conversionsApiToken && config.pixelId) {
      try {
        const payload: any = {
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_source_url: url || 'https://bamoussorh.com',
              user_data: {
                client_ip_address: clientIp,
                client_user_agent: userAgent,
                ...(fbclid ? { fbc: `fb.1.${Date.now()}.${fbclid}` } : {}),
              },
              custom_data: customData || {},
            },
          ],
        };

        if (config.testEventCode) {
          payload.test_event_code = config.testEventCode;
        }

        const metaUrl = `https://graph.facebook.com/v19.0/${config.pixelId}/events?access_token=${config.conversionsApiToken}`;
        const response = await fetch(metaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const resData: any = await response.json();
        capiResponse = resData;

        // Mise à jour de l'événement avec la réponse CAPI
        await prisma.metaPixelEvent.update({
          where: { id: pixelEvent.id },
          data: {
            eventSource: 'SERVER_CAPI',
            status: response.ok ? 'SUCCESS' : 'FAILED',
            capiResponse: resData as any,
          },
        });
      } catch (capiError: any) {
        console.error('Erreur envoi Meta CAPI:', capiError);
        await prisma.metaPixelEvent.update({
          where: { id: pixelEvent.id },
          data: {
            status: 'FAILED',
            capiResponse: { error: capiError?.message || 'Erreur CAPI' } as any,
          },
        });
      }
    }

    return res.status(201).json({
      message: 'Événement Pixel enregistré',
      eventId: pixelEvent.id,
      capiResponse,
    });
  } catch (error) {
    console.error('Erreur trackEvent:', error);
    return res.status(500).json({ error: 'Erreur lors du suivi de l’événement Meta' });
  }
};

// 5. Super-Admin : Récupérer les Analytics & Métriques Meta Pixel
export const getMetaPixelAnalytics = async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();

    const [
      totalEvents,
      browserEvents,
      capiEvents,
      pageViewCount,
      leadCount,
      registrationCount,
      subscribeCount,
      recentEvents,
      allEventsForBreakdown,
    ] = await Promise.all([
      prisma.metaPixelEvent.count(),
      prisma.metaPixelEvent.count({ where: { eventSource: 'BROWSER' } }),
      prisma.metaPixelEvent.count({ where: { eventSource: 'SERVER_CAPI' } }),
      prisma.metaPixelEvent.count({ where: { eventName: 'PageView' } }),
      prisma.metaPixelEvent.count({ where: { eventName: { in: ['Lead', 'ProspectClick', 'Contact'] } } }),
      prisma.metaPixelEvent.count({ where: { eventName: 'CompleteRegistration' } }),
      prisma.metaPixelEvent.count({ where: { eventName: 'Subscribe' } }),
      prisma.metaPixelEvent.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.metaPixelEvent.findMany({
        select: { eventName: true, utmCampaign: true, utmSource: true, status: true },
      }),
    ]);

    // Répartition par nom d'événement
    const eventBreakdown: Record<string, number> = {};
    // Répartition par campagne UTM
    const campaignBreakdown: Record<string, number> = {};
    // Répartition par source UTM
    const sourceBreakdown: Record<string, number> = {};

    allEventsForBreakdown.forEach((ev) => {
      eventBreakdown[ev.eventName] = (eventBreakdown[ev.eventName] || 0) + 1;
      if (ev.utmCampaign) {
        campaignBreakdown[ev.utmCampaign] = (campaignBreakdown[ev.utmCampaign] || 0) + 1;
      }
      if (ev.utmSource) {
        sourceBreakdown[ev.utmSource] = (sourceBreakdown[ev.utmSource] || 0) + 1;
      }
    });

    // Entonnoir de conversion
    const funnel = {
      pageViews: pageViewCount,
      leads: leadCount,
      registrations: registrationCount,
      subscribes: subscribeCount,
      leadConversionRate: pageViewCount > 0 ? ((leadCount / pageViewCount) * 100).toFixed(1) : '0',
      registrationConversionRate: leadCount > 0 ? ((registrationCount / leadCount) * 100).toFixed(1) : '0',
      subscribeConversionRate: registrationCount > 0 ? ((subscribeCount / registrationCount) * 100).toFixed(1) : '0',
    };

    return res.json({
      config: {
        pixelId: config.pixelId,
        isEnabled: config.isEnabled,
        isCapiEnabled: config.isCapiEnabled,
        hasCapiToken: Boolean(config.conversionsApiToken),
        testEventCode: config.testEventCode,
      },
      kpis: {
        totalEvents,
        browserEvents,
        capiEvents,
        leadCount,
        registrationCount,
        subscribeCount,
      },
      funnel,
      eventBreakdown,
      campaignBreakdown,
      sourceBreakdown,
      recentEvents,
    });
  } catch (error) {
    console.error('Erreur getMetaPixelAnalytics:', error);
    return res.status(500).json({ error: 'Erreur lors du calcul des analytics Pixel Meta' });
  }
};

// 6. Super-Admin : Envoi d'un Événement de Test Meta CAPI
export const sendTestEvent = async (req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();

    if (!config.pixelId) {
      return res.status(400).json({ error: 'Pixel ID Meta non configuré' });
    }

    const { eventName = 'TestEvent', testCode } = req.body;
    const testEventCodeToUse = testCode || config.testEventCode || 'TEST' + Math.floor(10000 + Math.random() * 90000);

    const payload: any = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: 'https://bamoussorh.com/super-admin/pixel-test',
          user_data: {
            client_ip_address: req.socket.remoteAddress || '127.0.0.1',
            client_user_agent: req.headers['user-agent'] || 'Bamousso-SuperAdmin-Tester',
          },
          custom_data: {
            test_note: 'Envoi direct depuis le tableau de bord Super-Admin Bamousso RH',
          },
        },
      ],
      test_event_code: testEventCodeToUse,
    };

    let metaResult = null;
    let isSuccess = false;

    if (config.conversionsApiToken) {
      const metaUrl = `https://graph.facebook.com/v19.0/${config.pixelId}/events?access_token=${config.conversionsApiToken}`;
      const response = await fetch(metaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      metaResult = await response.json();
      isSuccess = response.ok;
    }

    // Sauvegarde de l'événement de test dans le journal
    const testLog = await prisma.metaPixelEvent.create({
      data: {
        eventName: `TEST_${eventName}`,
        eventSource: 'SERVER_CAPI',
        url: 'https://bamoussorh.com/super-admin/pixel-test',
        customData: { testCode: testEventCodeToUse } as any,
        status: isSuccess ? 'TEST' : 'FAILED',
        capiResponse: (metaResult || { note: 'Aucun Token CAPI configuré, test enregistré en local' }) as any,
      },
    });

    return res.json({
      message: isSuccess ? 'Événement de test envoyé avec succès à Meta CAPI !' : 'Événement de test enregistré',
      testLog,
      metaResult,
    });
  } catch (error) {
    console.error('Erreur sendTestEvent:', error);
    return res.status(500).json({ error: 'Erreur lors de l’envoi de l’événement de test' });
  }
};

// 7. Webhook GET : Vérification du Webhook Meta Lead Ads par Facebook
export const verifyLeadWebhook = async (req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = config.webhookVerifyToken || 'bamousso_meta_lead_token_2026';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[Meta Webhook] Vérification Webhook réussie !');
      return res.status(200).send(challenge);
    } else {
      console.warn('[Meta Webhook] Token de vérification incorrect');
      return res.sendStatus(403);
    }
  } catch (error) {
    console.error('Erreur verifyLeadWebhook:', error);
    return res.status(500).json({ error: 'Erreur verification webhook' });
  }
};

// 8. Webhook POST : Réception directe des prospects depuis les formulaires instantanés Facebook Lead Ads
export const receiveLeadWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    console.log('[Meta Webhook] Lead Payload reçu:', JSON.stringify(body));

    // Extraction des données du Lead
    const name = body.name || body.full_name || body.lead_name || body.field_data?.find((f: any) => f.name === 'full_name')?.values[0] || 'Prospect Meta Lead Ads';
    const email = body.email || body.field_data?.find((f: any) => f.name === 'email')?.values[0] || null;
    const phone = body.phone || body.phone_number || body.field_data?.find((f: any) => f.name === 'phone_number')?.values[0] || null;
    const companyName = body.company_name || body.company || body.field_data?.find((f: any) => f.name === 'company_name')?.values[0] || 'Prospect Facebook';
    const adName = body.ad_name || body.campaign_name || 'Campagne Facebook Lead Ads';

    // 1. Enregistrement de l'événement Pixel 'Lead'
    const event = await prisma.metaPixelEvent.create({
      data: {
        eventName: 'Lead',
        eventSource: 'SERVER_CAPI',
        utmCampaign: adName,
        utmSource: 'facebook_lead_ads',
        customData: {
          name,
          email,
          phone,
          companyName,
          adName,
          leadGenId: body.leadgen_id || body.id || null,
        } as any,
        status: 'SUCCESS',
      },
    });

    // 2. Création automatique de la fiche prospect (ClientRegistration) dans Bamousso RH si une entreprise existe
    const firstCompany = await prisma.company.findFirst();
    if (firstCompany && (name || email || phone)) {
      const nameParts = name.trim().split(' ');
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : name;
      const firstName = nameParts[0] || 'Prospect';

      await prisma.clientRegistration.create({
        data: {
          lastName,
          firstName,
          clientType: 'PROSPECT',
          companyName: companyName || 'Prospect Facebook Ads',
          email: email || undefined,
          phoneMobile: phone || undefined,
          company: { connect: { id: firstCompany.id } },
          rdvDescription: `Prospect importé automatiquement via Facebook Lead Ads (${adName})`,
        } as any,
      });
    }

    return res.status(200).json({ status: 'EVENT_RECEIVED', eventId: event.id });
  } catch (error) {
    console.error('Erreur receiveLeadWebhook:', error);
    return res.status(200).json({ status: 'ACCEPTED_WITH_LOG' });
  }
};


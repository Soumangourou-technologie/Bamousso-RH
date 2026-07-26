import api from './api';

// Pixel ID par défaut fourni
export const DEFAULT_PIXEL_ID = '3595484767284161';

let isPixelInitialized = false;

// 1. Capture et persistance des paramètres UTM & FBCLID depuis l'URL
export const captureUTMParameters = () => {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

  utmKeys.forEach((key) => {
    const val = urlParams.get(key);
    if (val) {
      sessionStorage.setItem(`bamousso_${key}`, val);
    }
  });
};

export const getStoredUTMParameters = () => {
  if (typeof window === 'undefined') return {};
  return {
    utmSource: sessionStorage.getItem('bamousso_utm_source') || undefined,
    utmMedium: sessionStorage.getItem('bamousso_utm_medium') || undefined,
    utmCampaign: sessionStorage.getItem('bamousso_utm_campaign') || undefined,
    utmContent: sessionStorage.getItem('bamousso_utm_content') || undefined,
    utmTerm: sessionStorage.getItem('bamousso_utm_term') || undefined,
    fbclid: sessionStorage.getItem('bamousso_fbclid') || undefined,
  };
};

// 2. Initialisation dynamique du script Meta Pixel dans le document <head>
export const initMetaPixel = async (pixelId: string = DEFAULT_PIXEL_ID) => {
  if (typeof window === 'undefined' || isPixelInitialized) return;

  captureUTMParameters();

  try {
    // Vérification si fbq existe déjà
    if (!(window as any).fbq) {
      const fbqFunction: any = function (...args: any[]) {
        if (fbqFunction.callMethod) {
          fbqFunction.callMethod(...args);
        } else {
          fbqFunction.queue.push(args);
        }
      };

      if (!(window as any)._fbq) (window as any)._fbq = fbqFunction;
      fbqFunction.push = fbqFunction;
      fbqFunction.loaded = true;
      fbqFunction.version = '2.0';
      fbqFunction.queue = [];

      (window as any).fbq = fbqFunction;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    }

    (window as any).fbq('init', pixelId);
    isPixelInitialized = true;
    console.log(`[MetaPixel] Initialisé avec ID: ${pixelId}`);
  } catch (err) {
    console.error('[MetaPixel] Erreur d’initialisation:', err);
  }
};

// 3. Fonction universelle d'envoi d'événement (Client FBQ + API Backend CAPI)
export const trackMetaEvent = async (eventName: string, customData: Record<string, any> = {}) => {
  if (typeof window === 'undefined') return;

  captureUTMParameters();
  const utms = getStoredUTMParameters();

  // A. Trigger Client-Side Meta Pixel (fbq)
  try {
    if ((window as any).fbq) {
      (window as any).fbq('track', eventName, customData);
    }
  } catch (clientErr) {
    console.warn('[MetaPixel] Erreur fbq client-side:', clientErr);
  }

  // B. Relay Server-Side CAPI + Backend Analytics DB
  try {
    await api.post('/meta-pixel/track', {
      eventName,
      eventSource: 'BROWSER',
      url: window.location.href,
      ...utms,
      customData,
    });
  } catch (serverErr) {
    console.warn('[MetaPixel] Erreur envoi serveur CAPI:', serverErr);
  }
};

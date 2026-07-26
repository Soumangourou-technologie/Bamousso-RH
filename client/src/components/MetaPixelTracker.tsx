import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { initMetaPixel, trackMetaEvent, DEFAULT_PIXEL_ID } from '../utils/metaPixel';

export default function MetaPixelTracker() {
  const location = useLocation();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupAndTrack = async () => {
      try {
        let activePixelId = DEFAULT_PIXEL_ID;
        let isEnabled = true;
        let trackPageViews = true;

        const res = await api.get('/meta-pixel/public-config');
        if (res.data) {
          if (res.data.pixelId) activePixelId = res.data.pixelId;
          if (res.data.isEnabled !== undefined) isEnabled = res.data.isEnabled;
          if (res.data.trackPageViews !== undefined) trackPageViews = res.data.trackPageViews;
        }

        if (!isEnabled || !isMounted) return;

        // Active le Pixel Facebook sur la page
        await initMetaPixel(activePixelId);

        // Déclenche le PageView si le chemin a changé
        if (trackPageViews && lastTrackedPath.current !== location.pathname) {
          lastTrackedPath.current = location.pathname;
          trackMetaEvent('PageView', { path: location.pathname });
        }
      } catch (error) {
        // En cas d'erreur API fallback sur le Pixel ID par défaut
        initMetaPixel(DEFAULT_PIXEL_ID);
        if (lastTrackedPath.current !== location.pathname) {
          lastTrackedPath.current = location.pathname;
          trackMetaEvent('PageView', { path: location.pathname });
        }
      }
    };

    setupAndTrack();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  return null; // Composant d'effet invisible
}

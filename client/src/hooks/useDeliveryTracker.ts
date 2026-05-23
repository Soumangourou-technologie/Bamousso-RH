import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export const useDeliveryTracker = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Only track if the user is a LIVREUR
    if (user?.role !== 'LIVREUR') return;

    let watchId: number;

    const startTracking = () => {
      if (!navigator.geolocation) {
        console.warn("La géolocalisation n'est pas supportée par ce navigateur.");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            await api.put('/employees/me/location', { lat: latitude, lng: longitude });
          } catch (error) {
            console.error("Erreur lors de l'envoi de la position:", error);
          }
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        }
      );
    };

    startTracking();

    return () => {
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user]);
};

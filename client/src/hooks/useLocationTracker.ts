import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { supabase } from '../utils/supabase';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export const useLocationTracker = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Les livreurs sont toujours trackés
    if (user.role === 'LIVREUR') {
      setIsActive(true);
      return;
    }

    // Pour les autres, vérifier s'ils ont pointé
    const checkStatus = async () => {
      try {
        const res = await api.get('/attendances');
        const today = new Date().toDateString();
        const logs = res.data;
        const todayLog = logs.find((log: any) => new Date(log.date).toDateString() === today);
        setIsActive(Boolean(todayLog?.checkIn && !todayLog?.checkOut));
      } catch (error) {
        console.error("Erreur vérification pointage:", error);
      }
    };

    checkStatus();

    // Écouter les changements de pointage
    const channel = supabase
      .channel(`tracker-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Attendance', filter: `employeeId=eq.${user.id}` },
        () => {
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!isActive) return;

    let webWatchId: number;
    let capWatchId: string;

    const startTracking = async () => {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        try {
          const permStatus = await Geolocation.checkPermissions();
          if (permStatus.location !== 'granted') {
            const request = await Geolocation.requestPermissions();
            if (request.location !== 'granted') {
              console.warn("Permission de géolocalisation native refusée.");
              return;
            }
          }

          capWatchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 },
            async (position, err) => {
              if (err) {
                console.error("Erreur de géolocalisation Capacitor:", err);
                return;
              }
              if (position) {
                const { latitude, longitude } = position.coords;
                try {
                  await api.put('/employees/me/location', { lat: latitude, lng: longitude });
                } catch (error) {
                  console.error("Erreur lors de l'envoi de la position (Native):", error);
                }
              }
            }
          );
        } catch (error) {
          console.error("Erreur lors de l'initialisation du tracker natif:", error);
        }
      } else {
        if (!navigator.geolocation) {
          console.warn("La géolocalisation n'est pas supportée par ce navigateur.");
          return;
        }

        webWatchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              await api.put('/employees/me/location', { lat: latitude, lng: longitude });
            } catch (error) {
              console.error("Erreur lors de l'envoi de la position (Web):", error);
            }
          },
          (error) => {
            console.error("Erreur de géolocalisation Web:", error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 2000,
            timeout: 5000,
          }
        );
      }
    };

    void startTracking();

    return () => {
      const isNative = Capacitor.isNativePlatform();
      if (isNative && capWatchId) {
        void Geolocation.clearWatch({ id: capWatchId });
      } else if (!isNative && webWatchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(webWatchId);
      }
    };
  }, [isActive]);
};

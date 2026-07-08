import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { supabase } from '../utils/supabase';

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
  }, [isActive]);
};

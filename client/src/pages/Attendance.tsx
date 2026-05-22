import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Clock, Play, Square, AlertCircle, MapPin, Navigation, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Attendance {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  employee?: {
    firstName: string;
    lastName: string;
  };
}

const AttendancePage = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'COMMERCIAL';
  
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState(new Date());
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get<Attendance[]>('/attendances');
      setLogs(res.data);

      // Auto-center map on first log with GPS data
      const firstWithGps = res.data.find(l => l.latitude && l.longitude);
      if (firstWithGps?.latitude && firstWithGps?.longitude) {
        setMapCenter({ lat: firstWithGps.latitude, lng: firstWithGps.longitude });
      }
    } catch (error) {
      console.error('Error fetching attendances', error);
    }
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('attendance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Attendance' }, () => fetchLogs())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleToggle = async () => {
    setIsLoading(true);

    const postClock = async (lat?: number, lng?: number) => {
      try {
        await api.post('/attendances/toggle', { latitude: lat, longitude: lng });
        void fetchLogs();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Erreur lors du pointage.');
        console.error('Error toggling clock', error);
      } finally {
        setIsLoading(false);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => postClock(pos.coords.latitude, pos.coords.longitude),
        (error) => {
          console.error('Erreur géolocalisation:', error);
          let errorMsg = "Impossible d'obtenir votre position.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = "Accès à la localisation refusé. Veuillez autoriser la localisation dans votre navigateur.";
          } else if (error.code === error.TIMEOUT) {
            errorMsg = "Délai d'attente dépassé pour la localisation.";
          }
          alert(errorMsg + " Le pointage sera enregistré sans coordonnées GPS.");
          postClock();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("La géolocalisation n'est pas supportée (nécessite HTTPS). Le pointage sera enregistré sans coordonnées GPS.");
      postClock();
    }
  };

  // Pour EMPLOYEE: l'API ne renvoie pas le champ employee, on cherche juste par date
  // Pour ADMIN: l'API renvoie tous les logs avec employee
  const today = new Date().toDateString();
  const todayLog = canManage
    ? undefined // L'admin n'a pas de module de pointage personnel
    : logs.find(log => log.date && new Date(log.date).toDateString() === today);

  const isCheckedIn = Boolean(todayLog?.checkIn && !todayLog?.checkOut);
  const isFinished = Boolean(todayLog?.checkOut);

  const calculateHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return '-';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return (diff / (1000 * 60 * 60)).toFixed(2) + ' h';
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Historique des Pointages', 14, 22);

    const tableData = logs.map(log => [
      new Date(log.date).toLocaleDateString('fr-FR'),
      canManage ? (log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : '-') : '-',
      log.checkIn ? new Date(log.checkIn).toLocaleTimeString('fr-FR') : '-',
      log.checkOut ? new Date(log.checkOut).toLocaleTimeString('fr-FR') : '-',
      calculateHours(log.checkIn, log.checkOut),
      log.status
    ]);

    const headers = canManage 
      ? ['Date', 'Employé', 'Arrivée', 'Départ', 'Durée', 'Statut']
      : ['Date', '-', 'Arrivée', 'Départ', 'Durée', 'Statut'];

    autoTable(doc, {
      startY: 30,
      head: [headers],
      body: tableData,
    });
    
    doc.save('rapport_pointages.pdf');
  };

  // Points GPS pour la carte
  const gpsLogs = logs.filter(log => log.latitude && log.longitude);
  const defaultCenter = mapCenter || { lat: 5.3484, lng: -4.0305 };

  // Construire l'URL OpenStreetMap avec markers
  const buildMapUrl = () => {
    if (gpsLogs.length === 0) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${defaultCenter.lng - 0.05},${defaultCenter.lat - 0.05},${defaultCenter.lng + 0.05},${defaultCenter.lat + 0.05}&layer=mapnik`;
    }
    // On prend le dernier pointage (le plus récent)
    const latestGps = gpsLogs[0];
    const lat = latestGps.latitude!;
    const lng = latestGps.longitude!;
    // Ajuster le bbox pour un zoom plus proche autour du marqueur (0.005 au lieu de 0.05)
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
          <Clock className="w-8 h-8 text-orange-500" /> Pointage
        </h1>
        <p className="text-gray-500 mt-1">Gérez votre temps de travail et suivez les présences de l'équipe avec géolocalisation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module de Pointage (Employé uniquement) */}
        {!canManage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center relative"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-t-3xl" />

            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Pointage du Jour</h2>
            <p className="text-gray-500 mb-8 text-sm">
              {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            <div className="text-5xl font-mono font-bold text-orange-500 tracking-wider mb-10">
              {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>

            {isFinished ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-5 py-3 rounded-full font-semibold">
                <AlertCircle className="w-5 h-5" /> Journée terminée
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleToggle}
                disabled={isLoading}
                className={`flex items-center justify-center gap-3 w-48 h-16 rounded-full text-white font-bold text-lg shadow-lg transition-all disabled:opacity-60
                  ${isCheckedIn
                    ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30'
                    : 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/30'
                  }`}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                ) : isCheckedIn ? (
                  <><Square className="w-6 h-6 fill-current" /> Terminer</>
                ) : (
                  <><Play className="w-6 h-6 fill-current" /> Commencer</>
                )}
              </motion.button>
            )}

            <div className="mt-8 text-sm text-gray-500 space-y-2 w-full text-left bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
              <div className="flex justify-between">
                <span>Arrivée:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {todayLog?.checkIn ? new Date(todayLog.checkIn).toLocaleTimeString() : '--:--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Départ:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {todayLog?.checkOut ? new Date(todayLog.checkOut).toLocaleTimeString() : '--:--'}
                </span>
              </div>
              {todayLog?.latitude && todayLog?.longitude && (
                <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Position:</span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${todayLog.latitude}&mlon=${todayLog.longitude}#map=15/${todayLog.latitude}/${todayLog.longitude}`}
                    target="_blank" rel="noreferrer"
                    className="text-orange-500 font-bold hover:underline"
                  >
                    Voir carte
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tableau Historique */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${canManage ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden`}
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {canManage ? "Pointages de l'équipe" : 'Mon Historique'}
            </h2>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold shadow hover:bg-orange-600 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Exporter (PDF)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="p-4 font-semibold">Date</th>
                  {canManage && <th className="p-4 font-semibold">Employé</th>}
                  <th className="p-4 font-semibold">Arrivée</th>
                  <th className="p-4 font-semibold">Départ</th>
                  <th className="p-4 font-semibold">Durée</th>
                  <th className="p-4 font-semibold">GPS</th>
                  <th className="p-4 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {logs.map((log, index) => (
                  <motion.tr
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <td className="p-4 text-gray-900 dark:text-gray-300 text-sm">{new Date(log.date).toLocaleDateString('fr-FR')}</td>
                    {canManage && (
                      <td className="p-4 text-gray-900 dark:text-white font-semibold text-sm">
                        {log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : '-'}
                      </td>
                    )}
                    <td className="p-4 text-gray-600 dark:text-gray-400 font-mono text-sm">{log.checkIn ? new Date(log.checkIn).toLocaleTimeString('fr-FR') : '-'}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 font-mono text-sm">{log.checkOut ? new Date(log.checkOut).toLocaleTimeString('fr-FR') : '-'}</td>
                    <td className="p-4 text-orange-600 font-bold font-mono text-sm">{calculateHours(log.checkIn, log.checkOut)}</td>
                    <td className="p-4">
                      {log.latitude && log.longitude ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${log.latitude}&mlon=${log.longitude}#map=15/${log.latitude}/${log.longitude}`}
                          target="_blank" rel="noreferrer"
                          className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-1 text-xs font-bold"
                        >
                          <Navigation className="w-4 h-4" /> Voir
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                        ${log.status === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : log.status === 'ABSENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 7 : 6} className="p-12 text-center text-gray-400 text-sm">
                      Aucun pointage trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Carte de Géolocalisation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" /> Géolocalisation en direct
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {gpsLogs.length > 0
                ? `${gpsLogs.length} pointage(s) avec position GPS aujourd'hui.`
                : 'Aucune position GPS enregistrée pour le moment.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-gray-500 uppercase">Live</span>
          </div>
        </div>

        <div className="h-[450px] w-full rounded-b-3xl overflow-hidden">
          <iframe
            title="Carte de géolocalisation des pointages"
            src={buildMapUrl()}
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>

        {/* Légende des markers */}
        {gpsLogs.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
            {gpsLogs.map(log => (
              <a
                key={log.id}
                href={`https://www.openstreetmap.org/?mlat=${log.latitude}&mlon=${log.longitude}#map=16/${log.latitude}/${log.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-xl text-xs font-bold hover:bg-orange-100 transition-colors"
              >
                <MapPin className="w-3 h-3" />
                {canManage
                  ? `${log.employee?.firstName ?? 'Employé'} — ${log.checkIn ? new Date(log.checkIn).toLocaleTimeString('fr-FR') : 'N/A'}`
                  : `Pointage — ${log.checkIn ? new Date(log.checkIn).toLocaleTimeString('fr-FR') : 'N/A'}`
                }
              </a>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AttendancePage;

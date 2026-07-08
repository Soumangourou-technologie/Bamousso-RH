import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Clock, Play, Square, AlertCircle, MapPin, Navigation, Download, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom CSS for pulse effect
const pulseStyles = `
  .custom-pulse-icon {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .pulse-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: absolute;
    z-index: 2;
    box-shadow: 0 0 4px rgba(0,0,0,0.3);
  }
  .pulse-ring {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    position: absolute;
    z-index: 1;
    animation: pulsate 1.5s ease-out infinite;
    opacity: 0;
  }
  @keyframes pulsate {
    0% { transform: scale(0.1); opacity: 0; }
    50% { opacity: 0.5; }
    100% { transform: scale(1.2); opacity: 0; }
  }
`;

const getPulseIcon = (isActive: boolean) => {
  const color = isActive ? '#3b82f6' : '#9ca3af'; // blue if active, gray if inactive
  
  if (isActive) {
    return L.divIcon({
      className: 'custom-pulse-icon',
      html: `<div style="background-color: ${color};" class="pulse-ring"></div><div style="background-color: ${color};" class="pulse-dot"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  } else {
    return L.divIcon({
      className: 'custom-pulse-icon',
      html: `<div style="background-color: ${color};" class="pulse-dot"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }
};

// Component to handle flying to a location
const MapController = ({ center, zoom }: { center: { lat: number; lng: number } | null; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], zoom, {
        duration: 1.5, // 1.5 seconds animation
      });
    }
  }, [center, map, zoom]);
  return null;
};


interface Attendance {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  employeeId?: string;
  employee?: {
    firstName: string;
    lastName: string;
  };
}

const AttendancePage = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'HR_ASSISTANT' || user?.role === 'RH';
  const shouldShowClockIn = user?.role !== 'COMPANY_ADMIN' && user?.role !== 'SUPER_ADMIN';
  
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState(new Date());
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get<Attendance[]>('/attendances');
      setLogs(res.data);

      // Fetch employees to get currentLat / currentLng
      let emps = [];
      if (canManage) {
         const empRes = await api.get('/employees');
         emps = empRes.data;
      } else {
         const meRes = await api.get('/auth/me');
         emps = [meRes.data.user || meRes.data];
      }
      setEmployees(emps);

      // Auto-center map on first log with GPS data or first employee with GPS
      const firstWithGps = res.data.find(l => l.latitude && l.longitude);
      if (firstWithGps?.latitude && firstWithGps?.longitude) {
        setMapCenter({ lat: firstWithGps.latitude, lng: firstWithGps.longitude });
      } else {
        const firstEmp = emps.find((e: any) => e.currentLat && e.currentLng);
        if (firstEmp?.currentLat && firstEmp?.currentLng) {
          setMapCenter({ lat: firstEmp.currentLat, lng: firstEmp.currentLng });
        }
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

    const fetchInterval = setInterval(fetchLogs, 10000); // Auto-refresh every 10s

    return () => { 
      void supabase.removeChannel(channel); 
      clearInterval(fetchInterval);
    };
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
  const todayLog = !shouldShowClockIn
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

  // Calcul des marqueurs (employés)
  const todayDateStr = new Date().toDateString();
  const mapMarkers = employees
    .filter(emp => emp.currentLat && emp.currentLng)
    .map(emp => {
      // Is there an active pointage for this employee today?
      const empLogs = logs.filter(l => l.employeeId === emp.id || (!canManage && !l.employeeId)); // fallback if no employeeId for non-admin
      const todayLog = empLogs.find(l => new Date(l.date).toDateString() === todayDateStr);
      const isActive = Boolean(todayLog?.checkIn && !todayLog?.checkOut);

      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        lat: emp.currentLat,
        lng: emp.currentLng,
        isActive,
        lastUpdate: emp.lastLocationUpdate,
        todayLog
      };
    });

  const defaultCenter = mapCenter || { lat: 5.3484, lng: -4.0305 };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
          <Clock className="w-8 h-8 text-orange-500" /> Pointage
        </h1>
        <p className="text-gray-500 mt-1">Gérez votre temps de travail et suivez les présences de l'équipe avec géolocalisation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module de Pointage (Visible pour tous sauf Admin) */}
        {shouldShowClockIn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center relative"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-orange-400 to-orange-600 rounded-t-3xl" />

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
                    ? 'bg-linear-to-r from-red-500 to-red-600 shadow-red-500/30'
                    : 'bg-linear-to-r from-green-500 to-green-600 shadow-green-500/30'
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
                  <button
                    onClick={() => {
                      setMapCenter({ lat: todayLog.latitude!, lng: todayLog.longitude! });
                      setMapZoom(16);
                    }}
                    className="text-orange-500 font-bold hover:underline"
                  >
                    Voir carte
                  </button>
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
          className={`${!shouldShowClockIn ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden`}
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
                        <button
                          onClick={() => {
                            setMapCenter({ lat: log.latitude!, lng: log.longitude! });
                            setMapZoom(16);
                          }}
                          className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-1 text-xs font-bold"
                        >
                          <Navigation className="w-4 h-4" /> Voir
                        </button>
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
              {mapMarkers.length > 0
                ? `${mapMarkers.length} employé(s) localisé(s).`
                : 'Aucune position GPS enregistrée pour le moment.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" /><span className="text-[10px] font-bold text-gray-500 uppercase">En cours</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-gray-400 rounded-full" /><span className="text-[10px] font-bold text-gray-500 uppercase">Dernière pos.</span></div>
          </div>
        </div>

        <div className="h-112.5 w-full rounded-b-3xl overflow-hidden relative z-0">
          {selectedEmployeeName && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-1000 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-6 py-2.5 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {selectedEmployeeName}
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedEmployeeName(null); }}
                className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <style>{pulseStyles}</style>
          <MapContainer 
            center={[defaultCenter.lat, defaultCenter.lng]} 
            zoom={mapZoom} 
            scrollWheelZoom={true} 
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`}
            />
            
            <MapController center={mapCenter} zoom={mapZoom} />

            {mapMarkers.map(marker => (
              <Marker 
                key={marker.id} 
                position={[marker.lat, marker.lng]}
                icon={getPulseIcon(marker.isActive)}
                eventHandlers={{
                  click: () => {
                    setSelectedEmployeeName(canManage ? `${marker.firstName} ${marker.lastName}` : 'Mon Pointage');
                  }
                }}
              >
                <Popup className="rounded-xl overflow-hidden">
                  <div className="p-1">
                    <h3 className="font-bold text-gray-800 border-b pb-1 mb-2">
                      {canManage ? `${marker.firstName} ${marker.lastName}` : 'Mon Pointage'}
                    </h3>
                    <div className="text-xs space-y-1 text-gray-600">
                      {marker.todayLog ? (
                        <>
                          <p><strong>Arrivée :</strong> {marker.todayLog.checkIn ? new Date(marker.todayLog.checkIn).toLocaleTimeString('fr-FR') : '-'}</p>
                          <p><strong>Départ :</strong> {marker.todayLog.checkOut ? new Date(marker.todayLog.checkOut).toLocaleTimeString('fr-FR') : '-'}</p>
                        </>
                      ) : (
                        <p className="text-gray-400 italic">Aucun pointage aujourd'hui</p>
                      )}
                      <p><strong>Dernière maj. :</strong> {marker.lastUpdate ? new Date(marker.lastUpdate).toLocaleTimeString('fr-FR') : '-'}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Légende des markers */}
        {mapMarkers.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
            {mapMarkers.map(marker => (
              <button
                key={marker.id}
                onClick={() => {
                  setMapCenter({ lat: marker.lat, lng: marker.lng });
                  setMapZoom(16);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${marker.isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}
              >
                <MapPin className="w-3 h-3" />
                {canManage
                  ? `${marker.firstName} ${marker.lastName}`
                  : `Ma Position`
                }
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AttendancePage;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../utils/api';

// Fix for default Leaflet marker icons not loading in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DeliveryMapModalProps {
  onClose: () => void;
}

interface Livreur {
  id: string;
  firstName: string;
  lastName: string;
  currentLat: number | null;
  currentLng: number | null;
  lastLocationUpdate: string | null;
}

const DeliveryMapModal = ({ onClose }: DeliveryMapModalProps) => {
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLivreurs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees?role=LIVREUR');
      setLivreurs(res.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des livreurs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivreurs();
    const interval = setInterval(fetchLivreurs, 10000); // Rafraîchir toutes les 10s
    return () => clearInterval(interval);
  }, []);

  const activeLivreurs = livreurs.filter(l => l.currentLat !== null && l.currentLng !== null);

  // Centre par défaut (ex: Abidjan) si aucun livreur n'a de position
  const defaultCenter: [number, number] = [5.359951, -4.008256];
  const center = activeLivreurs.length > 0
    ? [activeLivreurs[0].currentLat!, activeLivreurs[0].currentLng!] as [number, number]
    : defaultCenter;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-[#1a0f0a] rounded-3xl w-full max-w-5xl h-[80vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col">
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-[#1a0f0a] z-10">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Carte des Livreurs en temps réel</h2>
            <p className="text-sm text-gray-500 font-medium">Position mise à jour toutes les 10 secondes</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchLivreurs} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-500 transition-colors">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 w-full bg-gray-100 dark:bg-gray-900 relative">
          <MapContainer center={center} zoom={13} className="w-full h-full z-0">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {activeLivreurs.map((l) => (
              <Marker key={l.id} position={[l.currentLat!, l.currentLng!]}>
                <Popup className="font-sans">
                  <div className="text-center p-1">
                    <div className="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">
                      {l.firstName[0]}{l.lastName[0]}
                    </div>
                    <strong className="block text-gray-900 text-base">{l.firstName} {l.lastName}</strong>
                    <span className="text-xs text-gray-500 mt-1 block">
                      Dernière mise à jour :<br/>
                      {new Date(l.lastLocationUpdate!).toLocaleTimeString()}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          {activeLivreurs.length === 0 && !loading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 dark:bg-black/80 px-6 py-4 rounded-2xl shadow-xl backdrop-blur-md border border-gray-200 dark:border-white/10 text-center pointer-events-auto">
                <p className="font-bold text-gray-900 dark:text-white mb-1">Aucun livreur en ligne</p>
                <p className="text-sm text-gray-500">Les positions apparaîtront ici quand les livreurs seront en déplacement.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DeliveryMapModal;

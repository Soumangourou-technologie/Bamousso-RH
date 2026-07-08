import re

with open('client/src/pages/Attendance.tsx', 'r') as f:
    content = f.read()

# Replace getPulseIcon
old_icon = """const getPulseIcon = (status: string) => {
  let color = '#f97316'; // orange (default)
  if (status === 'PRESENT') color = '#22c55e'; // green
  if (status === 'ABSENT') color = '#ef4444'; // red
  
  return L.divIcon({
    className: 'custom-pulse-icon',
    html: `<div style="background-color: ${color};" class="pulse-ring"></div><div style="background-color: ${color};" class="pulse-dot"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};"""

new_icon = """const getPulseIcon = (isActive: boolean) => {
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
};"""

content = content.replace(old_icon, new_icon)

# Add employees state and fetch
state_hooks = """  const [logs, setLogs] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);"""

content = content.replace("  const [logs, setLogs] = useState<Attendance[]>([]);", state_hooks)

fetch_logs_fn = """  const fetchLogs = async () => {
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
  };"""

content = re.sub(r'  const fetchLogs = async \(\) => \{[\s\S]*?  \};\n', fetch_logs_fn + '\n', content)

# Modify gpsLogs calculation to use employees
old_gps_logs = """  // Points GPS pour la carte
  const gpsLogs = logs.filter(log => log.latitude && log.longitude);
  const defaultCenter = mapCenter || { lat: 5.3484, lng: -4.0305 };"""

new_gps_logs = """  // Calcul des marqueurs (employés)
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

  const defaultCenter = mapCenter || { lat: 5.3484, lng: -4.0305 };"""

content = content.replace(old_gps_logs, new_gps_logs)

# Modify Map rendering
old_map_header = """            <p className="text-sm text-gray-500 mt-1">
              {gpsLogs.length > 0
                ? `${gpsLogs.length} pointage(s) avec position GPS aujourd'hui.`
                : 'Aucune position GPS enregistrée pour le moment.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-gray-500 uppercase">Live</span>
          </div>"""

new_map_header = """            <p className="text-sm text-gray-500 mt-1">
              {mapMarkers.length > 0
                ? `${mapMarkers.length} employé(s) localisé(s).`
                : 'Aucune position GPS enregistrée pour le moment.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" /><span className="text-[10px] font-bold text-gray-500 uppercase">En cours</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-gray-400 rounded-full" /><span className="text-[10px] font-bold text-gray-500 uppercase">Dernière pos.</span></div>
          </div>"""

content = content.replace(old_map_header, new_map_header)

old_markers = """            {gpsLogs.map(log => (
              <Marker 
                key={log.id} 
                position={[log.latitude!, log.longitude!]}
                icon={getPulseIcon(log.status)}
                eventHandlers={{
                  click: () => {
                    setSelectedEmployeeName(canManage ? (log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'Employé inconnu') : 'Mon Pointage');
                  }
                }}
              >
                <Popup className="rounded-xl overflow-hidden">
                  <div className="p-1">
                    <h3 className="font-bold text-gray-800 border-b pb-1 mb-2">
                      {canManage ? (log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'Employé inconnu') : 'Mon Pointage'}
                    </h3>
                    <div className="text-xs space-y-1 text-gray-600">
                      <p><strong>Arrivée :</strong> {log.checkIn ? new Date(log.checkIn).toLocaleTimeString('fr-FR') : '-'}</p>
                      <p><strong>Départ :</strong> {log.checkOut ? new Date(log.checkOut).toLocaleTimeString('fr-FR') : '-'}</p>
                      <p>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white
                          ${log.status === 'PRESENT' ? 'bg-green-500' : log.status === 'ABSENT' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                          {log.status}
                        </span>
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}"""

new_markers = """            {mapMarkers.map(marker => (
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
            ))}"""

content = content.replace(old_markers, new_markers)

old_legend = """        {/* Légende des markers */}
        {gpsLogs.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
            {gpsLogs.map(log => (
              <button
                key={log.id}
                onClick={() => {
                  setMapCenter({ lat: log.latitude!, lng: log.longitude! });
                  setMapZoom(16);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-xl text-xs font-bold hover:bg-orange-100 transition-colors cursor-pointer"
              >
                <MapPin className="w-3 h-3" />
                {canManage
                  ? `${log.employee?.firstName ?? 'Employé'} — ${log.checkIn ? new Date(log.checkIn).toLocaleTimeString('fr-FR') : 'N/A'}`
                  : `Pointage — ${log.checkIn ? new Date(log.checkIn).toLocaleTimeString('fr-FR') : 'N/A'}`
                }
              </button>
            ))}
          </div>
        )}"""

new_legend = """        {/* Légende des markers */}
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
        )}"""

content = content.replace(old_legend, new_legend)

with open('client/src/pages/Attendance.tsx', 'w') as f:
    f.write(content)


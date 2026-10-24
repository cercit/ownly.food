import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Point { lat: number; lng: number }

/**
 * Real map (OpenStreetMap via Leaflet, no API key): restaurant pin, delivery pin, a line between them,
 * and the Rapido Captain moving along it as `progress` goes from 0 to 1.
 * The delivery pin is the middle of the delivery area, never the exact address (the database sends only that).
 */
export function RouteMap({ from, to, progress, fromLabel, toLabel }: { from: Point; to: Point; progress: number; fromLabel: string; toLabel: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const captain = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    L.polyline([[from.lat, from.lng], [to.lat, to.lng]], { color: '#C40054', weight: 4, dashArray: '8 8', opacity: 0.7 }).addTo(m);
    L.circleMarker([from.lat, from.lng], { radius: 10, color: '#fff', weight: 3, fillColor: '#C40054', fillOpacity: 1 }).addTo(m).bindTooltip(fromLabel, { permanent: true, direction: 'top', offset: [0, -10] });
    L.circleMarker([to.lat, to.lng], { radius: 10, color: '#fff', weight: 3, fillColor: '#16845A', fillOpacity: 1 }).addTo(m).bindTooltip(toLabel, { permanent: true, direction: 'top', offset: [0, -10] });
    captain.current = L.circleMarker([from.lat, from.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#111D35', fillOpacity: 1 }).addTo(m).bindTooltip('Rapido Captain', { direction: 'bottom' });
    m.fitBounds(L.latLngBounds([[from.lat, from.lng], [to.lat, to.lng]]), { padding: [48, 48], maxZoom: 15 });
    map.current = m;
    return () => { m.remove(); map.current = null; captain.current = null; };
  }, [from.lat, from.lng, to.lat, to.lng, fromLabel, toLabel]);

  useEffect(() => {
    const p = Math.max(0, Math.min(1, progress));
    captain.current?.setLatLng([from.lat + (to.lat - from.lat) * p, from.lng + (to.lng - from.lng) * p]);
  }, [progress, from.lat, from.lng, to.lat, to.lng]);

  return <div ref={box} role="img" aria-label={`Map from ${fromLabel} to ${toLabel}`} className="w-full h-64 sm:h-80 rounded-2xl border border-[#F0D7E2] overflow-hidden z-0" />;
}

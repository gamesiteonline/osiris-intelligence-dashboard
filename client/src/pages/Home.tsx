import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import {
  Activity,
  AlertTriangle,
  Anchor,
  ArrowUpRight,
  Bell,
  Bolt,
  Boxes,
  Check,
  ChevronDown,
  CircleDot,
  CloudLightning,
  Compass,
  Crosshair,
  Database,
  ExternalLink,
  Eye,
  Flame,
  Globe2,
  Layers3,
  LocateFixed,
  LockKeyhole,
  MapPin,
  Menu,
  Radio,
  Search,
  Satellite,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Sparkles,
  Target,
  TerminalSquare,
  Wifi,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const layerCatalog = [
  { id: "earthquakes", label: "Seismic activity", icon: Activity, count: "19", color: "teal" },
  { id: "fires", label: "Active fires", icon: Flame, count: "42", color: "orange" },
  { id: "weather", label: "Severe weather", icon: CloudLightning, count: "08", color: "blue" },
  { id: "flights", label: "Aircraft", icon: Radio, count: "2.4k", color: "purple" },
  { id: "satellites", label: "Satellites", icon: Satellite, count: "86", color: "pink" },
  { id: "maritime", label: "Maritime traffic", icon: Anchor, count: "631", color: "cyan" },
  { id: "cameras", label: "Public cameras", icon: Eye, count: "1.2k", color: "lime" },
];

const events = [
  { id: 1, category: "Seismic", title: "M 5.1 earthquake", location: "Vanuatu · 81 km ESE of Isangel", time: "4 min ago", severity: "moderate", source: "USGS", icon: Activity },
  { id: 2, category: "Weather", title: "Severe storm cell", location: "Northern Italy · Piemonte", time: "12 min ago", severity: "high", source: "MeteoAlarm", icon: CloudLightning },
  { id: 3, category: "Fire", title: "Thermal anomaly cluster", location: "Amazonas · Brazil", time: "18 min ago", severity: "high", source: "NASA FIRMS", icon: Flame },
  { id: 4, category: "Maritime", title: "Vessel density spike", location: "Singapore Strait", time: "26 min ago", severity: "low", source: "AISstream", icon: Anchor },
  { id: 5, category: "Aviation", title: "Restricted airspace notice", location: "Eastern Mediterranean", time: "41 min ago", severity: "moderate", source: "NOTAM / FAA", icon: Radio },
];

const mapDots: Array<[number, number, string, string]> = [
  [13, 27, "teal", "M 5.1 · Vanuatu"], [18, 52, "orange", "Fire cluster · Brazil"], [24, 44, "purple", "Flight corridor"], [31, 34, "blue", "Storm cell"], [39, 57, "cyan", "Vessel density"], [48, 38, "pink", "Satellite pass"], [56, 49, "purple", "Flight corridor"], [64, 29, "teal", "Seismic · Japan"], [71, 56, "orange", "Fire · Australia"], [79, 39, "lime", "Public camera"], [88, 62, "blue", "Weather front"], [92, 27, "cyan", "Maritime"],
];

function SourceTag({ source }: { source: string }) {
  return <span className="source-tag"><span className="source-dot" />{source}</span>;
}

const globeTextureUrl = "/manus-storage/osiris-earth-texture_45c22fd8.jpg";
type GlobePlace = { name: string; lat: number; lng: number; color: string; label: string; source: string; category: string; metric: string; detail: string; observedAt?: string; availability?: string; sourceUrl?: string };
const fallbackGlobePlaces: GlobePlace[] = [
  { name: "Vanuatu", lat: -17.7, lng: 168.3, color: "#62f5c8", label: "M 5.1 · Vanuatu", source: "USGS Earthquake Hazards", category: "SEISMIC EVENT", metric: "5.1 Mw", detail: "81 km depth" },
  { name: "Amazonas, Brazil", lat: -3.4, lng: -62.2, color: "#ffad68", label: "Fire cluster · Brazil", source: "NASA FIRMS", category: "THERMAL ANOMALY", metric: "42 hotspots", detail: "High confidence" },
  { name: "Piemonte, Italy", lat: 45.1, lng: 7.7, color: "#72a8ff", label: "Storm cell · Piemonte", source: "MeteoAlarm", category: "SEVERE WEATHER", metric: "Storm cell", detail: "Regional warning" },
  { name: "Singapore Strait", lat: 1.2, lng: 103.8, color: "#4edfed", label: "Vessel density · Singapore", source: "AISstream", category: "MARITIME ACTIVITY", metric: "631 vessels", detail: "Density index" },
  { name: "Japan", lat: 36.2, lng: 138.3, color: "#62f5c8", label: "Seismic · Japan", source: "USGS Earthquake Hazards", category: "SEISMIC EVENT", metric: "M 4.7", detail: "Shallow event" },
  { name: "Sydney, Australia", lat: -33.9, lng: 151.2, color: "#ffad68", label: "Fire · Australia", source: "NASA FIRMS", category: "THERMAL ANOMALY", metric: "18 hotspots", detail: "Moderate confidence" },
];

function MapCanvas({ activeLayers, places, onSelect }: { activeLayers: string[]; places: GlobePlace[]; onSelect: (place: GlobePlace) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const rotationRef = useRef({ lng: 12, lat: 8 });
  const dragRef = useRef({ active: false, x: 0, y: 0, moved: false });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef({ distance: 0, zoom: 1 });
  const [zoom, setZoom] = useState(1);
  const [textureReady, setTextureReady] = useState(false);
  const [rotationVersion, setRotationVersion] = useState(0);
  const [heartbeat, setHeartbeat] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const showAircraftRoutes = activeLayers.includes("flights");
  const showMaritimeRoutes = activeLayers.includes("maritime");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = globeTextureUrl;
    image.onload = () => { imageRef.current = image; setTextureReady(true); };
  }, []);
  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => setHeartbeat(current => (current + 1) % 4), 2200);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? 760;
    const height = parent?.clientHeight ?? 470;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const radius = Math.min(width * .37, height * .72) * zoom;
    const cx = width / 2;
    const cy = height / 2 - 4;
    const image = imageRef.current;
    const diameter = Math.max(220, Math.floor(radius * 2));
    const sphere = document.createElement("canvas");
    sphere.width = diameter;
    sphere.height = diameter;
    const sphereContext = sphere.getContext("2d");
    if (sphereContext) {
      const texture = document.createElement("canvas");
      texture.width = 360;
      texture.height = 180;
      const textureContext = texture.getContext("2d");
      if (image && textureContext) {
        textureContext.drawImage(image, 0, 0, texture.width, texture.height);
        const textureData = textureContext.getImageData(0, 0, texture.width, texture.height).data;
        const sphereData = sphereContext.createImageData(diameter, diameter);
        const yaw = (rotationRef.current.lng * Math.PI) / 180;
        const pitch = (rotationRef.current.lat * Math.PI) / 180;
        const sinPitch = Math.sin(pitch);
        const cosPitch = Math.cos(pitch);
        for (let py = 0; py < diameter; py += 1) {
          for (let px = 0; px < diameter; px += 1) {
            const nx = (px + .5 - diameter / 2) / (diameter / 2);
            const ny = (py + .5 - diameter / 2) / (diameter / 2);
            const distance = nx * nx + ny * ny;
            if (distance > 1) continue;
            const z = Math.sqrt(1 - distance);
            const y = -ny;
            const rotatedY = y * cosPitch + z * sinPitch;
            const rotatedZ = -y * sinPitch + z * cosPitch;
            const longitude = yaw + Math.atan2(nx, rotatedZ);
            const latitude = Math.asin(Math.max(-1, Math.min(1, rotatedY)));
            const tx = Math.floor((((longitude / (Math.PI * 2)) + .5) % 1 + 1) % 1 * texture.width);
            const ty = Math.floor((.5 - latitude / Math.PI) * texture.height);
            const source = (Math.max(0, Math.min(texture.height - 1, ty)) * texture.width + tx) * 4;
            const target = (py * diameter + px) * 4;
            const light = .64 + z * .42;
            sphereData.data[target] = Math.min(255, textureData[source] * light);
            sphereData.data[target + 1] = Math.min(255, textureData[source + 1] * light);
            sphereData.data[target + 2] = Math.min(255, textureData[source + 2] * light);
            sphereData.data[target + 3] = 255;
          }
        }
        sphereContext.putImageData(sphereData, 0, 0);
      } else {
        sphereContext.fillStyle = "#092c38";
        sphereContext.fillRect(0, 0, diameter, diameter);
      }
      context.drawImage(sphere, cx - radius, cy - radius, diameter, diameter);
    }
    context.save();
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.strokeStyle = "rgba(113, 239, 204, .6)";
    context.lineWidth = 1;
    context.shadowColor = "rgba(61, 232, 195, .55)";
    context.shadowBlur = 24;
    context.stroke();
    context.restore();

    const project = (lat: number, lng: number) => {
      const lon = ((lng - rotationRef.current.lng) * Math.PI) / 180;
      const latRad = (lat * Math.PI) / 180;
      const centerLat = (rotationRef.current.lat * Math.PI) / 180;
      const x3 = Math.cos(latRad) * Math.sin(lon);
      const y3 = Math.sin(latRad) * Math.cos(centerLat) - Math.cos(latRad) * Math.cos(lon) * Math.sin(centerLat);
      const z3 = Math.sin(latRad) * Math.sin(centerLat) + Math.cos(latRad) * Math.cos(lon) * Math.cos(centerLat);
      return { x: cx + x3 * radius, y: cy - y3 * radius, visible: z3 > -.04, depth: z3 };
    };
    places.forEach((place, index) => {
      const point = project(place.lat, place.lng);
      if (!point.visible) return;
      const pulse = !reducedMotion && (index + heartbeat) % 4 === 0;
      context.beginPath();
      context.arc(point.x, point.y, pulse ? 10 : 7, 0, Math.PI * 2);
      context.strokeStyle = `${place.color}66`;
      context.lineWidth = 1;
      context.stroke();
      context.beginPath();
      context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      context.fillStyle = place.color;
      context.shadowColor = place.color;
      context.shadowBlur = 12;
      context.fill();
      context.shadowBlur = 0;
    });
  }, [zoom, textureReady, heartbeat, reducedMotion, showAircraftRoutes, showMaritimeRoutes, rotationVersion, places]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      const first = points[0];
      const second = points[1];
      pinchRef.current = { distance: Math.hypot(first.x - second.x, first.y - second.y), zoom };
      dragRef.current.active = false;
    } else {
      dragRef.current = { active: true, x: event.clientX, y: event.clientY, moved: false };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2) {
      const points = Array.from(pointersRef.current.values());
      const first = points[0];
      const second = points[1];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      const baseDistance = pinchRef.current.distance || distance;
      setZoom(Math.max(.76, Math.min(1.28, pinchRef.current.zoom * (distance / baseDistance))));
      return;
    }
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true;
    rotationRef.current.lng -= dx * .42;
    rotationRef.current.lat = Math.max(-65, Math.min(65, rotationRef.current.lat + dy * .32));
    dragRef.current.x = event.clientX;
    dragRef.current.y = event.clientY;
    setRotationVersion(current => current + 1);
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current.distance = 0;
    if (!dragRef.current.moved && pointersRef.current.size === 0) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const width = bounds.width;
      const height = bounds.height;
      const radius = Math.min(width * .37, height * .72) * zoom;
      const cx = width / 2;
      const cy = height / 2 - 4;
      let closest: { place: GlobePlace; distance: number } | null = null;
      places.forEach(place => {
        const lon = ((place.lng - rotationRef.current.lng) * Math.PI) / 180;
        const latRad = (place.lat * Math.PI) / 180;
        const centerLat = (rotationRef.current.lat * Math.PI) / 180;
        const x3 = Math.cos(latRad) * Math.sin(lon);
        const y3 = Math.sin(latRad) * Math.cos(centerLat) - Math.cos(latRad) * Math.cos(lon) * Math.sin(centerLat);
        const z3 = Math.sin(latRad) * Math.sin(centerLat) + Math.cos(latRad) * Math.cos(lon) * Math.cos(centerLat);
        const px = cx + x3 * radius;
        const py = cy - y3 * radius;
        const distance = Math.hypot(px - x, py - y);
        if (z3 > 0 && distance < 32 && (!closest || distance < closest.distance)) closest = { place, distance };
      });
      const tappedPlace = closest as { place: GlobePlace; distance: number } | null;
      if (tappedPlace) onSelect(tappedPlace.place);
    }
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const resetGlobe = () => { rotationRef.current = { lng: 12, lat: 8 }; setZoom(1); setRotationVersion(current => current + 1); };
  return (
    <div className="map-canvas globe-canvas" role="application" aria-label="Interactive real Earth globe. Drag to rotate, scroll or use controls to zoom, and tap a signal to inspect it.">
      <canvas ref={canvasRef} className="earth-globe" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={event => { event.preventDefault(); setZoom(value => Math.max(.76, Math.min(1.28, value - event.deltaY * .0008))); }} />
      <div className="globe-backdrop" />
      <div className="globe-hint"><Globe2 size={13} /> REAL EARTH SURFACE <span>·</span> DRAG / TOUCH TO ROTATE</div>
      <div className="globe-controls"><button aria-label="Zoom in" onClick={() => setZoom(value => Math.min(1.28, value + .08))}>+</button><button aria-label="Zoom out" onClick={() => setZoom(value => Math.max(.76, value - .08))}>−</button><button aria-label="Reset globe view" onClick={resetGlobe}><LocateFixed size={14} /></button></div>
      <div className="map-status"><span className="pulse-live" /> <span className="status-live-label">PUBLIC GEO LAYER</span> <span>·</span> NASA BLUE MARBLE BASE <span>·</span> TAP A SIGNAL FOR DETAILS</div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { data: snapshot } = trpc.intel.snapshot.useQuery(undefined, { staleTime: 60_000 });
  const { data: workspace } = trpc.workspace.get.useQuery(undefined, { enabled: Boolean(user) });
  const { data: alertHistory } = trpc.alerts.history.useQuery(undefined, { enabled: Boolean(user) });
  const savePreferences = trpc.workspace.savePreferences.useMutation();
  const reconLookup = trpc.recon.lookup.useMutation();
  const addArea = trpc.workspace.addArea.useMutation();
  const removeArea = trpc.workspace.removeArea.useMutation();
  const addRule = trpc.workspace.addRule.useMutation();
  const toggleRule = trpc.workspace.toggleRule.useMutation();
  const workspaceUtils = trpc.useUtils();
  const [activeLayers, setActiveLayers] = useState(layerCatalog.map(layer => layer.id));
  const liveGlobePlaces = useMemo(() => {
    const earthquakes = (snapshot?.earthquakes ?? []).slice(0, 4).map(item => ({
      name: item.place,
      lat: item.lat,
      lng: item.lon,
      color: "#62f5c8",
      label: item.title + " · " + item.place,
      source: item.source,
      category: "SEISMIC EVENT",
      metric: `${item.magnitude ?? "—"} Mw`,
      detail: "Public earthquake record",
      observedAt: item.observedAt,
      sourceUrl: item.sourceUrl,
    }));
    return [...earthquakes, ...fallbackGlobePlaces.filter(place => !earthquakes.some(item => item.name === place.name))];
  }, [snapshot]);
  const [selectedPlace, setSelectedPlace] = useState(fallbackGlobePlaces[0]);
  const [selectedEvent, setSelectedEvent] = useState("M 5.1 · Vanuatu");
  const [activeFilter, setActiveFilter] = useState("All events");
  const [showRecon, setShowRecon] = useState(false);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);
  const [query, setQuery] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [reconTarget, setReconTarget] = useState("");

  useEffect(() => {
    if (!workspace?.preferences?.visibleLayers) return;
    try { setActiveLayers(JSON.parse(workspace.preferences.visibleLayers) as string[]); } catch { /* keep safe defaults */ }
  }, [workspace?.preferences?.visibleLayers]);
  const filteredEvents = useMemo(() => events.filter(event => activeFilter === "All events" || event.category === activeFilter).filter(event => `${event.title} ${event.location}`.toLowerCase().includes(query.toLowerCase())), [activeFilter, query]);
  const toggleLayer = (id: string) => setActiveLayers(current => {
    const next = current.includes(id) ? current.filter(layer => layer !== id) : [...current, id];
    if (user) savePreferences.mutate({ visibleLayers: next, defaultRegion: "Global" });
    return next;
  });
  const handleMapSelect = (label: string) => {
    setSelectedEvent(label);
    const place = liveGlobePlaces.find(item => item.label === label);
    if (place) setSelectedPlace(place);
  };
  const handleGlobePlaceSelect = (place: GlobePlace) => {
    setSelectedPlace(place);
    setSelectedEvent(place.label);
  };
  const showWorkspace = () => { if (!user) startLogin(); else setShowWorkspacePanel(true); };

  return (
    <div className="osiris-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><Globe2 size={20} /></div><div><div className="brand-name">OSIRIS<span>°</span></div><div className="brand-subtitle">PUBLIC INTELLIGENCE WORKSPACE</div></div></div>
        <div className="topbar-center"><span className="live-indicator" /> DATA SERVICES ONLINE <span className="divider" /> 11 ACTIVE SOURCES <span className="divider" /> UTC 18:42</div>
        <div className="topbar-actions"><button className="icon-button" aria-label="Notifications"><Bell size={17} /><span className="notification-dot" /></button><button className="avatar-button" onClick={() => !user && startLogin()}>{user?.name?.slice(0, 1) || "A"}</button></div>
      </header>

      <div className="workspace">
        <aside className="left-rail">
          <div className="rail-section rail-main"><div className="eyebrow">WORKSPACE</div><button className="rail-link active"><Compass size={17} />Overview</button><button className="rail-link"><Layers3 size={17} />Layers <span className="rail-count">7</span></button><button className="rail-link"><Bell size={17} />Alert rules <span className="rail-count accent">3</span></button><button className="rail-link"><MapPin size={17} />Followed areas</button></div>
          <div className="rail-section"><div className="eyebrow">TOOLS</div><button className={`rail-link ${showRecon ? "active" : ""}`} onClick={() => setShowRecon(!showRecon)}><TerminalSquare size={17} />Defensive recon</button><button className="rail-link"><Database size={17} />Source registry</button><button className="rail-link"><ShieldCheck size={17} />Use & privacy</button></div>
          <div className="rail-bottom"><div className="coverage-card"><div className="coverage-head"><span>Coverage health</span><Wifi size={14} /></div><div className="coverage-value">98.4<span>%</span></div><div className="coverage-track"><i /></div><p>Last sync · 2 min ago</p></div><button className="rail-link muted"><SlidersHorizontal size={17} />Preferences</button></div>
        </aside>

        <main className="content-area">
          <div className="page-heading"><div><div className="eyebrow">GLOBAL OPERATIONS / OVERVIEW</div><h1>Situational awareness, <em>without the noise.</em></h1><p>Explore clearly sourced public signals across the planet. Every marker carries its origin, timestamp, and permitted-use boundary.</p></div><div className="heading-actions"><Button variant="outline" className="save-button" onClick={showWorkspace}><Sparkles size={15} /> {user ? "Workspace saved" : "Save workspace"}</Button><button className="more-button" aria-label="More options"><Menu size={19} /></button></div></div>

          <div className="stat-strip"><div className="stat-card"><div className="stat-label"><span className="stat-icon teal"><Activity size={15} /></span>EVENTS IN VIEW</div><div className="stat-number">2,847</div><div className="stat-foot positive"><ArrowUpRight size={13} /> 12.8% vs. 24h</div></div><div className="stat-card"><div className="stat-label"><span className="stat-icon orange"><AlertTriangle size={15} /></span>ACTIVE ALERTS</div><div className="stat-number">{alertHistory?.length ?? 18}</div><div className="stat-foot warning"><span className="mini-dot" /> 4 require review</div></div><div className="stat-card"><div className="stat-label"><span className="stat-icon blue"><Database size={15} /></span>PUBLIC SOURCES</div><div className="stat-number">11<span className="stat-unit"> / 11</span></div><div className="stat-foot neutral"><Check size={13} /> All responding</div></div><div className="stat-card"><div className="stat-label"><span className="stat-icon purple"><Target size={15} /></span>FOLLOWED AREAS</div><div className="stat-number">06</div><div className="stat-foot neutral"><MapPin size={13} /> Personal workspace</div></div></div>

          <section className="dashboard-grid">
            <div className="map-panel panel"><div className="panel-header"><div><div className="panel-title"><span className="panel-kicker">LIVE MAP</span>Global signal field</div><div className="panel-meta"><span className="pulse-live" /> {snapshot?.meta.freshness ?? "Public feeds · refreshed continuously"}</div></div><div className="panel-actions"><div className="map-search"><Search size={13} /><input value={mapQuery} onChange={event => setMapQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && mapQuery.trim()) { const place = liveGlobePlaces.find(item => `${item.label} ${item.name}`.toLowerCase().includes(mapQuery.toLowerCase())); if (place) handleGlobePlaceSelect(place); else setSelectedEvent(`${mapQuery.trim()} · public index`); } }} placeholder="Search map" /></div><button className="ghost-button"><Crosshair size={15} /> Focus</button><button className="ghost-button"><Boxes size={15} /> Base map <ChevronDown size={13} /></button></div></div><div className="map-wrap"><MapCanvas activeLayers={activeLayers} places={liveGlobePlaces} onSelect={handleGlobePlaceSelect} /><div className="map-inspector"><div className="inspector-top"><span className="event-type">{selectedPlace.category}</span><button aria-label="Close inspector"><X size={14} /></button></div><h3>{selectedPlace.label}</h3><p className="inspector-location"><MapPin size={13} /> {selectedPlace.name} · Public geo record</p><div className="inspector-grid"><div><span>Signal</span><b>{selectedPlace.metric}</b></div><div><span>Context</span><b>{selectedPlace.detail}</b></div><div><span>Observed</span><b>{selectedPlace.observedAt ? new Date(selectedPlace.observedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Fallback"}</b></div></div><div className="inspector-source"><SourceTag source={selectedPlace.source} /><ExternalLink size={13} /></div><div className="inspector-boundary"><ShieldCheck size={13} /> {selectedPlace.availability ?? "Public source · informational use only"}</div></div></div><div className="map-legend"><span><i className="legend-dot teal" />Seismic</span><span><i className="legend-dot orange" />Fire</span><span><i className="legend-dot purple" />Aviation</span><span><i className="legend-dot blue" />Weather</span><span><i className="legend-dot cyan" />Maritime</span></div></div>

            <div className="layers-panel panel"><div className="panel-header"><div><div className="panel-title"><span className="panel-kicker">CONTROL ROOM</span>Signal layers</div><div className="panel-meta">Select what you want to see</div></div><button className="icon-button small"><SlidersHorizontal size={15} /></button></div><div className="layer-list">{layerCatalog.map(layer => { const Icon = layer.icon; const active = activeLayers.includes(layer.id); return <button key={layer.id} className={`layer-row ${active ? "selected" : ""}`} onClick={() => toggleLayer(layer.id)}><span className={`layer-symbol ${layer.color}`}><Icon size={15} /></span><span className="layer-copy"><b>{layer.label}</b><small>{active ? "Visible on map" : "Hidden from map"}</small></span><span className="layer-count">{layer.count}</span><span className={`toggle ${active ? "on" : ""}`}><i /></span></button>; })}</div><div className="layers-footer"><span><Eye size={13} /> {activeLayers.length} of 7 layers visible</span><button onClick={() => setActiveLayers(layerCatalog.map(layer => layer.id))}>Show all</button></div></div>
          </section>

          <section className="lower-grid"><div className="events-panel panel"><div className="panel-header"><div><div className="panel-title"><span className="panel-kicker">SIGNAL STREAM</span>Public alerts & events</div><div className="panel-meta">Ranked by relevance to your workspace</div></div><button className="ghost-button">View all <ArrowUpRight size={14} /></button></div><div className="event-toolbar"><div className="filter-pills">{["All events", "Seismic", "Weather", "Fire", "Maritime"].map(filter => <button key={filter} className={activeFilter === filter ? "active" : ""} onClick={() => setActiveFilter(filter)}>{filter}</button>)}</div><div className="search-field"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search events" /></div></div><div className="events-list">{filteredEvents.map(event => { const Icon = event.icon; return <button className="event-row" key={event.id} onClick={() => setSelectedEvent(event.title + " · " + event.location.split(" · ")[0])}><span className={`event-icon ${event.severity}`}><Icon size={16} /></span><span className="event-copy"><b>{event.title}</b><small>{event.location}</small></span><span className="event-source"><SourceTag source={event.source} /><small>{event.time}</small></span><span className={`severity-pill ${event.severity}`}>{event.severity}</span><ArrowUpRight className="row-arrow" size={14} /></button>; })}</div></div><div className="side-stack"><div className="relevance-card panel"><div className="relevance-orb"><div className="orb-ring ring-a" /><div className="orb-ring ring-b" /><Sparkles size={21} /></div><div><div className="panel-kicker">YOUR SIGNAL PROFILE</div><h3>Relevance is personal.</h3><p>Follow areas and define alert rules to make this workspace yours.</p><button className="text-button" onClick={showWorkspace}>Configure workspace <ArrowUpRight size={14} /></button></div></div><div className="provenance-card panel"><div className="provenance-head"><ShieldCheck size={16} /><b>Every signal is accountable</b></div><p>Source, timestamp, coverage, and permitted-use boundaries travel with every result.</p><div className="provenance-items"><span><Check size={12} /> Public source</span><span><Check size={12} /> Time-stamped</span><span><Check size={12} /> Use-labeled</span></div></div></div></section>

          {showWorkspacePanel && <section className="workspace-panel panel"><div className="panel-header"><div><div className="panel-title"><span className="panel-kicker">PERSONAL WORKSPACE</span>Preferences & alert rules</div><div className="panel-meta">Saved to your account · never shared publicly</div></div><button className="icon-button small" onClick={() => setShowWorkspacePanel(false)}><X size={15} /></button></div><div className="workspace-settings-grid"><div><div className="settings-label">FOLLOWED AREAS</div><div className="followed-area-list">{(workspace?.areas?.length ? workspace.areas : [{ id: "demo-1", name: "South Pacific", region: "Vanuatu · Tonga" }, { id: "demo-2", name: "Mediterranean", region: "Italy · Greece" }]).map(area => <button className="followed-area" key={area.id} onClick={async () => { if (typeof area.id === "number") { await removeArea.mutateAsync({ id: area.id }); await workspaceUtils.workspace.get.invalidate(); } }}><span className="area-pin"><MapPin size={13} /></span><span><b>{area.name}</b><small>{area.region}</small></span>{typeof area.id === "number" ? <X size={13} /> : <Check size={13} />}</button>)}</div><button className="text-button settings-action" onClick={async () => { const name = window.prompt("Area name"); const region = window.prompt("Region or countries"); if (name && region) { await addArea.mutateAsync({ name, region }); await workspaceUtils.workspace.get.invalidate(); } }}>+ Add followed area</button></div><div><div className="settings-label">ALERT RULES</div><div className="rule-list">{(workspace?.rules?.length ? workspace.rules : [{ id: "demo-rule-1", name: "High-severity events", category: "All public layers", severity: "high" }, { id: "demo-rule-2", name: "Seismic activity", category: "South Pacific", severity: "moderate" }]).map(rule => <button className="rule-row" key={rule.id} onClick={async () => { if (typeof rule.id === "number") { await toggleRule.mutateAsync({ id: rule.id, enabled: false }); await workspaceUtils.workspace.get.invalidate(); } }}><span className={`rule-dot ${rule.severity}`} /><span><b>{rule.name}</b><small>{rule.category}</small></span><span className="rule-status">ON</span></button>)}</div><button className="text-button settings-action" onClick={async () => { const name = window.prompt("Rule name"); if (name) { await addRule.mutateAsync({ name, category: "All public layers", severity: "moderate", region: "Global" }); await workspaceUtils.workspace.get.invalidate(); } }}>+ Create alert rule</button></div></div><div className="settings-notice"><ShieldCheck size={14} /> Alerts are generated only from configured public sources and include provenance metadata.</div></section>}

          {showRecon && <section className="recon-panel panel"><div className="panel-header"><div><div className="panel-title"><span className="panel-kicker">AUTHORIZED TOOLING</span>Defensive reconnaissance</div><div className="panel-meta"><LockKeyhole size={13} /> Only query assets you own or are explicitly authorized to assess</div></div><button className="icon-button small" onClick={() => setShowRecon(false)}><X size={15} /></button></div><div className="recon-body"><div className="recon-input"><Input value={reconTarget} onChange={event => setReconTarget(event.target.value)} placeholder="example.org or 203.0.113.12" /><Button disabled={!user || reconLookup.isPending || reconTarget.length < 3} onClick={() => reconLookup.mutate({ target: reconTarget })}><Search size={15} /> {reconLookup.isPending ? "Checking…" : "Run lookup"}</Button></div><div className="recon-tools"><span><Check size={12} /> DNS records</span><span><Check size={12} /> WHOIS</span><span><Check size={12} /> TLS certificate</span><span><Check size={12} /> Public CVE references</span></div><div className="recon-notice"><ShieldCheck size={15} /><span>No port scanning, exploitation, credential testing, tracking, or private-data collection is available in this workspace.</span></div>{reconLookup.data && <div className="recon-result"><div><span>LAST CHECKED</span><b>{reconLookup.data.target}</b></div><div><span>DNS A RECORDS</span><b>{reconLookup.data.dns.ipv4.length || "—"}</b></div><div><span>RDAP / WHOIS</span><b>{reconLookup.data.rdap ? "Available" : "Unavailable"}</b></div><div><span>PUBLIC CVE MATCHES</span><b>{reconLookup.data.cves && typeof reconLookup.data.cves === "object" && "vulnerabilities" in reconLookup.data.cves ? (reconLookup.data.cves as { vulnerabilities: unknown[] }).vulnerabilities.length : "—"}</b></div><small>Source timestamp: {new Date(reconLookup.data.checkedAt).toLocaleString()} · Public reference data only</small></div>}</div></section>}

          <footer className="workspace-footer"><span><span className="pulse-live" /> All systems nominal · Data may be delayed or incomplete</span><span>OSIRIS v0.1 · Public data only · <a href="#privacy">Privacy & permitted use</a></span></footer>
        </main>
      </div>
    </div>
  );
}

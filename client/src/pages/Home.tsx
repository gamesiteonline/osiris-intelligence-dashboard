import { useEffect, useMemo, useState } from "react";
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

function MapCanvas({ activeLayers, onSelect }: { activeLayers: string[]; onSelect: (label: string) => void }) {
  const [heartbeat, setHeartbeat] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setHeartbeat(current => (current + 1) % 4), 2600);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="map-canvas" role="img" aria-label="Stylized global map showing public intelligence events">
      <div className="map-grid" />
      <div className="map-glow map-glow-one" />
      <div className="map-glow map-glow-two" />
      <svg className="map-land" viewBox="0 0 1000 480" preserveAspectRatio="none" aria-hidden="true">
        <path d="M62 116l54-37 65 16 28 38 58 23 23 46-37 17-42-23-50 8-41-29-52 1-25-27zM316 104l53-24 67 14 39 30 47-1 39 29-36 35-65-8-45 22-33-30-53-12-26-29zM578 91l72-22 47 21 31 39-17 33-55 3-32 35-47-20 13-38-33-20zM744 229l51-18 55 29 22 51-27 38-48-11-36-40-38-20zM235 301l67-17 40 24 29 57-27 41-55-8-34-42-48-17zM454 300l83-25 55 39 2 49-58 23-62-19-43-34z" />
      </svg>
      <div className="map-label map-label-north">NORTH ATLANTIC</div>
      <div className="map-label map-label-pacific">PACIFIC OCEAN</div>
      <div className="map-label map-label-sahara">SAHARA</div>
      <svg className="map-signal-arcs" viewBox="0 0 1000 480" preserveAspectRatio="none" aria-hidden="true">
        <circle className="signal-arc arc-one" cx="170" cy="130" r="34" />
        <circle className="signal-arc arc-two" cx="710" cy="190" r="52" />
        <circle className="signal-arc arc-three" cx="560" cy="305" r="42" />
      </svg>
      <div className="map-scale"><span>0</span><i /><span>2,000 km</span></div>
      {mapDots.map(([x, y, color, label], index) => {
        const visible = activeLayers.length > 0 || index < 4;
        const livePulse = (index + heartbeat) % 4 === 0;
        return visible ? <button key={label + index} className={`map-dot dot-${color} ${livePulse ? "is-live" : ""}`} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(index % 5) * 180}ms` }} onClick={() => onSelect(label)} aria-label={`Inspect ${label}`}><span className="marker-core" /><span className="marker-halo" /><b /></button> : null;
      })}
      <div className="map-controls"><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button><button aria-label="Locate me"><LocateFixed size={15} /></button></div>
      <div className="map-status"><span className="pulse-live" /> <span className="status-live-label">SIMULATED HEARTBEAT</span> <span>·</span> PUBLIC FEED MOTION <span>·</span> 18:42:16 UTC</div>
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
            <div className="map-panel panel"><div className="panel-header"><div><div className="panel-title"><span className="panel-kicker">LIVE MAP</span>Global signal field</div><div className="panel-meta"><span className="pulse-live" /> {snapshot?.meta.freshness ?? "Public feeds · refreshed continuously"}</div></div><div className="panel-actions"><div className="map-search"><Search size={13} /><input value={mapQuery} onChange={event => setMapQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && mapQuery.trim()) { const match = snapshot?.earthquakes.find(item => `${item.title} ${item.place}`.toLowerCase().includes(mapQuery.toLowerCase())); setSelectedEvent(match ? `${match.title} · ${match.place}` : `${mapQuery.trim()} · public index`); } }} placeholder="Search map" /></div><button className="ghost-button"><Crosshair size={15} /> Focus</button><button className="ghost-button"><Boxes size={15} /> Base map <ChevronDown size={13} /></button></div></div><div className="map-wrap"><MapCanvas activeLayers={activeLayers} onSelect={setSelectedEvent} /><div className="map-inspector"><div className="inspector-top"><span className="event-type">SEISMIC EVENT</span><button aria-label="Close inspector"><X size={14} /></button></div><h3>{selectedEvent}</h3><p className="inspector-location"><MapPin size={13} /> Vanuatu · South Pacific</p><div className="inspector-grid"><div><span>Magnitude</span><b>5.1 Mw</b></div><div><span>Depth</span><b>81 km</b></div><div><span>Updated</span><b>4 min ago</b></div></div><div className="inspector-source"><SourceTag source="USGS Earthquake Hazards" /><ExternalLink size={13} /></div><div className="inspector-boundary"><ShieldCheck size={13} /> Public source · informational use only</div></div></div><div className="map-legend"><span><i className="legend-dot teal" />Seismic</span><span><i className="legend-dot orange" />Fire</span><span><i className="legend-dot purple" />Aviation</span><span><i className="legend-dot blue" />Weather</span><span><i className="legend-dot cyan" />Maritime</span></div></div>

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

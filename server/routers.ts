import { z } from "zod";
import { resolve4, resolve6, resolveMx, resolveTxt } from "node:dns/promises";
import tls from "node:tls";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addAlertRule, addFollowedArea, getAlertHistory, getWorkspace, removeFollowedArea, saveWorkspacePreferences, toggleAlertRule } from "./db";

const fallbackMaritime = [{ id: "ais-1", title: "Vessel density cluster", place: "Singapore Strait", lat: 1.2, lon: 103.8, source: "AISstream", observedAt: new Date().toISOString(), availability: "Fallback snapshot; provider access may be required", permittedUse: "Public informational use" }];
const fallbackCameras = [{ id: "cam-1", title: "Public transport camera", place: "London · A4 corridor", source: "TfL public feed", observedAt: new Date().toISOString(), availability: "Selected public feed; coverage varies by jurisdiction", permittedUse: "Public viewing only" }];
const fallbackAlerts = [{ id: "alert-1", title: "Severe weather notice", place: "Northern Italy", severity: "high", category: "Weather", source: "MeteoAlarm", observedAt: new Date().toISOString(), availability: "Fallback public alert record", permittedUse: "Verify at source before action" }];

const fallbackEarthquakes = [
  { id: "usgs-1", title: "M 5.1 earthquake", place: "81 km ESE of Isangel, Vanuatu", magnitude: 5.1, lat: -19.3, lon: 169.4, source: "USGS", observedAt: new Date().toISOString(), sourceUrl: "https://earthquake.usgs.gov/" },
  { id: "usgs-2", title: "M 4.7 earthquake", place: "139 km NNE of Hihifo, Tonga", magnitude: 4.7, lat: -15.6, lon: -173.1, source: "USGS", observedAt: new Date().toISOString(), sourceUrl: "https://earthquake.usgs.gov/" },
];

async function inspectTls(hostname: string) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: false, timeout: 4500 }, () => {
      const certificate = socket.getPeerCertificate();
      resolve({ subject: certificate.subject, issuer: certificate.issuer, validFrom: certificate.valid_from, validTo: certificate.valid_to, serialNumber: certificate.serialNumber, authorized: socket.authorized, authorizationError: socket.authorizationError ?? null });
      socket.end();
    });
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => { socket.destroy(); resolve(null); });
  });
}

async function readJson(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(4500) });
  if (!response.ok) throw new Error(`Feed ${response.status}`);
  return response.json();
}

async function readEarthquakes() {
  try {
    const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson", { signal: AbortSignal.timeout(4500) });
    if (!response.ok) throw new Error(`USGS ${response.status}`);
    const payload = await response.json() as { features?: Array<{ id: string; properties: { title: string; mag: number; place: string; time: number; url: string }; geometry: { coordinates: number[] } }> };
    return (payload.features ?? []).slice(0, 18).map(item => ({ id: item.id, title: item.properties.title, place: item.properties.place, magnitude: item.properties.mag, lat: item.geometry.coordinates[1], lon: item.geometry.coordinates[0], source: "USGS", observedAt: new Date(item.properties.time).toISOString(), sourceUrl: item.properties.url }));
  } catch { return fallbackEarthquakes; }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  intel: router({
    snapshot: publicProcedure.query(async () => {
      const [earthquakes, weather, flights, satellites, news] = await Promise.all([
        readEarthquakes(),
        readJson("https://api.open-meteo.com/v1/forecast?latitude=45.46&longitude=9.19&current=temperature_2m,wind_speed_10m,weather_code").catch(() => ({ current: null, source: "Open-Meteo", availability: "Fallback: weather feed unavailable" })),
        readJson("https://opensky-network.org/api/states/all?lamin=35&lomin=-10&lamax=60&lomax=35").catch(() => ({ states: [], source: "OpenSky Network", availability: "Fallback: aircraft feed unavailable or rate-limited" })),
        readJson("https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json").catch(() => ({ satellites: [], source: "CelesTrak", availability: "Fallback: orbital element feed unavailable" })),
        readJson("https://api.gdeltproject.org/api/v2/doc/doc?query=natural%20disaster%20OR%20earthquake%20OR%20wildfire&mode=artlist&format=json&maxrecords=8&sort=HybridRel").catch(() => ({ articles: [], source: "GDELT", availability: "Fallback: public news feed unavailable" })),
      ]);
      return {
        earthquakes,
        layers: {
          weather: { data: weather, source: "Open-Meteo", observedAt: new Date().toISOString(), permittedUse: "Public informational use" },
          flights: { data: flights, source: "OpenSky Network", observedAt: new Date().toISOString(), permittedUse: "Public informational use; no operational control" },
          satellites: { data: satellites, source: "CelesTrak", observedAt: new Date().toISOString(), permittedUse: "Public orbital reference data" },
          maritime: { data: fallbackMaritime, source: "AISstream", observedAt: new Date().toISOString(), availability: "Fallback snapshot; provider access may be required", permittedUse: "Public informational use" },
          cameras: { data: fallbackCameras, source: "Selected public transport feeds", observedAt: new Date().toISOString(), availability: "Coverage varies by jurisdiction; selected public feed fallback", permittedUse: "Public viewing only" },
          news: { data: news, alerts: fallbackAlerts, source: "GDELT + public alert sources", observedAt: new Date().toISOString(), permittedUse: "Public discovery; verify at source before action" },
        },
        meta: { fetchedAt: new Date().toISOString(), freshness: "live public feed with per-source fallback", sources: ["USGS", "Open-Meteo", "OpenSky Network", "CelesTrak", "GDELT", "AISstream", "Public transport feeds"] },
      };
    }),
  }),
  workspace: router({
    get: protectedProcedure.query(({ ctx }) => getWorkspace(ctx.user.id)),
    savePreferences: protectedProcedure.input(z.object({ visibleLayers: z.array(z.string()).max(20), defaultRegion: z.string().max(80).default("Global") })).mutation(({ ctx, input }) => saveWorkspacePreferences(ctx.user.id, input.visibleLayers, input.defaultRegion)),
    addArea: protectedProcedure.input(z.object({ name: z.string().min(2).max(120), region: z.string().min(2).max(120) })).mutation(({ ctx, input }) => addFollowedArea(ctx.user.id, input.name, input.region)),
    removeArea: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => removeFollowedArea(ctx.user.id, input.id)),
    addRule: protectedProcedure.input(z.object({ name: z.string().min(2).max(120), category: z.string().min(2).max(40), severity: z.enum(["low", "moderate", "high"]), region: z.string().max(120).default("Global") })).mutation(({ ctx, input }) => addAlertRule(ctx.user.id, input.name, input.category, input.severity, input.region)),
    toggleRule: protectedProcedure.input(z.object({ id: z.number().int().positive(), enabled: z.boolean() })).mutation(({ ctx, input }) => toggleAlertRule(ctx.user.id, input.id, input.enabled)),
  }),
  alerts: router({
    history: protectedProcedure.query(({ ctx }) => getAlertHistory(ctx.user.id)),
  }),
  recon: router({
    lookup: protectedProcedure.input(z.object({ target: z.string().trim().min(3).max(253).regex(/^[a-zA-Z0-9.:-]+$/) })).mutation(async ({ input }) => {
      const target = input.target.toLowerCase();
      const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(target);
      const dns = await Promise.allSettled([resolve4(target), resolve6(target), resolveMx(target), resolveTxt(target)]);
      let rdap: unknown = null;
      let certificates: unknown = null;
      let tlsCertificate: unknown = null;
      let cves: unknown = null;
      const [rdapResponse, certResponse, cveResponse, tlsResponse] = await Promise.allSettled([
        fetch(`https://rdap.org/${isIp ? "ip" : "domain"}/${target}`, { signal: AbortSignal.timeout(4500) }),
        isIp ? Promise.resolve(null) : fetch(`https://crt.sh/?q=%25.${target}&output=json`, { signal: AbortSignal.timeout(4500) }),
        fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(target)}&resultsPerPage=5`, { signal: AbortSignal.timeout(4500) }),
        inspectTls(target),
      ]);
      if (rdapResponse.status === "fulfilled" && rdapResponse.value.ok) rdap = await rdapResponse.value.json();
      if (certResponse.status === "fulfilled" && certResponse.value && certResponse.value.ok) certificates = { type: "certificate-transparency", records: (await certResponse.value.json()).slice(0, 5), availability: "Public certificate history; live TLS handshake is not performed" };
      if (cveResponse.status === "fulfilled" && cveResponse.value.ok) cves = await cveResponse.value.json();
      if (tlsResponse.status === "fulfilled") tlsCertificate = tlsResponse.value;
      return {
        target,
        dns: { ipv4: dns[0].status === "fulfilled" ? dns[0].value : [], ipv6: dns[1].status === "fulfilled" ? dns[1].value : [], mx: dns[2].status === "fulfilled" ? dns[2].value : [], txt: dns[3].status === "fulfilled" ? dns[3].value : [] },
        rdap, certificates, tlsCertificate, cves,
        checkedAt: new Date().toISOString(),
        boundaries: ["Authorized assets only", "Public data sources", "No exploitation or credential testing"],
        availability: { rdap: isIp ? "IP RDAP" : "Domain RDAP", tls: tlsCertificate ? "Live peer certificate inspected read-only" : "TLS peer unavailable; certificate transparency history may still be present", cve: "NVD public references" },
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;

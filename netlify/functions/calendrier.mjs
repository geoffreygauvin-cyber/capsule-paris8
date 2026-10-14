import { getStore } from "@netlify/blobs";
import { timingSafeEqual, createHash } from "node:crypto";
import { chargerTout, icsFeed, vue } from "../lib/rdv.mjs";

export const config = { path: "/api/calendrier.ics" };
const h = (x) => createHash("sha256").update(String(x)).digest();

// Flux d'agenda pour Google Agenda / Outlook / Apple : /api/calendrier.ics?k=<CAL_TOKEN>
export default async (req) => {
  const k = new URL(req.url).searchParams.get("k") || "", t = process.env.CAL_TOKEN;
  if (!t || !timingSafeEqual(h(k), h(t))) return new Response("Accès refusé", { status: 403 });
  const rdvs = (await chargerTout(getStore("demandes"))).flatMap((x) => x.rec.rdvs.map((y) => vue(x.rec, y)));
  return new Response(icsFeed(rdvs), { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
};

import * as AG from "../lib/agenda.mjs";

export const config = { path: "/api/agenda.ics" };

// Agenda personnel d'un compte : /api/agenda.ics?t=<jeton>. Le jeton est donné par l'action « agenda_lien » de la plateforme (voir netlify/lib/agenda.mjs).
export default async (req) => {
  const t = new URL(req.url).searchParams.get("t") || "";
  const user = await AG.lire(t);
  if (!user || !(await AG.existe(user))) return new Response("Lien invalide ou désactivé", { status: 404, headers: { "x-robots-tag": "noindex", "cache-control": "no-store" } });
  return new Response(await AG.ics(user), { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'inline; filename="capsule-agenda.ics"', "cache-control": "private, max-age=300", "x-robots-tag": "noindex" } });
};

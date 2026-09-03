import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const remoteMode = () => (url && key ? "cloud" : "local-preview");
export const normalizeRemoteCode = (value = "") => value.replace(/\D/g, "").slice(0, 6);
export function generateRemoteCode() {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

export function createRemoteChannel({ eventId, code, onEvent, onStatus }) {
  const normalized = normalizeRemoteCode(code);
  const topic = `event-remote-${String(eventId || "event").replace(/[^a-z0-9-]/gi, "-")}-${normalized}`;
  if (!normalized) return { send: async () => "no-code", close: () => {} };
  if (remoteMode() === "cloud") {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const channel = client.channel(topic, { config: { broadcast: { ack: true, self: false } } });
    ["command", "pairing", "state"].forEach((event) => channel.on("broadcast", { event }, ({ payload }) => onEvent?.(event, payload)));
    channel.subscribe((status) => onStatus?.(status === "SUBSCRIBED" ? "ready" : status.toLowerCase()));
    return { send: (event, payload) => channel.send({ type: "broadcast", event, payload }), close: () => client.removeChannel(channel) };
  }
  const channel = new BroadcastChannel(topic);
  channel.onmessage = ({ data }) => onEvent?.(data?.event, data?.payload);
  window.queueMicrotask(() => onStatus?.("ready"));
  return { send: async (event, payload) => { channel.postMessage({ event, payload }); return "ok"; }, close: () => channel.close() };
}

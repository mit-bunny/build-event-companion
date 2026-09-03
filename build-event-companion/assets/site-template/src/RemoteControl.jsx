import { useEffect, useRef, useState } from "react";
import { createRemoteChannel, generateRemoteCode, normalizeRemoteCode, remoteMode } from "./remote";

const makeCommand = (kind, values = {}) => ({ id: window.crypto.randomUUID(), kind, ...values });

export function RemotePage({ event, modules }) {
  const [code] = useState(() => { const saved = sessionStorage.getItem("event-remote-code"); const next = saved || generateRemoteCode(); sessionStorage.setItem("event-remote-code", next); return next; });
  const [status, setStatus] = useState("connecting");
  const [paired, setPaired] = useState(false);
  const [activeId, setActiveId] = useState(modules[0]?.id || "");
  const channelRef = useRef(null);
  useEffect(() => {
    const channel = createRemoteChannel({ eventId: event.id, code, onStatus: setStatus, onEvent: (type, payload) => { if (type === "pairing" && payload?.kind === "display-ready") { setPaired(true); channel.send("pairing", { kind: "remote-ready" }); } if (type === "state" && payload?.activeId) setActiveId(payload.activeId); } });
    channelRef.current = channel;
    const announce = () => channel.send("pairing", { kind: "remote-ready" });
    const interval = window.setInterval(announce, 1500); announce();
    return () => { window.clearInterval(interval); channel.close(); };
  }, [code, event.id]);
  const send = (payload) => { channelRef.current?.send("command", payload); if (payload.kind === "navigate") setActiveId(payload.moduleId); };
  return <main className="phone-remote"><section><p className="eyebrow">Phone remote</p><h1>{event.title}</h1><p>Enter this code on the display:</p><strong className="remote-code">{code}</strong><p>{paired ? "Connected to display" : status === "ready" ? "Waiting for display" : "Connecting…"}</p>{remoteMode() === "local-preview" && <small>Local preview only. Configure Supabase before using a separate device.</small>}</section><section><h2>Sections</h2><div className="remote-grid">{modules.map((module) => <button className={activeId === module.id ? "active" : ""} type="button" onClick={() => send(makeCommand("navigate", { moduleId: module.id }))} key={module.id}>{module.label}</button>)}</div><h2>Lineup</h2><button type="button" onClick={() => send(makeCommand("lineup", { action: "shuffle" }))}>Randomize presenters</button><h2>Timer</h2><div className="remote-grid"><button type="button" onClick={() => send(makeCommand("timer", { action: "start" }))}>Start</button><button type="button" onClick={() => send(makeCommand("timer", { action: "pause" }))}>Pause</button><button type="button" onClick={() => send(makeCommand("timer", { action: "reset" }))}>Reset</button><button type="button" onClick={() => send(makeCommand("timer", { action: "stop-alarm" }))}>Stop alarm</button></div></section></main>;
}

export function useDisplayRemote({ eventId, enabled, modules, activeId, setActiveId }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState(() => sessionStorage.getItem("event-display-remote-code") || "");
  const [status, setStatus] = useState(code ? "connecting" : "idle");
  const [remoteCommand, setRemoteCommand] = useState(null);
  const channelRef = useRef(null);
  useEffect(() => {
    if (!enabled || !code) return undefined;
    const channel = createRemoteChannel({ eventId, code, onStatus: (next) => { setStatus(next === "ready" ? "waiting" : next); if (next === "ready") channel.send("pairing", { kind: "display-ready" }); }, onEvent: (type, payload) => { if (type === "command") setRemoteCommand({ ...payload, receivedAt: Date.now() }); if (type === "pairing" && payload?.kind === "remote-ready") setStatus("connected"); } });
    channelRef.current = channel;
    const interval = window.setInterval(() => channel.send("pairing", { kind: "display-ready" }), 1500);
    return () => { window.clearInterval(interval); channel.close(); channelRef.current = null; };
  }, [code, enabled, eventId]);
  useEffect(() => { if (remoteCommand?.kind === "navigate" && modules.some((module) => module.id === remoteCommand.moduleId)) setActiveId(remoteCommand.moduleId); }, [remoteCommand?.id]);
  useEffect(() => { channelRef.current?.send("state", { activeId }); }, [activeId, status]);
  const pair = (event) => { event.preventDefault(); const next = normalizeRemoteCode(draft); if (next.length !== 6) return; sessionStorage.setItem("event-display-remote-code", next); setCode(next); setStatus("connecting"); };
  const disconnect = () => { sessionStorage.removeItem("event-display-remote-code"); setCode(""); setStatus("idle"); };
  return { open, setOpen, draft, setDraft: (value) => setDraft(normalizeRemoteCode(value)), code, status, remoteCommand, pair, disconnect };
}

export function PairRemote({ remote }) {
  return <div className="display-remote"><button type="button" onClick={() => remote.setOpen(!remote.open)}>{remote.status === "connected" ? "● Remote connected" : "Phone remote"}</button>{remote.open && <aside><strong>{remote.status === "connected" ? `Connected · ${remote.code}` : "Enter the six-digit phone code"}</strong>{remote.status !== "connected" ? <form onSubmit={remote.pair}><input inputMode="numeric" value={remote.draft} onChange={(event) => remote.setDraft(event.target.value)} placeholder="000000" aria-label="Six-digit remote code" /><button type="submit">Connect</button></form> : <button type="button" onClick={remote.disconnect}>Disconnect</button>}{remoteMode() === "local-preview" && <small>Local preview until Supabase is configured.</small>}</aside>}</div>;
}

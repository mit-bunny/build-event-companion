import { useEffect, useMemo, useRef, useState } from "react";

const tone = (item) => [...(item.id || item.name || "presenter")].reduce((sum, char) => sum + char.codePointAt(0), 0) % 5;
const shuffle = (items) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

export function WelcomeModule({ module }) {
  const content = module.content || {};
  const qrScale = Math.max(1, Number(content.qrScale) || 1);
  const qrOffsetY = Number(content.qrOffsetY) || 0;
  const qrFocused = qrScale > 1 || qrOffsetY !== 0;
  return <section className="run-welcome">
    {content.poster && <img className="run-poster" src={content.poster} alt={content.posterAlt || "Event poster"} />}
    <article><p className="eyebrow">{content.kicker || "Welcome"}</p><h2>{content.headline || module.label}</h2>{content.headlineAlt && <h3>{content.headlineAlt}</h3>}<p>{content.message}</p>{content.messageAlt && <p>{content.messageAlt}</p>}{content.stats?.length > 0 && <div className="run-stats">{content.stats.map((stat) => <span key={stat.label}><strong>{stat.value}</strong>{stat.label}</span>)}</div>}</article>
    {content.qr && <aside style={{ "--qr-scale": qrScale, "--qr-offset-y": `${qrOffsetY}%` }}><div className={`run-qr-frame ${qrFocused ? "is-focused" : ""}`}><img src={content.qr} alt={content.qrAlt || "Event QR code"} /></div><strong data-critical-visible>{content.qrLabel || "Scan to join"}</strong></aside>}
  </section>;
}

export function RoomAnalysis({ module }) {
  const categories = [...(module.content?.categories || [])].sort((left, right) => (right.count || 0) - (left.count || 0));
  const total = module.content?.total || categories.reduce((sum, category) => sum + (category.count || 0), 0);
  const max = Math.max(...categories.map((category) => category.count), 1);
  return <section className="run-room"><header><p className="eyebrow">{total} guests</p><h2>{module.content?.headline || "Who’s in the room?"}</h2></header><div className="run-role-chart">{categories.map((category) => {
    const percentage = total ? Math.round((category.count || 0) / total * 100) : 0;
    return <details key={category.label}><summary><div><strong>{category.label}</strong>{category.labelAlt && <span>{category.labelAlt}</span>}</div><div className="run-bar"><i style={{ width: `${(category.count || 0) / max * 100}%`, background: category.color }} /></div><b>{category.count || 0}<small>{percentage}%</small></b></summary>{category.members?.length > 0 && <p>{category.members.join(" · ")}</p>}</details>;
  })}</div></section>;
}

function PresenterCard({ presenter, order }) {
  return <article className={`run-presenter tone-${tone(presenter)}`}><span>{String(order).padStart(2, "0")}</span><h3>{presenter.projectUrl ? <a href={presenter.projectUrl} target="_blank" rel="noreferrer">{presenter.projectName} ↗</a> : presenter.projectName}</h3><p className="run-by">Presented by {presenter.name}{presenter.host ? " · Host" : ""}</p><p>{presenter.description}</p></article>;
}

export function PresenterLineup({ module, remoteCommand }) {
  const hosts = module.content?.hosts || [];
  const [presenters, setPresenters] = useState(module.content?.presenters || []);
  const randomize = () => setPresenters((current) => shuffle(current));
  useEffect(() => { if (remoteCommand?.kind === "lineup" && remoteCommand.action === "shuffle") randomize(); }, [remoteCommand?.id]);
  const cellCount = hosts.length + presenters.length + 1;
  const columns = cellCount <= 6 ? 3 : cellCount <= 12 ? 4 : cellCount <= 20 ? 5 : 6;
  const rows = Math.ceil(cellCount / columns);
  return <section className="run-lineup" style={{ "--lineup-columns": columns, "--lineup-rows": rows }}>{hosts.map((presenter, index) => <PresenterCard presenter={presenter} order={index + 1} key={presenter.id} />)}{presenters.map((presenter, index) => <PresenterCard presenter={presenter} order={hosts.length + index + 1} key={presenter.id} />)}<button type="button" onClick={randomize}>Randomize presenters</button></section>;
}

function ring() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  [1568, 2093, 1760].forEach((frequency, index) => { const oscillator = context.createOscillator(); const gain = context.createGain(); const start = context.currentTime + index * .11; oscillator.type = "square"; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(.72, start + .018); gain.gain.exponentialRampToValueAtTime(.0001, start + .72); oscillator.connect(gain).connect(context.destination); oscillator.start(start); oscillator.stop(start + .7); });
  window.setTimeout(() => context.close(), 1400);
}
const clock = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const timerSegments = (settings = {}) => settings.segments?.length
  ? settings.segments.map((segment, index) => ({ label: segment.label || `Phase ${index + 1}`, seconds: Math.max(1, Number(segment.seconds) || 1) }))
  : [
      { label: settings.demoLabel || "Demo", seconds: settings.demoSeconds || 300 },
      { label: settings.qaLabel || "Q&A", seconds: settings.qaSeconds || 180 },
    ];

export function PresentationTimer({ module, remoteCommand }) {
  const segments = useMemo(() => timerSegments(module.settings), [module.settings]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [remaining, setRemaining] = useState(segments[0].seconds);
  const [running, setRunning] = useState(false);
  const [alarm, setAlarm] = useState(false);
  const alarmRef = useRef(null);
  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => setRemaining((current) => {
      if (current > 1) return current - 1;
      if (segmentIndex < segments.length - 1) {
        ring();
        const nextIndex = segmentIndex + 1;
        setSegmentIndex(nextIndex);
        return segments[nextIndex].seconds;
      }
      setRunning(false); setAlarm(true); return 0;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [running, segmentIndex, segments]);
  useEffect(() => { if (!alarm) return undefined; ring(); alarmRef.current = window.setInterval(ring, 1050); return () => window.clearInterval(alarmRef.current); }, [alarm]);
  const reset = () => { setAlarm(false); setRunning(false); setSegmentIndex(0); setRemaining(segments[0].seconds); };
  useEffect(() => { if (remoteCommand?.kind !== "timer") return; if (remoteCommand.action === "start" && remaining > 0) { setAlarm(false); setRunning(true); } if (remoteCommand.action === "pause") setRunning(false); if (remoteCommand.action === "reset") reset(); if (remoteCommand.action === "stop-alarm") setAlarm(false); }, [remoteCommand?.id]);
  const current = segments[segmentIndex];
  return <section className={`run-timer ${alarm ? "is-alarm" : ""}`}><p className="eyebrow">{current.label} · {segmentIndex + 1}/{segments.length}</p><strong>{clock(remaining)}</strong><p>{Math.round(current.seconds / 60)} minute {current.label.toLowerCase()}</p><div><button type="button" onClick={alarm ? () => setAlarm(false) : () => setRunning((value) => !value)}>{alarm ? "Stop alarm" : running ? "Pause" : "Start"}</button><button type="button" onClick={reset}>Reset</button></div></section>;
}

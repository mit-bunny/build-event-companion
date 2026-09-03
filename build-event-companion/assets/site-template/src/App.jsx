import { useEffect, useMemo, useRef, useState } from "react";
import data from "./event.json";
import { PairRemote, RemotePage, useDisplayRemote } from "./RemoteControl";
import { PresentationTimer, PresenterLineup, RoomAnalysis, WelcomeModule } from "./RunOfShow";

const accents = ["cyan", "coral", "yellow", "mint", "lilac"];

function formatEventTime(event) {
  if (!event.start) return "";
  const start = new Date(event.start);
  if (Number.isNaN(start.getTime())) return event.start;
  const end = event.end ? new Date(event.end) : null;
  const date = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: event.timezone || undefined,
  }).format(start);
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone || undefined,
  }).format(start);
  const endTime = end && !Number.isNaN(end.getTime())
    ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: event.timezone || undefined }).format(end)
    : "";
  return `${date} · ${time}${endTime ? `–${endTime}` : ""}`;
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function platformMark(platform = "Website") {
  const marks = { X: "X", LinkedIn: "in", YouTube: "▶", Xiaohongshu: "XHS", Instagram: "◎", TikTok: "♪", Website: "↗" };
  return marks[platform] || platform.slice(0, 2);
}

function Avatar({ attendee, index = 0 }) {
  return (
    <div className={`avatar avatar-${accents[index % accents.length]}`}>
      {attendee.photo ? <img src={attendee.photo} alt="" /> : <span>{initials(attendee.name)}</span>}
    </div>
  );
}

function SocialLinks({ links = [] }) {
  if (!links.length) return null;
  return (
    <div className="social-links" aria-label="Social profiles">
      {links.map((link) => (
        <a key={`${link.platform}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" aria-label={`${link.platform} profile`}>
          {platformMark(link.platform)}
        </a>
      ))}
    </div>
  );
}

function Directory({ attendees }) {
  return (
    <section className="directory" aria-label="Attendee directory">
      {attendees.map((attendee, index) => (
        <article className="person-card" key={attendee.id} tabIndex="0">
          <Avatar attendee={attendee} index={index} />
          <div className="person-name">{attendee.name}</div>
          <div className="person-details">
            <div>
              <p className="person-role">{attendee.role === "host" ? "Host" : "Attendee"}</p>
              <p className="person-bio">{attendee.bio || "Add a short introduction before the event."}</p>
            </div>
            <SocialLinks links={attendee.links} />
          </div>
        </article>
      ))}
    </section>
  );
}

function Introduction({ attendees }) {
  const [remaining, setRemaining] = useState(() => attendees.map((attendee) => attendee.id));
  const [centerId, setCenterId] = useState(attendees[0]?.id || "");
  const [selectedId, setSelectedId] = useState("");
  const [spinning, setSpinning] = useState(false);
  const frame = useRef(0);
  const attendeeById = useMemo(() => Object.fromEntries(attendees.map((attendee) => [attendee.id, attendee])), [attendees]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const visibleIds = useMemo(() => {
    if (selectedId) return [selectedId];
    if (!remaining.length) return [];
    const centerIndex = Math.max(0, remaining.indexOf(centerId));
    const width = Math.min(7, remaining.length);
    const leftCount = Math.floor((width - 1) / 2);
    const rightCount = width - 1 - leftCount;
    const ids = [];
    for (let offset = -leftCount; offset <= rightCount; offset += 1) {
      ids.push(remaining[(centerIndex + offset + remaining.length) % remaining.length]);
    }
    return ids;
  }, [centerId, remaining, selectedId]);

  function rotate() {
    if (!remaining.length || spinning) return;
    setSelectedId("");
    if (remaining.length === 1) {
      setCenterId(remaining[0]);
      setSelectedId(remaining[0]);
      return;
    }
    const startIndex = Math.max(0, remaining.indexOf(centerId));
    const targetIndex = Math.floor(Math.random() * remaining.length);
    const turns = Math.max(10, remaining.length + 3) + ((targetIndex - startIndex + remaining.length) % remaining.length);
    const duration = 3800;
    const started = performance.now();
    setSpinning(true);
    const animate = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3.2);
      const index = (startIndex + Math.floor(turns * eased)) % remaining.length;
      setCenterId(remaining[index]);
      if (progress < 1) frame.current = requestAnimationFrame(animate);
      else {
        const chosen = remaining[(startIndex + turns) % remaining.length];
        setCenterId(chosen);
        setSpinning(false);
        window.setTimeout(() => setSelectedId(chosen), 1000);
      }
    };
    frame.current = requestAnimationFrame(animate);
  }

  function removeSelected() {
    if (!selectedId) return;
    const next = remaining.filter((id) => id !== selectedId);
    setRemaining(next);
    setSelectedId("");
    setCenterId(next[0] || "");
  }

  function reset() {
    const all = attendees.map((attendee) => attendee.id);
    setRemaining(all);
    setCenterId(all[0] || "");
    setSelectedId("");
    setSpinning(false);
  }

  const selected = attendeeById[selectedId];
  const centerPosition = Math.floor(visibleIds.length / 2);
  return (
    <section className="intro-stage">
      <div className="intro-status">
        <span>{remaining.length} in rotation</span>
        <span>{attendees.length - remaining.length} introduced</span>
      </div>
      {selected ? (
        <div className="selected-profile">
          <Avatar attendee={selected} index={attendees.indexOf(selected)} />
          <div className="selected-copy">
            <p className="eyebrow">Selected profile</p>
            <h2>{selected.name}</h2>
            <p>{selected.bio || "No bio yet."}</p>
            <SocialLinks links={selected.links} />
          </div>
        </div>
      ) : (
        <div className={`carousel ${spinning ? "is-spinning" : ""}`} aria-live="polite">
          {visibleIds.map((id, position) => {
            const attendee = attendeeById[id];
            const distance = position - centerPosition;
            return (
              <div className={`carousel-card ${distance === 0 ? "is-center" : ""}`} style={{ "--distance": distance }} key={`${id}-${position}`}>
                <Avatar attendee={attendee} index={attendees.indexOf(attendee)} />
                <strong>{attendee.name}</strong>
              </div>
            );
          })}
        </div>
      )}
      {!remaining.length && <p className="empty-state">Everyone has introduced themselves.</p>}
      <div className="intro-actions">
        <button className="button primary" type="button" onClick={rotate} disabled={!remaining.length || spinning}>Rotate</button>
        <button className="button" type="button" onClick={removeSelected} disabled={!selectedId}>Remove card</button>
        <button className="button ghost" type="button" onClick={reset}>Reset</button>
      </div>
    </section>
  );
}

function Discussion({ topics }) {
  const [activeId, setActiveId] = useState(topics[0]?.id || "");
  const active = topics.find((topic) => topic.id === activeId) || topics[0];
  const keywords = [...new Set(topics.flatMap((topic) => topic.keywords || []))];
  if (!active) return <p className="empty-state">Discussion themes will appear after registration responses are reviewed.</p>;
  return (
    <section className="discussion-layout">
      <div className="word-cloud" aria-label="Discussion keywords">
        {keywords.map((keyword, index) => {
          const topic = topics.find((candidate) => candidate.keywords?.includes(keyword));
          return (
            <button
              type="button"
              className={topic?.id === active.id ? "active" : ""}
              style={{ "--word-size": `${1.05 + (index % 4) * 0.22}rem` }}
              onClick={() => topic && setActiveId(topic.id)}
              key={keyword}
            >{keyword}</button>
          );
        })}
      </div>
      <article className="topic-panel">
        <div className="topic-index">{String(topics.indexOf(active) + 1).padStart(2, "0")} / {String(topics.length).padStart(2, "0")}</div>
        <h2>{active.title}{active.titleAlt && <span>{active.titleAlt}</span>}</h2>
        <p className="interest-count">{active.people || 0} people interested</p>
        <blockquote>
          <p>{active.description}</p>
          {active.descriptionAlt && <p>{active.descriptionAlt}</p>}
        </blockquote>
        {!!active.threads?.length && (
          <div className="threads">
            <p>Related threads</p>
            {active.threads.map((thread, index) => (
              <div key={thread}>
                <span>{thread}</span>
                {active.threadsAlt?.[index] && <span>{active.threadsAlt[index]}</span>}
              </div>
            ))}
          </div>
        )}
        <div className="topic-controls">
          <button type="button" onClick={() => setActiveId(topics[(topics.indexOf(active) - 1 + topics.length) % topics.length].id)}>←</button>
          <button type="button" onClick={() => setActiveId(topics[(topics.indexOf(active) + 1) % topics.length].id)}>→</button>
        </div>
      </article>
    </section>
  );
}

function InfoModule({ module }) {
  const cards = module.content?.cards || [];
  return (
    <section className="info-grid">
      {cards.map((card, index) => (
        <article key={`${card.title}-${index}`}>
          {card.image && <img src={card.image} alt={card.imageAlt || ""} />}
          <p className="eyebrow">{String(index + 1).padStart(2, "0")}</p>
          <h2>{card.title}</h2>
          <p>{card.body}</p>
        </article>
      ))}
    </section>
  );
}

function Agenda({ module }) {
  return (
    <section className="agenda-list">
      {(module.content?.items || []).map((item, index) => (
        <article key={`${item.time}-${item.title}-${index}`}>
          <time>{item.time}</time>
          <div><h2>{item.title}</h2>{item.description && <p>{item.description}</p>}</div>
        </article>
      ))}
    </section>
  );
}

function CustomModule({ module }) {
  return (
    <section className="custom-module">
      {module.content?.title && <h2>{module.content.title}</h2>}
      {module.content?.body && <p>{module.content.body}</p>}
      <InfoModule module={module} />
    </section>
  );
}

function ModuleContent({ module, remoteCommand }) {
  if (module.type === "directory") return <Directory attendees={data.attendees} />;
  if (module.type === "intro") return <Introduction attendees={data.attendees} />;
  if (module.type === "discussion") return <Discussion topics={data.topics || []} />;
  if (module.type === "info") return <InfoModule module={module} />;
  if (module.type === "agenda") return <Agenda module={module} />;
  if (module.type === "welcome") return <WelcomeModule module={module} />;
  if (module.type === "room") return <RoomAnalysis module={module} />;
  if (module.type === "lineup") return <PresenterLineup module={module} remoteCommand={remoteCommand} />;
  if (module.type === "timer") return <PresentationTimer module={module} remoteCommand={remoteCommand} />;
  return <CustomModule module={module} />;
}

function DisplayApp({ modules }) {
  const [activeId, setActiveId] = useState(modules[0]?.id || "");
  const remote = useDisplayRemote({ eventId: data.event.id, enabled: data.remoteControl?.enabled, modules, activeId, setActiveId });
  const active = modules.find((module) => module.id === activeId) || modules[0];
  const style = {
    "--page-bg": data.theme?.background || "#f4f0e8",
    "--ink": data.theme?.ink || "#101010",
    "--accent": data.theme?.accent || "#00a8d6",
    "--secondary": data.theme?.secondary || "#ff6b4a",
  };
  return (
    <main style={style}>
      <header className="event-header">
        <div className="event-title">
          <p className="eyebrow">Event companion</p>
          <h1>{data.event.title}</h1>
          {data.event.subtitle && <p className="subtitle">{data.event.subtitle}</p>}
        </div>
        <div className="event-meta">
          {formatEventTime(data.event) && <p>{formatEventTime(data.event)}</p>}
          {data.event.location && <p>{data.event.location}</p>}
          {data.event.description && <p className="event-description">{data.event.description}</p>}
          {data.remoteControl?.enabled && <PairRemote remote={remote} />}
        </div>
        <nav aria-label="Event sections">
          {modules.map((module, index) => (
            <button type="button" data-module-type={module.type} className={module.id === active?.id ? "active" : ""} onClick={() => setActiveId(module.id)} key={module.id}>
              <span>{index + 1}</span>{module.label}{module.labelAlt && <small>{module.labelAlt}</small>}
            </button>
          ))}
        </nav>
      </header>
      <div className="module-heading">
        <p className="eyebrow">{active?.labelAlt || "Gather · connect · exchange"}</p>
        <h2>{active?.label}</h2>
      </div>
      {active && <ModuleContent module={active} remoteCommand={remote.remoteCommand} />}
    </main>
  );
}

export default function App() {
  const modules = useMemo(() => (data.modules || []).filter((module) => module.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0)), []);
  const isRemote = data.remoteControl?.enabled && (window.location.pathname.endsWith("/remote") || new URLSearchParams(window.location.search).get("remote") === "1");
  return isRemote ? <RemotePage event={data.event} modules={modules} /> : <DisplayApp modules={modules} />;
}

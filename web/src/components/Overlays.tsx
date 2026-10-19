import { useEffect, useRef, useState } from "react";
import type { Overlay } from "../session/state";
import { Mascot } from "./Mascot";

interface Props {
  overlay: Exclude<Overlay, null>;
  onResume: () => void;
  onBreak: (seconds: number) => void;
  onClose: () => void;
}

export function OverlayPanel({ overlay, onResume, onBreak, onClose }: Props) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), [overlay.kind]);

  return (
    <div className="overlay">
      <div className="overlay__panel card" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
        {overlay.kind === "pause" && (
          <>
            <Mascot size={88} />
            <h2 id="overlay-title">Let's take a breather</h2>
            <p>This one is tricky, and getting stuck is a normal part of learning.</p>
            <div className="overlay__actions">
              <button ref={first} type="button" className="btn btn--primary" onClick={onResume}>
                Try something different
              </button>
              <button type="button" className="btn btn--quiet" onClick={() => onBreak(60)}>
                Take a 1-minute break
              </button>
            </div>
          </>
        )}
        {overlay.kind === "break" && <BreakTimer until={overlay.until} onDone={onResume} firstRef={first} />}
        {overlay.kind === "safety" && (
          <>
            <h2 id="overlay-title">You're not alone</h2>
            <p>If something is wrong or you don't feel safe, these people can help right now.</p>
            <ul className="resources">
              {overlay.resources.map((r) => (
                <li key={r.name}>
                  <strong>{r.name}</strong>
                  <span>{r.contact}</span>
                  <span className="resources__note">{r.description}</span>
                </li>
              ))}
            </ul>
            <div className="overlay__actions">
              <button ref={first} type="button" className="btn btn--primary" onClick={onClose}>
                Back to practice
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BreakTimer({
  until,
  onDone,
  firstRef,
}: {
  until: number;
  onDone: () => void;
  firstRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));

  return (
    <>
      <Mascot size={88} mood="happy" />
      <h2 id="overlay-title">Break time</h2>
      <p>Stretch, look out a window, grab some water. Platy will wait.</p>
      <p className="break__clock" aria-live="off">
        {left > 0 ? `${left}s` : "Ready when you are"}
      </p>
      <div className="overlay__actions">
        <button ref={firstRef} type="button" className="btn btn--primary" onClick={onDone}>
          I'm back
        </button>
      </div>
    </>
  );
}

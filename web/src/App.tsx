import { useState } from "react";
import { Chat } from "./components/Chat";
import { Mascot } from "./components/Mascot";
import { OverlayPanel } from "./components/Overlays";
import { ProblemCard } from "./components/ProblemCard";
import { PuzzlePlayer } from "./components/PuzzlePlayer";
import { useTutorSession } from "./session/useTutorSession";
import type { DemoTrigger } from "./transport/types";

export function App() {
  const s = useTutorSession();
  const { phase } = s.state;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Mascot size={40} />
          <span className="brand__name">Platy</span>
        </div>
        {phase === "live" && (
          <button type="button" className="btn btn--quiet btn--small" onClick={s.end}>
            End session
          </button>
        )}
      </header>

      {phase === "welcome" && (
        <Screen title="Ready to practice?" mascot="calm">
          <p>Today: solving equations. Three problems, one at a time, and you can ask for hints whenever you want.</p>
          <button type="button" className="btn btn--primary btn--big" onClick={s.start} autoFocus>
            Start practice
          </button>
        </Screen>
      )}

      {phase === "live" && (
        <main className="session">
          {s.state.puzzle ? (
            <PuzzlePlayer
              key={s.state.puzzle.puzzle.instance_id}
              state={s.state.puzzle}
              onMove={s.puzzleMove}
              onHint={s.puzzleHint}
              onNext={s.puzzleNext}
              onColors={s.pickColors}
            />
          ) : (
            <ProblemCard problem={s.state.problem} feedback={s.state.feedback} onAnswer={s.answer} onHint={s.hint} />
          )}
          <Chat
            messages={s.state.messages}
            resetNote={s.state.resetNote}
            disabled={s.state.overlay !== null}
            onSay={s.say}
          />
          {s.state.overlay && (
            <OverlayPanel overlay={s.state.overlay} onResume={s.resume} onBreak={s.takeBreak} onClose={s.closeOverlay} />
          )}
          {s.isMock && <DemoControls onTrigger={s.demo} />}
        </main>
      )}

      {phase === "ended" && (
        <Screen title="Nice session!" mascot="happy">
          <p>
            You solved {s.state.solved} {s.state.solved === 1 ? "problem" : "problems"} today.
          </p>
          <button type="button" className="btn btn--primary btn--big" onClick={s.start} autoFocus>
            Practice again
          </button>
        </Screen>
      )}

      {phase === "error" && (
        <Screen title="Platy lost the connection" mascot="calm">
          <p>Nothing from this session was saved, so you'll start on a fresh page.</p>
          <button type="button" className="btn btn--primary btn--big" onClick={s.restart} autoFocus>
            Start again
          </button>
          <p className="screen__code">Code: {s.state.errorCode}</p>
        </Screen>
      )}
    </div>
  );
}

function Screen({ title, mascot, children }: { title: string; mascot: "calm" | "happy"; children: React.ReactNode }) {
  return (
    <main className="screen">
      <div className="screen__inner">
        <Mascot size={140} mood={mascot} />
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}

// Only shown with the scripted mock, so a demo can reach every screen on cue.
function DemoControls({ onTrigger }: { onTrigger: (t: DemoTrigger) => void }) {
  const [open, setOpen] = useState(false);
  const items: [DemoTrigger, string][] = [
    ["skip", "Skip to next problem"],
    ["spot_the_error", "Puzzle: spot the error"],
    ["missing_step", "Puzzle: missing step"],
    ["balance", "Puzzle: balance scale"],
    ["interest", "Switch interest (soccer, football, gaming)"],
    ["pause", "Suggest a pause"],
    ["safety", "Show safety resources"],
    ["error", "Drop the connection"],
  ];
  return (
    <div className="demo">
      {open && (
        <div className="demo__menu" role="menu">
          {items.map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="menuitem"
              onClick={() => {
                onTrigger(t);
                setOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="demo__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        Demo
      </button>
    </div>
  );
}

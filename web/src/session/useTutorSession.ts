import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ClientEvent } from "../protocol";
import { createTransport } from "../transport";
import type { DemoTrigger, TutorTransport } from "../transport/types";
import { initialState, reducer } from "./state";

export function useTutorSession(makeTransport: () => TutorTransport = createTransport) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const transport = useRef<TutorTransport | null>(null);
  const kidMessages = useRef(0);
  const [isMock, setIsMock] = useState(false);

  const stop = useCallback(() => {
    transport.current?.close();
    transport.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  // The session is over once it ends or errors; drop the channel (fail closed, P-3).
  useEffect(() => {
    if (state.phase === "ended" || state.phase === "error") stop();
  }, [state.phase, stop]);

  useEffect(() => {
    if (!state.resetNote) return;
    const t = setTimeout(() => dispatch({ type: "reset_note_done" }), 2200);
    return () => clearTimeout(t);
  }, [state.resetNote]);

  const start = useCallback(() => {
    stop();
    const t = makeTransport();
    transport.current = t;
    setIsMock(t.kind === "mock");
    dispatch({ type: "started" });
    t.start("tutoring", (event) => dispatch({ type: "server", event })).catch(() =>
      dispatch({ type: "server", event: { type: "error", code: "start_failed" } }),
    );
  }, [makeTransport, stop]);

  const send = useCallback((event: ClientEvent) => transport.current?.send(event), []);

  const say = useCallback(
    (text: string) => {
      dispatch({ type: "kid_said", id: `k${++kidMessages.current}`, text });
      send({ type: "kid_message", text });
    },
    [send],
  );

  const answer = useCallback(
    (problem_id: string, text: string) => {
      dispatch({ type: "kid_said", id: `k${++kidMessages.current}`, text });
      dispatch({ type: "answer_sent" });
      send({ type: "answer", problem_id, text });
    },
    [send],
  );

  return {
    state,
    isMock,
    start,
    say,
    answer,
    hint: (problem_id: string) => {
      dispatch({ type: "kid_said", id: `k${++kidMessages.current}`, text: "Can I get a hint?" });
      send({ type: "hint_requested", problem_id });
    },
    resume: () => {
      dispatch({ type: "close_overlay" });
      send({ type: "resume" });
    },
    takeBreak: (seconds: number) => dispatch({ type: "take_break", until: Date.now() + seconds * 1000 }),
    closeOverlay: () => dispatch({ type: "close_overlay" }),
    end: () => send({ type: "end_session" }),
    restart: () => {
      stop();
      dispatch({ type: "restart" });
    },
    demo: (trigger: DemoTrigger) => transport.current?.demo?.(trigger),
  };
}

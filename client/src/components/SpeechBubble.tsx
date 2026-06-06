import { useEffect, useRef, useState } from "react";
import type { Point } from "../domain/layout";
import { useEngine } from "../state/engineContext";

const TYPE_SPEED_MS = 26;
const HOLD_AFTER_DONE_MS = 1400;

interface Props {
  turnId: number;
  name: string;
  text: string;
  pos: Point;
}

/**
 * Types out a line character by character, then — after a short hold — calls
 * completeSpeak(turnId), which resolves the engine's awaited speak() promise so
 * the next turn can be scheduled. Render timing drives pacing without the engine
 * touching the DOM.
 *
 * NOTE: completion is signalled ONLY by the hold timer, never from the effect
 * cleanup. React StrictMode (dev) mounts→unmounts→remounts effects, and
 * resolving on that simulated unmount used to clear the bubble instantly and
 * skip it straight to the log. A real unmount mid-line only happens on End,
 * which the engine already handles via its generation counter.
 */
export function SpeechBubble({ turnId, name, text, pos }: Props) {
  const { completeSpeak } = useEngine();
  const [shown, setShown] = useState("");
  const done = useRef(false);

  useEffect(() => {
    done.current = false;
    setShown("");
    let i = 0;
    let holdTimer: ReturnType<typeof setTimeout>;

    const typer = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typer);
        holdTimer = setTimeout(() => {
          if (done.current) return;
          done.current = true;
          completeSpeak(turnId);
        }, HOLD_AFTER_DONE_MS);
      }
    }, TYPE_SPEED_MS);

    return () => {
      clearInterval(typer);
      clearTimeout(holdTimer);
    };
  }, [turnId, text, completeSpeak]);

  // Nudge the bubble inward near the meadow edges so it stays readable.
  const align = pos.xPct < 22 ? "-30%" : pos.xPct > 78 ? "-70%" : "-50%";

  return (
    <div
      className="bubble"
      style={{ left: `${pos.xPct}%`, top: `${pos.yPct - 9}%`, transform: `translate(${align}, -100%)` }}
    >
      <span className="who pixel">{name}</span>
      <span className="txt">{shown}</span>
    </div>
  );
}

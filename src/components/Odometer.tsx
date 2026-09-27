"use client";

import { useEffect, useState } from "react";

/**
 * Slot-machine number: every digit is a reel that spins to its value, left
 * to right. Non-digits (".", ",") render as-is. Starts from all zeros so the
 * first render rolls in too.
 */
export default function Odometer({ value, className }: { value: string; className?: string }) {
  const [shown, setShown] = useState(() => value.replace(/\d/g, "0"));
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <span className={"odo " + (className ?? "")} aria-label={value} role="text">
      {shown.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="odo__reel" aria-hidden="true">
            <span
              className="odo__strip"
              style={{ transform: `translateY(${-Number(ch) * 10}%)`, transitionDelay: `${i * 70}ms` }}
            >
              {"0123456789".split("").map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            {ch}
          </span>
        )
      )}
    </span>
  );
}

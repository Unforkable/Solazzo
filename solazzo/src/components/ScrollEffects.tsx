"use client";

import { useEffect, useRef } from "react";

/**
 * Client-only interactive layer: reading progress bar + sticky floating CTA.
 *
 * Place this component at the scroll-depth threshold where the sticky CTA
 * should first appear (e.g. after "How it works"). The invisible sentinel
 * div triggers the IntersectionObserver — when it leaves the viewport
 * upward, the sticky CTA fades in.
 */
export function ScrollEffects() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const sticky = stickyRef.current;
    if (!sentinel || !sticky) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        sticky.classList.toggle("visible", !entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = `${Math.min(progress, 100)}%`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Sentinel: sticky CTA appears once this scrolls out of view */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        style={{ height: 0, overflow: "hidden" }}
      />

      {/* Reading progress bar (fixed top) */}
      <div id="reading-progress" ref={progressRef} />

      {/* Sticky floating CTA (fixed bottom-right) */}
      <div id="sticky-cta" ref={stickyRef}>
        <a href="https://make.solazzo.fun">
          See yourself in oil <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </>
  );
}

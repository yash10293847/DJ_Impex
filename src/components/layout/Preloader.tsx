"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { useOverlay } from "@/components/layout/OverlayContext";

/**
 * The preloader: cloth turning in a dark room, which pulls back and dissolves
 * to leave the page behind it.
 *
 * **No blue.** The ground was `--color-navy-deep`, which was the right answer
 * to a different complaint -- it matched the hero, so the handoff had no colour
 * cut -- but it put a blue cast around every edge. The ground is a neutral
 * near-black instead.
 *
 * `GROUND` is not picked by eye. #1e1e1e has a relative luminance of 0.0122
 * against navy-deep's 0.0126, so it is the neutral that sits at the same
 * brightness as the hero it hands over to. The hue goes; the brightness match
 * that made the handoff work stays.
 *
 * The exit opens out through the viewer rather than shrinking away: the scene
 * scales to 2.2 while the ground dissolves, so the page is left behind the
 * cloth rather than revealed around a shrinking object. The film keeps turning
 * throughout, because its rotation is its own CSS animation and owes nothing to
 * the transform the outro is using.
 *
 * It leaves on `window.onload` with a 3.5s timeout behind it. MIN_MS is not in
 * any brief; without it Next has usually fired `load` before React hydrates and
 * the whole thing is over in about 200ms.
 */
const GROUND = "#1e1e1e";
/**
 * Hold, then outro: 850ms between them. The brief is 1.1s for the whole thing,
 * measured from navigation, and React is not mounted for roughly the first 250
 * of those -- so the budget this component actually controls is what is left.
 * It cannot leave before it exists, so on a slow device the total will run over
 * no matter what these say.
 */
const MIN_MS = 250;
const OUTRO_S = 0.6;
const FALLBACK_MS = 3500;
const SESSION_KEY = "nabeen_preloader_seen";

export function Preloader() {
  const reduceMotion = useReducedMotion();
  // Start hidden so returning documents never flash the film before hydration.
  const [show, setShow] = useState(false);

  useOverlay("preloader", show);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // Storage can be unavailable; the initial visit animation still works.
    }

    const frame = window.requestAnimationFrame(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Keep navigation usable when browser storage is blocked.
      }
      setShow(true);
    });
    const mountedAt = Date.now();
    let leaveTimeout: number | undefined;

    // A refresh otherwise lands you back where you were reading, which the
    // preloader hides until it lifts -- so the page appears to have ignored the
    // refresh. Taking scroll restoration off the browser and going to the top
    // while the panel still covers the screen means the jump is never seen.
    //
    // This is a full-load concern only. Moving inside the app is client-side
    // and Next restores scroll itself on back and forward, which this does not
    // touch.
    const previousRestoration = history.scrollRestoration;
    try {
      history.scrollRestoration = "manual";
    } catch {
      /* Not supported: the refresh simply keeps its old position. */
    }
    const restoreInitialPosition = () => {
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (target) target.scrollIntoView({ behavior: "instant" });
      else window.scrollTo(0, 0);
    };
    restoreInitialPosition();

    const leave = () => {
      // Again on load: a browser can restore its position after hydration.
      restoreInitialPosition();
      const remaining = Math.max(0, MIN_MS - (Date.now() - mountedAt));
      leaveTimeout = window.setTimeout(() => setShow(false), remaining);
    };

    if (document.readyState === "complete") leave();
    else window.addEventListener("load", leave, { once: true });

    const fallback = window.setTimeout(() => setShow(false), FALLBACK_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(leaveTimeout);
      window.removeEventListener("load", leave);
      window.clearTimeout(fallback);
      try {
        history.scrollRestoration = previousRestoration;
      } catch {
        /* As above. */
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          aria-hidden="true"
          className="fixed left-0 top-0 z-[9999] h-screen w-screen overflow-hidden text-white"
          style={{ backgroundColor: GROUND }}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            // Nothing in here is clickable, but the overlay is over the page
            // while it is showing, so it only stops taking the pointer once it
            // has started to go.
            pointerEvents: "none",
            transition: { duration: OUTRO_S, ease: [0.16, 1, 0.3, 1] },
          }}
        >
          {/* The scene pulls back as it goes: still turning, getting smaller,
              and the page comes up behind it. */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={reduceMotion ? {} : { scale: 1.04 }}
            animate={{ scale: 1 }}
            exit={
              reduceMotion
                ? {}
                : {
                    // Past the viewer rather than away from them: the cloth
                    // opens out and through the camera, which leaves the page
                    // behind it rather than a shrinking object in the middle of
                    // it. The turn underneath carries on through all of it.
                    scale: 2.2,
                    transition: { duration: OUTRO_S, ease: [0.16, 1, 0.3, 1] },
                  }
            }
            transition={{
              duration: reduceMotion ? 0.01 : 1.5,
              ease: [0.22, 0.61, 0.36, 1],
            }}
          >
            <video
              className="preloader-film absolute inset-0 h-full w-full object-cover"
              src="/video/preloader.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            />

            {/* A neutral fall, so the corners settle into the ground rather than
                ending on a hard edge. No hue in it. */}
            <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_50%,transparent_0%,rgb(30_30_30/0.45)_58%,rgb(30_30_30/0.92)_88%)]" />

            <motion.div
              className="relative flex flex-col items-center px-6 text-center"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
              transition={{ duration: reduceMotion ? 0.01 : 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <Image
                src="/images/logos/nabeen-logo-white.png"
                alt=""
                width={1088}
                height={345}
                priority
                className="h-auto w-[min(17rem,52vw)]"
              />

              <p className="t-small mt-5 tracking-[0.2em] text-white/55">
                House Of Luxury Men&rsquo;s Fabrics
              </p>

              {/* Silver, not the house accent: the brief is no blue anywhere. */}
              <div className="mt-9 h-px w-[min(13rem,44vw)] overflow-hidden bg-white/12">
                <motion.div
                  className="h-full w-full origin-left bg-white/75"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: reduceMotion ? 0.01 : 1.9, ease: [0.33, 0.1, 0.2, 1] }}
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

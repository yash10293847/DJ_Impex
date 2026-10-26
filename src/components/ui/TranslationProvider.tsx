"use client";

import { useEffect, useRef, useState } from "react";
import { applyLanguage, readLanguage, translationLanguage } from "@/lib/translation";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: new (
          options: { pageLanguage: string; autoDisplay: boolean },
          elementId: string,
        ) => unknown;
      };
    };
  }
}

export function TranslationProvider({ nonce }: { nonce?: string }) {
  const initialized = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const language = readLanguage();
    applyLanguage(language);
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    const synchronize = (event: StorageEvent) => {
      if (event.key === "nabeen_lang" && readLanguage() !== language) window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    window.addEventListener("storage", synchronize);
    const stopSynchronizing = () => {
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("storage", synchronize);
    };
    if (language === "en") return stopSynchronizing;
    const targetLanguage = translationLanguage(language);

    let disposed = false;
    const fail = () => {
      if (!disposed) setFailed(true);
    };
    // Observe only the widget, including late responses after a slow network.
    // The former document-wide observer repeatedly wrote its own mutations.
    const timeout = setTimeout(fail, 30000);
    const ready = () => {
      const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (!select || !Array.from(select.options).some((option) => option.value === targetLanguage)) return;
      if (select.value !== targetLanguage) {
        select.value = targetLanguage;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      observer.disconnect();
      clearTimeout(timeout);
      if (!disposed) setFailed(false);
    };
    const observer = new MutationObserver(ready);
    const host = document.getElementById("google_translate_element");
    if (host) observer.observe(host, { childList: true, subtree: true });
    const initialize = () => {
      if (disposed || initialized.current || !window.google?.translate?.TranslateElement) return;
      initialized.current = true;
      try {
        new window.google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          "google_translate_element",
        );
        ready();
      } catch {
        initialized.current = false;
        fail();
      }
    };
    window.googleTranslateElementInit = initialize;

    let script = document.getElementById("google-translate-script") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "google-translate-script";
      if (nonce) script.nonce = nonce;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener("error", fail);
    initialize();

    ready();

    // Translated pages use fresh documents for navigation, avoiding React
    // reconciling text nodes replaced by the translation service.
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.download || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        (url.pathname === window.location.pathname && url.search === window.location.search)
      )
        return;
      event.preventDefault();
      window.location.assign(url.href);
    };
    document.addEventListener("click", navigate, true);
    return () => {
      disposed = true;
      observer.disconnect();
      clearTimeout(timeout);
      script.removeEventListener("error", fail);
      document.removeEventListener("click", navigate, true);
      stopSynchronizing();
      if (window.googleTranslateElementInit === initialize) delete window.googleTranslateElementInit;
    };
  }, [nonce]);

  return (
    <>
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
      {failed && (
        <div
          role="status"
          translate="no"
          className="notranslate border-line text-navy fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-lg rounded-lg border bg-white p-4 text-sm shadow-lg"
        >
          Translation could not load. Check your connection and try again.
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-3 cursor-pointer underline"
          >
            Retry
          </button>
          <a
            href="#"
            className="ml-3 underline"
            onClick={(event) => {
              event.preventDefault();
              applyLanguage("en");
              window.location.reload();
            }}
          >
            English
          </a>
        </div>
      )}
    </>
  );
}

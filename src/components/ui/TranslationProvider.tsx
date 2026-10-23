"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function TranslationProvider({ nonce }: { nonce?: string }) {
  const pathname = usePathname();

  // 1. Initial mount: configure translation engine and load scripts
  useEffect(() => {
    const saved = localStorage.getItem("nabeen_lang");
    if (saved && saved !== "en") {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = saved;
      document.cookie = `googtrans=/en/${saved}; path=/;`;
      document.cookie = `googtrans=/auto/${saved}; path=/;`;
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    }

    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            autoDisplay: false,
          },
          "google_translate_element"
        );
      }
    };

    const scriptId = "google-translate-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      if (nonce) script.nonce = nonce;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }

    // Suppress Google Translate top banner and body margin/top displacement
    const cleanGoogleArtifacts = () => {
      if (document.body.style.top !== "0px" && document.body.style.top !== "") {
        document.body.style.setProperty("top", "0px", "important");
      }
      if (document.documentElement.style.top !== "0px" && document.documentElement.style.top !== "") {
        document.documentElement.style.setProperty("top", "0px", "important");
      }
      const banners = document.querySelectorAll(
        ".goog-te-banner-frame, iframe.skiptranslate, iframe.VIpgJd-ZVi9od-OR9Gof-Oxy9Pf, .VIpgJd-ZVi9od-OR9Gof-Oxy9Pf"
      );
      banners.forEach((el) => {
        (el as HTMLElement).style.setProperty("display", "none", "important");
        (el as HTMLElement).style.setProperty("visibility", "hidden", "important");
        (el as HTMLElement).style.setProperty("height", "0px", "important");
      });
    };

    cleanGoogleArtifacts();
    const observer = new MutationObserver(cleanGoogleArtifacts);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, [nonce]);

  // 2. On route change: ensure current page applies active language
  useEffect(() => {
    const saved = localStorage.getItem("nabeen_lang");
    if (saved && saved !== "en") {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = saved;

      const timer = setTimeout(() => {
        const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (select && select.value !== saved) {
          select.value = saved;
          select.dispatchEvent(new Event("change"));
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return <div id="google_translate_element" className="hidden" aria-hidden="true" />;
}


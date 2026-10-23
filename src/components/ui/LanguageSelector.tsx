"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Globe, ChevronDown, Check, Search } from "lucide-react";

export type Language = {
  code: string;
  label: string;
  nativeLabel: string;
};

export const LANGUAGES: Language[] = [
  // Primary trade & African focus
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "ha", label: "Hausa", nativeLabel: "Harshen Hausa" },
  { code: "yo", label: "Yoruba", nativeLabel: "Èdè Yorùbá" },
  { code: "ig", label: "Igbo", nativeLabel: "Asụsụ Igbo" },
  { code: "sw", label: "Swahili", nativeLabel: "Kiswahili" },
  { code: "am", label: "Amharic", nativeLabel: "አማርኛ" },
  { code: "so", label: "Somali", nativeLabel: "Soomaali" },
  { code: "om", label: "Oromo", nativeLabel: "Afaan Oromoo" },
  { code: "zu", label: "Zulu", nativeLabel: "isiZulu" },
  { code: "af", label: "Afrikaans", nativeLabel: "Afrikaans" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },

  // European & Global Trade
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { code: "pl", label: "Polish", nativeLabel: "Polski" },
  { code: "el", label: "Greek", nativeLabel: "Ελληνικά" },
  { code: "sv", label: "Swedish", nativeLabel: "Svenska" },
  { code: "da", label: "Danish", nativeLabel: "Dansk" },
  { code: "no", label: "Norwegian", nativeLabel: "Norsk" },
  { code: "fi", label: "Finnish", nativeLabel: "Suomi" },
  { code: "cs", label: "Czech", nativeLabel: "Čeština" },
  { code: "hu", label: "Hungarian", nativeLabel: "Magyar" },
  { code: "ro", label: "Romanian", nativeLabel: "Română" },
  { code: "uk", label: "Ukrainian", nativeLabel: "Українська" },

  // Asian & Middle Eastern
  { code: "zh-CN", label: "Chinese (Simplified)", nativeLabel: "简体中文" },
  { code: "zh-TW", label: "Chinese (Traditional)", nativeLabel: "繁體中文" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { code: "th", label: "Thai", nativeLabel: "ไทย" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu" },
  { code: "tl", label: "Filipino", nativeLabel: "Tagalog" },
  { code: "my", label: "Burmese", nativeLabel: "မြန်မာစာ" },
  { code: "fa", label: "Persian", nativeLabel: "فارسی" },
  { code: "he", label: "Hebrew", nativeLabel: "עברית" },

  // Indian Heritage & South Asian
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو" },
  { code: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "ne", label: "Nepali", nativeLabel: "नेपाली" },
  { code: "si", label: "Sinhala", nativeLabel: "සිංහල" },
];

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: { translate?: { TranslateElement?: new (options: { pageLanguage: string; autoDisplay: boolean }, elementId: string) => unknown } };
  }
}

function subscribeLanguage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function readLanguage(): string {
  try {
    const saved = localStorage.getItem("nabeen_lang") || "en";
    return LANGUAGES.some((language) => language.code === saved) ? saved : "en";
  } catch { return "en"; }
}
function applyLanguage(lang: string): void {
  const hostname = window.location.hostname;
  if (lang === "en") {
    document.cookie = "googtrans=; Max-Age=0; path=/;";
    document.cookie = `googtrans=; Max-Age=0; path=/; domain=.${hostname};`;
  } else {
    document.cookie = `googtrans=/en/${lang}; path=/;`;
    document.cookie = `googtrans=/auto/${lang}; path=/;`;
    if (hostname !== "localhost") {
      document.cookie = `googtrans=/en/${lang}; path=/; domain=.${hostname};`;
      document.cookie = `googtrans=/auto/${lang}; path=/; domain=.${hostname};`;
    }
  }
  document.documentElement.dir = "ltr";
  document.documentElement.lang = lang;
}

export function LanguageSelector({
  variant = "header",
  onDark = false,
  className = "",
}: {
  variant?: "header" | "footer" | "mobile";
  onDark?: boolean;
  className?: string;
}) {
  const currentLang = useSyncExternalStore(subscribeLanguage, readLanguage, () => "en");
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    dropdownRef.current?.addEventListener("keydown", dismiss);
    const node = dropdownRef.current;
    return () => node?.removeEventListener("keydown", dismiss);
  }, [isOpen]);

  // Filtered list based on search
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return LANGUAGES;
    const q = searchQuery.toLowerCase();
    return LANGUAGES.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.nativeLabel.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Initialize and load translation engine
  useEffect(() => {
    // 1. Detect saved language preference
    const saved = readLanguage();
    if (saved) {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = saved;
    }

    // 2. Setup Google Translate initialization hook
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

    // 3. Inject Google translate script once
    const scriptId = "google-translate-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }

    // 4. Click outside to close dropdown
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (lang: string) => {
    setIsOpen(false);
    if (lang === currentLang) return;

    localStorage.setItem("nabeen_lang", lang);

    applyLanguage(lang);
    if (lang === "en") { window.location.reload(); return; }

    // Trigger translate select if already rendered
    const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event("change"));
    }

    // Reload smoothly to apply translation to all DOM components
    window.location.reload();
  };

  const activeLangObj = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  if (variant === "mobile") {
    return (
      <div className={`grid gap-2.5 ${className}`}>
        <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-accent uppercase">
          <div className="flex items-center gap-2">
            <Globe size={14} aria-hidden="true" />
            <span>Select Language ({LANGUAGES.length})</span>
          </div>
        </div>

        {/* Search inside mobile menu */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            aria-label="Search languages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search language..."
            className="w-full rounded-lg border border-white/15 bg-white/10 py-2 pl-8 pr-3 text-xs text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
          />
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-2 scrollbar-thin">
          {filteredLanguages.map((lang) => {
            const isSelected = lang.code === currentLang;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => changeLanguage(lang.code)}
                className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-all ${
                  isSelected
                    ? "bg-accent text-white font-semibold shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[10px] font-mono uppercase opacity-70">
                    {lang.code}
                  </span>
                  <span>{lang.nativeLabel}</span>
                  <span className="text-[11px] opacity-50">({lang.label})</span>
                </div>
                {isSelected ? <Check size={13} className="text-white" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <div ref={dropdownRef} className={`relative inline-block ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition-colors hover:border-accent hover:text-white lg:min-h-0"
        >
          <Globe size={14} className="text-accent" aria-hidden="true" />
          <span>{activeLangObj.nativeLabel}</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-56 overflow-hidden rounded-xl border border-white/15 bg-navy-deep/95 p-1.5 shadow-2xl backdrop-blur-md z-50">
            {/* Search Input */}
            <div className="relative mb-1 p-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search languages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-md border border-white/15 bg-white/10 py-1.5 pl-7 pr-2.5 text-xs text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin">
              {filteredLanguages.map((lang) => {
                const isSelected = lang.code === currentLang;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => changeLanguage(lang.code)}
                    className={`flex min-h-11 w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors lg:min-h-0 lg:text-xs ${
                      isSelected
                        ? "bg-accent/25 font-semibold text-accent"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase opacity-60">
                        {lang.code}
                      </span>
                      <span>{lang.nativeLabel}</span>
                    </div>
                    {isSelected ? <Check size={12} className="text-accent" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Header variant (desktop dropdown)
  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Select language"
        className="group inline-flex min-h-11 items-center text-xs font-medium lg:min-h-0"
      >
        {/* A compact phone pill inside the full-height touch target. */}
        <span className={`flex items-center gap-1 rounded-full border px-2 py-1.5 transition-colors duration-[var(--duration-quick)] sm:min-h-11 sm:gap-1.5 sm:px-3 lg:min-h-0 ${
          onDark
            ? "border-white/25 bg-white/10 text-white group-hover:border-accent group-hover:bg-white/15"
            : "border-slate/25 bg-slate-50 text-navy group-hover:border-navy group-hover:bg-white"
        }`}>
        <Globe size={13} className="text-accent size-3 sm:size-[13px]" aria-hidden="true" />
        <span className="uppercase tracking-wider font-semibold">{activeLangObj.code}</span>
        <ChevronDown size={11} className={`size-2.5 opacity-70 transition-transform duration-200 sm:size-[11px] ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>

      {isOpen && (
        <div
          className={`fixed inset-x-[var(--spacing-gutter)] top-[4.5rem] max-h-[calc(100dvh-5.5rem)] w-auto overflow-y-auto rounded-xl border p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-64 sm:overflow-hidden ${
            onDark
              ? "border-white/20 bg-navy-deep/95 text-white"
              : "border-line bg-white/98 text-navy shadow-navy/15"
          }`}
        >
          {/* Header & Search Bar */}
          <div className="px-1 pb-2 border-b border-line/60">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-[10px] font-bold tracking-widest text-accent uppercase">
                Languages ({LANGUAGES.length})
              </span>
            </div>
            <div className="relative">
              <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${onDark ? "text-white/40" : "text-slate/40"}`} />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search languages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search language..."
                className={`w-full rounded-lg border py-1.5 pl-7 pr-2.5 text-xs focus:outline-none transition-colors ${
                  onDark
                    ? "border-white/15 bg-white/10 text-white placeholder:text-white/40 focus:border-accent"
                    : "border-line bg-slate-50 text-navy placeholder:text-slate/40 focus:border-navy"
                }`}
              />
            </div>
          </div>

          {/* Languages List with Smooth Scroll */}
          <div className="mt-1.5 max-h-[min(16rem,calc(100dvh-11rem))] overflow-y-auto space-y-0.5 scrollbar-thin pr-1">
            {filteredLanguages.length === 0 ? (
              <p className="py-4 text-center text-xs opacity-60">No language found</p>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = lang.code === currentLang;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => changeLanguage(lang.code)}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors lg:min-h-0 lg:text-xs ${
                      isSelected
                        ? onDark
                          ? "bg-accent/20 font-semibold text-accent"
                          : "bg-mist font-semibold text-navy border border-accent/20"
                        : onDark
                        ? "text-white/80 hover:bg-white/10 hover:text-white"
                        : "text-slate hover:bg-mist/70 hover:text-navy"
                    }`}
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60 w-8 text-left">
                        {lang.code}
                      </span>
                      <span className="font-medium">{lang.nativeLabel}</span>
                      <span className="text-[11px] opacity-40">({lang.label})</span>
                    </div>
                    {isSelected ? <Check size={13} className="text-accent" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Globe, ChevronDown, Check, Search } from "lucide-react";

import { LANGUAGES } from "@/lib/languages";
import { readLanguage, subscribeLanguage, selectLanguage } from "@/lib/translation";

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
        l.code.toLowerCase().includes(q),
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

  // The provider owns the translation engine; selectors only manage their menu.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changing = useRef(false);
  const changeLanguage = (lang: string) => {
    if (changing.current) return;
    changing.current = true;
    setIsOpen(false);
    selectLanguage(lang);
  };

  const activeLangObj = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  if (variant === "mobile") {
    return (
      <div translate="no" className={`notranslate grid gap-2.5 ${className}`}>
        <div className="text-accent flex items-center justify-between text-xs font-semibold tracking-wider uppercase">
          <div className="flex items-center gap-2">
            <Globe size={14} aria-hidden="true" />
            <span>Select Language ({LANGUAGES.length})</span>
          </div>
        </div>

        {/* Search inside mobile menu */}
        <div className="relative">
          <Search size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            aria-label="Search languages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search language..."
            className="focus:border-accent w-full rounded-lg border border-white/15 bg-white/10 py-2 pr-3 pl-8 text-xs text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>

        <div className="max-h-48 scrollbar-thin space-y-1.5 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
          {filteredLanguages.map((lang) => {
            const isSelected = lang.code === currentLang;
            return (
              <button
                key={lang.code}
                type="button"
                style={{ cursor: "pointer" }}
                onClick={() => changeLanguage(lang.code)}
                className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-all ${
                  isSelected
                    ? "bg-accent font-semibold text-white shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-[10px] uppercase opacity-70">{lang.code}</span>
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
      <div ref={dropdownRef} translate="no" className={`notranslate relative inline-block ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          style={{ cursor: "pointer" }}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="hover:border-accent flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition-colors hover:text-white lg:min-h-0"
        >
          <Globe size={14} className="text-accent" aria-hidden="true" />
          <span>{activeLangObj.nativeLabel}</span>
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="bg-navy-deep/95 absolute right-0 bottom-full z-50 mb-2 w-56 overflow-hidden rounded-xl border border-white/15 p-1.5 shadow-2xl backdrop-blur-md">
            {/* Search Input */}
            <div className="relative mb-1 p-1">
              <Search size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-white/50" />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search languages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="focus:border-accent w-full rounded-md border border-white/15 bg-white/10 py-1.5 pr-2.5 pl-7 text-xs text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>

            <div className="max-h-60 scrollbar-thin space-y-0.5 overflow-y-auto">
              {filteredLanguages.map((lang) => {
                const isSelected = lang.code === currentLang;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    style={{ cursor: "pointer" }}
                    onClick={() => changeLanguage(lang.code)}
                    className={`flex min-h-11 w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors lg:min-h-0 lg:text-xs ${
                      isSelected
                        ? "bg-accent/25 text-accent font-semibold"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase opacity-60">{lang.code}</span>
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
    <div ref={dropdownRef} translate="no" className={`notranslate relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        style={{ cursor: "pointer" }}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Select language"
        className="group inline-flex min-h-11 items-center text-xs font-medium lg:min-h-0"
      >
        {/* A compact phone pill inside the full-height touch target. */}
        <span
          className={`flex items-center gap-1 rounded-full border px-2 py-1.5 transition-colors duration-[var(--duration-quick)] sm:min-h-11 sm:gap-1.5 sm:px-3 lg:min-h-0 ${
            onDark
              ? "group-hover:border-accent border-white/25 bg-white/10 text-white group-hover:bg-white/15"
              : "border-slate/25 text-navy group-hover:border-navy bg-slate-50 group-hover:bg-white"
          }`}
        >
          <Globe size={13} className="text-accent size-3 sm:size-[13px]" aria-hidden="true" />
          <span className="font-semibold tracking-wider uppercase">{activeLangObj.code}</span>
          <ChevronDown
            size={11}
            className={`size-2.5 opacity-70 transition-transform duration-200 sm:size-[11px] ${isOpen ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {isOpen && (
        <div
          className={`animate-in fade-in zoom-in-95 fixed inset-x-[var(--spacing-gutter)] top-[4.5rem] z-50 max-h-[calc(100dvh-5.5rem)] w-auto overflow-y-auto rounded-xl border p-2 shadow-2xl backdrop-blur-xl duration-150 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:max-h-none sm:w-64 sm:overflow-hidden ${
            onDark
              ? "bg-navy-deep/95 border-white/20 text-white"
              : "border-line text-navy shadow-navy/15 bg-white/98"
          }`}
        >
          {/* Header & Search Bar */}
          <div className="border-line/60 border-b px-1 pb-2">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-accent text-[10px] font-bold tracking-widest uppercase">
                Languages ({LANGUAGES.length})
              </span>
            </div>
            <div className="relative">
              <Search
                size={13}
                className={`absolute top-1/2 left-2.5 -translate-y-1/2 ${onDark ? "text-white/40" : "text-slate/40"}`}
              />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search languages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search language..."
                className={`w-full rounded-lg border py-1.5 pr-2.5 pl-7 text-xs transition-colors focus:outline-none ${
                  onDark
                    ? "focus:border-accent border-white/15 bg-white/10 text-white placeholder:text-white/40"
                    : "border-line text-navy placeholder:text-slate/40 focus:border-navy bg-slate-50"
                }`}
              />
            </div>
          </div>

          {/* Languages List with Smooth Scroll */}
          <div className="mt-1.5 max-h-[min(16rem,calc(100dvh-11rem))] scrollbar-thin space-y-0.5 overflow-y-auto pr-1">
            {filteredLanguages.length === 0 ? (
              <p className="py-4 text-center text-xs opacity-60">No language found</p>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = lang.code === currentLang;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    style={{ cursor: "pointer" }}
                    onClick={() => changeLanguage(lang.code)}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors lg:min-h-0 lg:text-xs ${
                      isSelected
                        ? onDark
                          ? "bg-accent/20 text-accent font-semibold"
                          : "bg-mist text-navy border-accent/20 border font-semibold"
                        : onDark
                          ? "text-white/80 hover:bg-white/10 hover:text-white"
                          : "text-slate hover:bg-mist/70 hover:text-navy"
                    }`}
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="w-8 text-left text-[10px] font-semibold tracking-wider uppercase opacity-60">
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

import { LANGUAGES } from "./languages";

const STORAGE_KEY = "nabeen_lang";
const CHANGE_EVENT = "nabeen-language-change";

function validLanguage(value: string | null | undefined): value is string {
  return LANGUAGES.some(({ code }) => code === value);
}

export function translationLanguage(lang: string) {
  return lang === "he" ? "iw" : lang;
}

export function readLanguage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (validLanguage(saved)) return saved;
  } catch {
    // Cookies still support switching when browser storage is unavailable.
  }
  const cookieLanguages = document.cookie.split(";").map((cookie) => {
    const [name, ...value] = cookie.trim().split("=");
    const language = name === "googtrans" ? value.join("=").split("/").at(-1) : null;
    return language === "iw" ? "he" : language;
  });
  return cookieLanguages.find(validLanguage) ?? "en";
}

export function subscribeLanguage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

/** Remove legacy host/domain cookies before writing one canonical preference. */
export function applyLanguage(lang: string) {
  if (!validLanguage(lang)) return;
  const expired = "googtrans=; Max-Age=0; path=/;";
  document.cookie = expired;
  const labels = window.location.hostname.split(".");
  for (let index = 0; index < labels.length - 1; index++) {
    document.cookie = `${expired} domain=${labels.slice(index).join(".")};`;
  }
  if (lang !== "en") {
    document.cookie = `googtrans=/en/${translationLanguage(lang)}; path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  }
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // The cookie written above remains the fallback preference.
  }
  document.documentElement.lang = lang;
  // Keep the existing layout direction, as requested.
  document.documentElement.dir = "ltr";
}

export function selectLanguage(lang: string) {
  if (!validLanguage(lang)) return;
  applyLanguage(lang);
  window.dispatchEvent(new Event(CHANGE_EVENT));
  // Always start from clean server HTML. Re-translating Google's mutated DOM
  // in place can leave stale text and break React's ownership of text nodes.
  // Selecting the current option also repairs an out-of-sync translation.
  window.location.reload();
}

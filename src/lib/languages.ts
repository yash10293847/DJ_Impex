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

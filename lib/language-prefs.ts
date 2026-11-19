// lib/language-prefs.ts
// `deeni-lang-prefs` holds both language choices and the mock auth flag (isGuest).

export const LANG_PREFS_KEY = "deeni-lang-prefs";

export interface LanguagePrefs {
  languages?: string[];
  default?: string;
  hasSelected?: boolean;
  isGuest?: boolean;
}

export function readLanguagePrefs(): LanguagePrefs {
  try {
    return JSON.parse(localStorage.getItem(LANG_PREFS_KEY) || "{}") ?? {};
  } catch {
    return {};
  }
}

/** Merge changes into the stored prefs without touching the sign-in state unless asked. */
export function updateLanguagePrefs(changes: LanguagePrefs) {
  const prev = readLanguagePrefs();
  localStorage.setItem(
    LANG_PREFS_KEY,
    JSON.stringify({ ...prev, hasSelected: true, isGuest: prev.isGuest !== false, ...changes })
  );
}

/** Sign out but keep the user's language choices. */
export function signOutKeepingLanguages() {
  updateLanguagePrefs({ isGuest: true });
  localStorage.removeItem("deeni-user-data");
  window.dispatchEvent(new Event("auth-changed"));
}

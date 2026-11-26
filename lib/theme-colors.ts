// lib/theme-colors.ts
// The page's colour in each theme (--background in app/globals.css): the browser's bar on phones (theme-color) and
// Ambient mode's canvas use it.
export const THEME_COLORS = { light: "#ffffff", dark: "#0f0f0f" } as const;

/** Before first paint: the browser's bar takes the theme chosen in the app, not only the phone's own (next-themes'
 *  "theme" key; none means light, our default). "system" keeps the two media-dependent colours. */
export const themeColorScript = `try{var t=localStorage.getItem("theme")||"light",c=${JSON.stringify(THEME_COLORS)}[t];if(c)document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})}catch(e){}`;

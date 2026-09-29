/**
 * Light or dark, and who decided.
 *
 * Nothing is stored until somebody picks, so a new sign-in follows the machine
 * — which is what a person who has set their laptop to dark already expects.
 * Once they pick, the choice is theirs and the machine stops being consulted:
 * switching Halls to light at a desk under a window should not be undone at
 * sunset by the operating system.
 *
 * The class goes on the root element because that is what the stylesheets
 * match, and `color-scheme` goes with it so scrollbars, form controls and the
 * space beyond the page follow rather than staying white.
 */
export const THEME_KEY = 'halls:theme';
export function systemDark() {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-color-scheme: dark)').matches
  );
}
/** What was chosen, or null while the machine is still deciding. */
export function chosenTheme(): 'light' | 'dark' | null {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    // Private windows and blocked storage: no choice, follow the machine.
    return null;
  }
}
export function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}
export function rememberTheme(dark: boolean) {
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  } catch {
    // The theme still applies for this page; it just will not be remembered.
  }
}
/**
 * The script that runs before the first paint.
 *
 * It has to be inline and it has to be duplicated from the functions above,
 * because anything imported arrives after the document has already been drawn
 * — and a page that paints white and then turns dark is worse than one that
 * was never offered dark at all.
 */
export const themeScript = `(function(){try{var s=localStorage.getItem('${THEME_KEY}');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

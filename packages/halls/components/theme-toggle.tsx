'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@oss-os/ui/components/button';
import { applyTheme, chosenTheme, rememberTheme } from '@/lib/theme';
/**
 * One button: what you are not looking at.
 *
 * Three states — system, light, dark — is the honest model and the wrong
 * control: a cycle of three needs a label to be predictable, and this sits in
 * a row of icons. So the button flips to the other theme and the flip is what
 * gets remembered. Following the machine is the state nobody has left yet,
 * not a state to return to by clicking twice.
 */
export function ThemeToggle() {
  // Read after mounting, never during the render: the server cannot know what
  // the browser was told, and guessing produces a hydration mismatch on every
  // page load.
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);
  useEffect(() => {
    if (chosenTheme()) return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const follow = () => {
      applyTheme(media.matches);
      setDark(media.matches);
    };
    media.addEventListener('change', follow);
    return () => media.removeEventListener('change', follow);
  }, []);
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={dark ? 'Switch to the light theme' : 'Switch to the dark theme'}
      onClick={() => {
        const next = !dark;
        applyTheme(next);
        rememberTheme(next);
        setDark(next);
      }}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </Button>
  );
}

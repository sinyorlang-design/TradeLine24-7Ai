import { useEffect, useState } from 'react';
type BIP = Event & { prompt: () => Promise<void>; userChoice?: Promise<any> };
export default function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BIP | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIP);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
    setCanInstall(false);
  };
  return { canInstall, install };
}

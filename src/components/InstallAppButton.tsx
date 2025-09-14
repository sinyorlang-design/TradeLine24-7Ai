import useInstallPrompt from '@/hooks/useInstallPrompt';
export default function InstallAppButton({ className = '' }: { className?: string }) {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <button onClick={install} className={`px-4 py-2 rounded-xl shadow ${className}`}>
      Install TradeLine
    </button>
  );
}

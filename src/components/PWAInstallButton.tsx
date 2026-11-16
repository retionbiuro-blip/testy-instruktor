import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    const checkStandalone = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsInstalled(checkStandalone());

    const ua = navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua) && !('MSStream' in window));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIosModal(false);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }

    if (isIos) {
      setShowIosModal(true);
    }
  };

  return {
    canInstall: !isInstalled && (Boolean(deferredPrompt) || isIos),
    isIos,
    isInstalled,
    isOnline,
    showIosModal,
    setShowIosModal,
    promptInstall
  };
}

export function PWAInstallButton() {
  const { canInstall, isIos, showIosModal, setShowIosModal, promptInstall } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void promptInstall()}
        title={isIos ? 'Dodaj aplikację do ekranu głównego' : 'Zainstaluj jako aplikację'}
        aria-label={isIos ? 'Dodaj aplikację do ekranu głównego' : 'Zainstaluj aplikację'}
        className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 whitespace-nowrap transition-colors hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-blue-900/70 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
      >
        {isIos ? (
          <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="hidden lg:inline">Zainstaluj aplikację</span>
      </button>

      {showIosModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                  <Smartphone className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2
                  id="ios-install-title"
                  className="font-display text-base font-bold text-slate-900 dark:text-white"
                >
                  Instalacja na iPhone / iPad
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                aria-label="Zamknij okno instalacji"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <ol className="mt-4 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-blue-700 dark:text-blue-400">1.</span>
                <span>
                  Stuknij ikonę{' '}
                  <strong className="inline-flex items-center gap-1 text-slate-900 dark:text-white">
                    Udostępnij <Share className="inline h-3.5 w-3.5" aria-hidden="true" />
                  </strong>{' '}
                  na pasku Safari.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-blue-700 dark:text-blue-400">2.</span>
                <span>
                  Przewiń menu i wybierz{' '}
                  <strong className="text-slate-900 dark:text-white">
                    Dodaj do ekranu początkowego
                  </strong>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-blue-700 dark:text-blue-400">3.</span>
                <span>Potwierdź przyciskiem „Dodaj”, aby uruchamiać testy na pełnym ekranie.</span>
              </li>
            </ol>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
              >
                Rozumiem
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const { isOnline } = usePWAInstall();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 left-4 z-40 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm md:bottom-4 dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-200"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Tryb offline — korzystasz z zapisanej bazy pytań</span>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);

    // Check if user dismissed recently (within 5 days)
    const dismissedAt = localStorage.getItem('autocheck_pwa_dismissed');
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 5) {
        setIsDismissed(true);
      }
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIosDevice);

    // Listen for Chrome/Edge/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      console.log('[AutoCheck PWA] App foi instalado com sucesso!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[AutoCheck PWA] Usuário aceitou a instalação');
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('autocheck_pwa_dismissed', Date.now().toString());
  };

  // Don't show if already running in standalone app or dismissed
  if (isStandalone || isDismissed) {
    return null;
  }

  // Only show if we either have the deferred prompt (Android/Chrome/Edge) or on iOS Safari
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      {/* Floating PWA Install Banner */}
      <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-[#0f1118]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl text-white flex items-center justify-between gap-3">
          {/* App Icon */}
          <div className="relative flex-shrink-0">
            <img
              src="/pwa-192x192.png"
              alt="AutoCheck"
              className="w-11 h-11 rounded-xl shadow-md border border-slate-700 object-cover"
            />
            <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-0.5 border-2 border-[#0f1118]">
              <Download className="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          {/* Text Content */}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 leading-tight">
              Instalar AutoCheck
              <span className="bg-orange-500/20 text-orange-400 text-[10px] font-semibold px-1.5 py-0.2 rounded border border-orange-500/30">
                App
              </span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-tight mt-0.5 truncate">
              {isIOS ? 'Adicione à tela de início para abrir como app' : 'Instale na sua tela inicial para acesso rápido'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Dispensar por enquanto"
              aria-label="Dispensar aviso de instalação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0f1118] border border-slate-700 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <img src="/pwa-192x192.png" alt="AutoCheck" className="w-8 h-8 rounded-lg" />
                <h3 className="text-sm font-bold text-white">Instalar no iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>O Safari no iOS permite instalar o AutoCheck como um app independente em 2 passos:</p>
              
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-white">Toque no botão Compartilhar</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    Procure pelo ícone <Share2 className="w-3.5 h-3.5 inline text-sky-400" /> na barra inferior do Safari.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-white">Adicionar à Tela de Início</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    Role a lista e selecione <PlusSquare className="w-3.5 h-3.5 inline text-slate-200" /> <b>Adicionar à Tela de Início</b>.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl flex items-center gap-2 text-emerald-300 text-[11px]">
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>O AutoCheck será aberto sem barras do navegador, como um app nativo!</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

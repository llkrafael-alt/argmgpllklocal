import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share, PlusSquare, ExternalLink, HelpCircle, AlertCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInstalledSuccess, setIsInstalledSuccess] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);

  useEffect(() => {
    // Check if running inside iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    // Check if running in standalone PWA mode
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Capture PWA install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalledSuccess(true);
      setTimeout(() => setIsInstalledSuccess(false), 6000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalledSuccess(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Erro ao disparar prompt de instalação:', err);
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const handleOpenDirect = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  if (isStandalone) return null;
  if (isDismissed && !showGuideModal) return null;

  return (
    <>
      {/* Installed Success Toast */}
      {isInstalledSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-900/95 border border-emerald-500 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 max-w-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-sm text-white">Aplicativo Adicionado!</p>
            <p className="text-emerald-200">Verifique a tela de início do seu dispositivo para abrir o app.</p>
          </div>
        </div>
      )}

      {/* Floating PWA Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Smartphone className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-white">Instalar o App no Celular</h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  PWA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Acesse o Galpão de Testemunhos diretamente da tela inicial do celular.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isInIframe && (
          <div className="mt-2.5 p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Para instalar no telefone, abra o link direto em uma nova aba do navegador.</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => setShowGuideModal(true)}
            className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Passo a passo</span>
          </button>

          <div className="flex items-center gap-2">
            {isInIframe && (
              <button
                onClick={handleOpenDirect}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Abrir em Nova Aba</span>
              </button>
            )}

            <button
              onClick={handleInstallClick}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>{deferredPrompt ? 'Instalar Agora' : 'Como Instalar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comprehensive PWA Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <Smartphone className="w-5 h-5 text-amber-500" />
                <span>Como adicionar à Tela Inicial</span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">Importante:</p>
                <p>Navegadores móveis não permitem instalar PWAs diretamente de dentro de telas de prévia ou iFrames. Abra o app no seu navegador nativo.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Android Instructions */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-sm text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    No Android (Google Chrome)
                  </h5>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Chrome</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pl-1">
                  <li>Abra o link do aplicativo no <strong>Chrome do celular</strong>.</li>
                  <li>Toque no menu de três pontos <strong>(⋮)</strong> no canto superior direito.</li>
                  <li>Selecione a opção <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.</li>
                  <li>Confirme em <strong>"Adicionar"</strong>.</li>
                </ol>
              </div>

              {/* iOS Instructions */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-sm text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    No iPhone / iPad (Safari)
                  </h5>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Safari</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pl-1">
                  <li>Abra a página obrigatoriamente no <strong>Safari</strong> (navegador do iPhone).</li>
                  <li>Toque no ícone de <strong>Compartilhar</strong> <Share className="w-3.5 h-3.5 inline text-amber-400 mx-0.5" /> no rodapé.</li>
                  <li>Role o menu e toque em <strong>"Adicionar à Tela de Início"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-amber-400 mx-0.5" />.</li>
                  <li>Toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={handleOpenDirect}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir em Nova Aba</span>
              </button>

              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


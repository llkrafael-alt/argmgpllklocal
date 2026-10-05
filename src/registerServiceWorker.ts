export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado com sucesso no escopo:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] Nova versão do aplicativo disponível.');
                  } else {
                    console.log('[PWA] Aplicativo pronto para uso offline.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('[PWA] Erro ao registrar o Service Worker:', error);
        });
    });
  }
}

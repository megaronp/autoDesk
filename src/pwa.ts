import { registerSW } from 'virtual:pwa-register';

// Register service worker immediately for PWA installability and offline caching
export const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[AutoCheck PWA] Nova versão disponível. Atualizando automaticamente...');
  },
  onOfflineReady() {
    console.log('[AutoCheck PWA] Aplicativo pronto para uso offline.');
  },
  onRegisterError(error) {
    console.error('[AutoCheck PWA] Falha ao registrar Service Worker:', error);
  }
});

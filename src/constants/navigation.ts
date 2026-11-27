export type AppTab = 'dashboard' | 'shipments' | 'team';

/**
 * Controla a exibição da aba "Furos & Planos de Amostragem" na navegação (computador e celular).
 * Altere para `true` para reativar a aba sem perder nenhum dado ou funcionalidade.
 */
export const SHOW_FUROS_TAB = false;

export const DEFAULT_APP_TAB: AppTab = SHOW_FUROS_TAB ? 'dashboard' : 'shipments';

export const ACTIVE_TAB_STORAGE_KEY = 'argmgp_active_tab_v1';

/**
 * Garante que a aba ativa nunca aponte para uma aba desativada/escondida.
 * Se a aba salva ou solicitada for a aba escondida ("dashboard"), retorna "shipments".
 */
export function resolveSafeActiveTab(candidateTab?: string | null): AppTab {
  if (candidateTab === 'shipments' || candidateTab === 'team') {
    return candidateTab;
  }
  if (candidateTab === 'dashboard' && SHOW_FUROS_TAB) {
    return 'dashboard';
  }
  return DEFAULT_APP_TAB;
}

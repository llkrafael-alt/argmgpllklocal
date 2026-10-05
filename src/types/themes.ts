export type AppThemeId = 
  | 'dark'          // Titânio & Âmbar Industrial (Padrão)
  | 'light'         // Branco Gelo Corporativo
  | 'emerald'       // Verde Geologia & Ouro Metálico
  | 'cyberpunk'     // Azul Cobalto & Ciano Elétrico
  | 'warm-earth'    // Terracota & Cobre Mineração
  | 'dracula-night' // Roxo Ametista & Titânio Profundo
  | 'mono-clean';   // Minimalista Alto Contraste (Preto & Branco Puro)

export interface ThemeOption {
  id: AppThemeId;
  name: string;
  category: 'Escuro' | 'Claro' | 'Especial';
  description: string;
  previewBg: string;
  previewAccent: string;
  previewText: string;
  borderClass: string;
  tag: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Titânio & Âmbar',
    category: 'Escuro',
    description: 'Estilo industrial robusto de mineração com fundo ardósia escuro e destaques em âmbar segurança.',
    previewBg: '#0f172a',
    previewAccent: '#f59e0b',
    previewText: '#f8fafc',
    borderClass: 'border-amber-500/50',
    tag: 'PADRÃO',
  },
  {
    id: 'light',
    name: 'Branco Gelo',
    category: 'Claro',
    description: 'Ambiente claro, limpo e corporativo com alto contraste para relatórios e leitura diurna.',
    previewBg: '#f1f5f9',
    previewAccent: '#ea580c',
    previewText: '#0f172a',
    borderClass: 'border-orange-500/50',
    tag: 'DIURNO',
  },
  {
    id: 'emerald',
    name: 'Geologia Esmeralda',
    category: 'Escuro',
    description: 'Inspirado em jazidas e mapeamento geológico: tons de verde esmeralda profundo com dourado mineral.',
    previewBg: '#022c22',
    previewAccent: '#10b981',
    previewText: '#ecfdf5',
    borderClass: 'border-emerald-500/50',
    tag: 'MINERAL',
  },
  {
    id: 'cyberpunk',
    name: 'Cobalto & Ciano Técnico',
    category: 'Escuro',
    description: 'Visual tecnológico de precisão com fundo azul-marinho profundo e luzes em ciano elétrico.',
    previewBg: '#030712',
    previewAccent: '#06b6d4',
    previewText: '#f0fdfa',
    borderClass: 'border-cyan-500/50',
    tag: 'TÉCNICO',
  },
  {
    id: 'warm-earth',
    name: 'Terracota & Cobre',
    category: 'Escuro',
    description: 'Tons terrosos e minerais oxidados de sondagem com acentos quentes em cobre e laranja vulcânico.',
    previewBg: '#1c1917',
    previewAccent: '#f97316',
    previewText: '#fafaf9',
    borderClass: 'border-orange-500/50',
    tag: 'CAMPO',
  },
  {
    id: 'dracula-night',
    name: 'Ametista & Galena',
    category: 'Escuro',
    description: 'Fundo ultra-escuro com detalhes violeta fosforescente, remetendo a cristais e geodos.',
    previewBg: '#130c24',
    previewAccent: '#a855f7',
    previewText: '#faf5ff',
    borderClass: 'border-purple-500/50',
    tag: 'CRISTAL',
  },
  {
    id: 'mono-clean',
    name: 'Monocromático Alto Contraste',
    category: 'Escuro',
    description: 'Preto puro OLED e branco cirúrgico com bordas nítidas, ideal para visibilidade máxima e sol forte.',
    previewBg: '#000000',
    previewAccent: '#ffffff',
    previewText: '#ffffff',
    borderClass: 'border-white/50',
    tag: 'OLED / CONTRASTE',
  },
];

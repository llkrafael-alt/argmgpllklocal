import { StageInfo, StageId } from '../types';

export const DIAMOND_STAGES: StageInfo[] = [
  {
    id: 1,
    order: 1,
    name: 'Recebimento do furo',
    shortName: 'Recebimento',
    description: 'Recepção, conferência física das caixas e registro inicial do furo no galpão.',
  },
  {
    id: 2,
    order: 2,
    name: 'Análise dos geólogos',
    shortName: 'Análise Geológica',
    description: 'Mapeamento litológico, estrutural e alteração hidrotermal pelos geólogos.',
  },
  {
    id: 3,
    order: 3,
    name: 'Restituição metro a metro',
    shortName: 'Restituição',
    description: 'Organização, medição do testemunho e posicionamento das canaletas metro a metro.',
  },
  {
    id: 4,
    order: 4,
    name: 'Processo de Suscetibilidade Magnética (SM)',
    shortName: 'Suscetibilidade (SM)',
    description: 'Medição da suscetibilidade magnética nos intervalos com equipamento KT-10.',
  },
  {
    id: 5,
    order: 5,
    name: 'Densidade',
    shortName: 'Densidade',
    description: 'Ensaio de densidade por pesagem hidrostática ou balança.',
  },
  {
    id: 6,
    order: 6,
    name: 'Orientação dos testemunhos',
    shortName: 'Orientação',
    description: 'Marcação da linha de orientação das estruturas e foliações.',
  },
  {
    id: 7,
    order: 7,
    name: 'Marcação dos testemunhos para a serra',
    shortName: 'Marcação p/ Serra',
    description: 'Traçado da linha de corte longitudinal nos testemunhos de sondagem.',
  },
  {
    id: 8,
    order: 8,
    name: 'Anotação do plano de amostragem nas cases',
    shortName: 'Plano nas Cases',
    description: 'Registro visual e numérico das amostras e dup/brancos diretamente nas caixas.',
  },
  {
    id: 9,
    order: 9,
    name: 'Fotos (seco e molhado)',
    shortName: 'Fotografia',
    description: 'Sessão fotográfica de alta resolução com testemunhos secos e molhados.',
  },
  {
    id: 10,
    order: 10,
    name: 'Envio para a casa de serra',
    shortName: 'Envio p/ Serra',
    description: 'Transporte e entrega das caixas preparadas para a equipe de corte.',
  },
  {
    id: 11,
    order: 11,
    name: 'Amostragem',
    shortName: 'Amostragem',
    description: 'Corte longitudinal, ensacamento do meio testemunho e etiquetação.',
  },
  {
    id: 12,
    order: 12,
    name: 'Armazenamento final',
    shortName: 'Armazenamento',
    description: 'Organização das caixas nos paletes/prateleiras do galpão de testemunhos.',
  },
  {
    id: 13,
    order: 13,
    name: 'Escaneamento KORE',
    shortName: 'KORE (Especial)',
    description: 'Escaneamento hiperespectral KORE (exclusivo para furos legados pendentes).',
    isSpecialKore: true,
  },
];

export const RC_STAGES: StageInfo[] = [
  {
    id: 101,
    order: 1,
    name: 'Adesivamento',
    shortName: 'Adesivamento',
    description: 'Aplicações de adesivos e etiquetas de identificação nos sacos de amostragem RC.',
  },
  {
    id: 102,
    order: 2,
    name: 'Empacotamento para envio',
    shortName: 'Empacotamento',
    description: 'Empacotamento dos sacos, ensacamento secundário e preparação para envio ao laboratório.',
  },
];

export const STAGES: StageInfo[] = [...DIAMOND_STAGES, ...RC_STAGES];

export const getStageById = (id: StageId): StageInfo => {
  return STAGES.find((s) => s.id === id) || STAGES[0];
};

export const getApplicableStages = (
  isLegacyKorePending?: boolean,
  holeType?: 'Diamantado' | 'RC' | 'Solo' | 'Trincheira'
): StageInfo[] => {
  if (holeType === 'Solo' || holeType === 'Trincheira') {
    return [];
  }
  if (holeType === 'RC') {
    return RC_STAGES;
  }
  if (isLegacyKorePending) {
    return DIAMOND_STAGES;
  }
  return DIAMOND_STAGES.filter((s) => !s.isSpecialKore);
};

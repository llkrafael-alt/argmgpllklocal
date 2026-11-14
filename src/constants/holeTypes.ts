import { QaQcSample, SampleRange, SampleShipmentAR, DrillHole, HoleType } from '../types';

export type { HoleType };

export interface HoleTypeConfig {
  type: HoleType;
  label: string;
  shortLabel: string;
  allowedLetters: readonly string[];
  letterHint: string;
  exampleStart: string;
  exampleEnd: string;
  description: string;
  badgeClass: string;
  cardClass: string;
  accentTextClass: string;
}

/**
 * Mapeamento centralizado de Tipos de Furo para Letras de Código de Amostra.
 * Para ajustar as letras permitidas no futuro, basta editar esta constante.
 */
export const HOLE_TYPE_CONFIG: Record<HoleType, HoleTypeConfig> = {
  Diamantado: {
    type: 'Diamantado',
    label: 'Diamantado',
    shortLabel: 'Diamantado',
    allowedLetters: ['D'],
    letterHint: 'D',
    exampleStart: 'D00001',
    exampleEnd: 'D00150',
    description: 'Sondagem diamantada. Códigos de amostra e QA/QC começam com D.',
    badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    cardClass:
      'border-amber-500/40 bg-amber-950/20 hover:bg-amber-500/15 hover:border-amber-400 active:scale-[0.99]',
    accentTextClass: 'text-amber-400',
  },
  RC: {
    type: 'RC',
    label: 'RC',
    shortLabel: 'RC',
    allowedLetters: ['R'],
    letterHint: 'R',
    exampleStart: 'R00001',
    exampleEnd: 'R00150',
    description: 'Circulação Reversa (RC). Códigos de amostra e QA/QC começam com R.',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
    cardClass:
      'border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-500/15 hover:border-cyan-400 active:scale-[0.99]',
    accentTextClass: 'text-cyan-400',
  },
  Solo: {
    type: 'Solo',
    label: 'Solo',
    shortLabel: 'Solo',
    allowedLetters: ['S'],
    letterHint: 'S',
    exampleStart: 'S01637',
    exampleEnd: 'S01706',
    description: 'Amostragem de solo. Códigos de amostra e QA/QC começam com S.',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    cardClass:
      'border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-500/15 hover:border-emerald-400 active:scale-[0.99]',
    accentTextClass: 'text-emerald-400',
  },
  Trincheira: {
    type: 'Trincheira',
    label: 'Trincheira',
    shortLabel: 'Trincheira',
    allowedLetters: ['T'],
    letterHint: 'T',
    exampleStart: 'T00001',
    exampleEnd: 'T00100',
    description: 'Amostragem de trincheira. Códigos de amostra e QA/QC começam com T.',
    badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
    cardClass:
      'border-orange-500/40 bg-orange-950/20 hover:bg-orange-500/15 hover:border-orange-400 active:scale-[0.99]',
    accentTextClass: 'text-orange-400',
  },
  Reenvio: {
    type: 'Reenvio',
    label: 'Reenvio/Reanálise',
    shortLabel: 'Reenvio/Reanálise',
    allowedLetters: ['D', 'R', 'T', 'S'],
    letterHint: 'D, R, T ou S',
    exampleStart: 'R00001',
    exampleEnd: 'R00100',
    description: 'Reenvio ou reanálise. Aceita códigos iniciados em D, R, T ou S.',
    badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
    cardClass:
      'border-purple-500/40 bg-purple-950/20 hover:bg-purple-500/15 hover:border-purple-400 active:scale-[0.99]',
    accentTextClass: 'text-purple-400',
  },
};

export const HOLE_TYPE_ORDER: HoleType[] = ['Diamantado', 'RC', 'Solo', 'Trincheira', 'Reenvio'];

export const SEM_TIPO_BADGE_CLASS = 'bg-slate-800 text-slate-400 border border-slate-700';

export function isValidHoleType(value: unknown): value is HoleType {
  return typeof value === 'string' && value in HOLE_TYPE_CONFIG;
}

export function getHoleTypeLabel(holeType?: HoleType | string | null): string {
  if (holeType && isValidHoleType(holeType)) {
    return HOLE_TYPE_CONFIG[holeType].label;
  }
  return 'Sem tipo';
}

export function getHoleTypeBadgeClass(holeType?: HoleType | string | null): string {
  if (holeType && isValidHoleType(holeType)) {
    return HOLE_TYPE_CONFIG[holeType].badgeClass;
  }
  return SEM_TIPO_BADGE_CLASS;
}

export function resolveArHoleType(
  ar: Pick<SampleShipmentAR, 'holeType' | 'drillHoleId' | 'drillHoleCode'>,
  holes: Pick<DrillHole, 'id' | 'code' | 'holeType'>[]
): HoleType | undefined {
  if (isValidHoleType(ar.holeType)) {
    return ar.holeType;
  }
  const linkedHole =
    holes.find((h) => h.id === ar.drillHoleId) ||
    holes.find(
      (h) =>
        h.code &&
        ar.drillHoleCode &&
        h.code.trim().toUpperCase() === ar.drillHoleCode.trim().toUpperCase()
    );
  if (linkedHole && isValidHoleType(linkedHole.holeType)) {
    return linkedHole.holeType;
  }
  return undefined;
}

export function normalizeSampleCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

export function getSampleCodeStartingLetter(code: string): string {
  const normalized = normalizeSampleCode(code);
  return normalized ? normalized.charAt(0) : '';
}

export interface RangeValidationResult {
  isValid: boolean;
  fieldErrors: Record<string, string>; // key: `${index}:first` | `${index}:last`
  messages: string[];
  rangeLetters: string[];
}

/**
 * Valida todas as faixas de amostragem de acordo com o tipo de furo.
 * - Primeira e última amostra de cada faixa devem começar com letra permitida pelo tipo.
 * - Primeira e última amostra da mesma faixa devem começar com a mesma letra (inclusive no Reenvio).
 */
export function validateSampleRangesForHoleType(
  ranges: SampleRange[],
  holeType?: HoleType | null
): RangeValidationResult {
  const fieldErrors: Record<string, string> = {};
  const messages: string[] = [];
  const detectedLetters = new Set<string>();

  const config = holeType && isValidHoleType(holeType) ? HOLE_TYPE_CONFIG[holeType] : null;
  const allowedLetters = config ? config.allowedLetters : null;
  const isMulti = ranges.length > 1;

  ranges.forEach((range, idx) => {
    const first = normalizeSampleCode(range.firstSampleCode);
    const last = normalizeSampleCode(range.lastSampleCode);
    const firstLetter = getSampleCodeStartingLetter(first);
    const lastLetter = getSampleCodeStartingLetter(last);
    const rangeTag = isMulti ? ` (Faixa ${idx + 1})` : '';

    let firstAllowed = true;
    let lastAllowed = true;

    if (first && allowedLetters) {
      if (!allowedLetters.includes(firstLetter)) {
        firstAllowed = false;
        const msg = `Para ${config!.label}, os códigos devem começar com ${config!.letterHint}. O campo 'Primeira amostra'${rangeTag} começa com ${firstLetter}.`;
        fieldErrors[`${idx}:first`] = msg;
        messages.push(msg);
      }
    }

    if (last && allowedLetters) {
      if (!allowedLetters.includes(lastLetter)) {
        lastAllowed = false;
        const msg = `Para ${config!.label}, os códigos devem começar com ${config!.letterHint}. O campo 'Última amostra'${rangeTag} começa com ${lastLetter}.`;
        fieldErrors[`${idx}:last`] = msg;
        messages.push(msg);
      }
    }

    if (first && last && firstLetter !== lastLetter) {
      // Only add mismatch error if not already explained or to clarify same-letter rule
      const msg = isMulti
        ? `Na Faixa ${idx + 1}, 'Primeira amostra' (${firstLetter}) e 'Última amostra' (${lastLetter}) devem começar com a mesma letra.`
        : `'Primeira amostra' (${firstLetter}) e 'Última amostra' (${lastLetter}) devem começar com a mesma letra.`;

      if (firstAllowed && lastAllowed) {
        fieldErrors[`${idx}:first`] = msg;
        fieldErrors[`${idx}:last`] = msg;
        messages.push(msg);
      } else if (firstAllowed && !lastAllowed && !fieldErrors[`${idx}:last`]) {
        fieldErrors[`${idx}:last`] = msg;
        messages.push(msg);
      } else if (!firstAllowed && lastAllowed && !fieldErrors[`${idx}:first`]) {
        fieldErrors[`${idx}:first`] = msg;
        messages.push(msg);
      }
    }

    if (first && firstAllowed) {
      detectedLetters.add(firstLetter);
    }
    if (last && lastAllowed && (!first || firstLetter === lastLetter)) {
      detectedLetters.add(lastLetter);
    }
  });

  return {
    isValid: messages.length === 0,
    fieldErrors,
    messages,
    rangeLetters: Array.from(detectedLetters),
  };
}

export interface QaqcValidationResult {
  isValid: boolean;
  errorsById: Record<string, string>;
  messages: string[];
  expectedLetters: string[];
}

function getQaqcCategoryLabel(type: string): string {
  const upper = (type || '').trim().toUpperCase();
  if (upper.includes('OREAS')) return 'OREAS';
  if (upper.includes('BLK') || upper.includes('BRANCO') || upper.includes('GESSO')) return 'BLK';
  if (upper.includes('DUP')) return 'DUP';
  return type || 'QA/QC';
}

/**
 * Valida códigos de padrões QA/QC (OREAS, BLK, DUP).
 * - Os padrões QA/QC devem ter a mesma letra das amostras da faixa do furo.
 * - Quando ainda não houver faixa válida preenchida, valida contra as letras permitidas do tipo do furo.
 */
export function validateQaqcSamplesForHoleType(
  qaqcSamples: QaQcSample[],
  ranges: SampleRange[],
  holeType?: HoleType | null
): QaqcValidationResult {
  const config = holeType && isValidHoleType(holeType) ? HOLE_TYPE_CONFIG[holeType] : null;
  const allowedByType = config ? [...config.allowedLetters] : [];

  // Coleta letras válidas presentes nas faixas informadas
  const rangeLettersSet = new Set<string>();
  ranges.forEach((r) => {
    const f = getSampleCodeStartingLetter(r.firstSampleCode);
    const l = getSampleCodeStartingLetter(r.lastSampleCode);
    if (f && (!config || allowedByType.includes(f))) {
      rangeLettersSet.add(f);
    }
    if (l && (!config || allowedByType.includes(l))) {
      rangeLettersSet.add(l);
    }
  });

  const rangeLetters = Array.from(rangeLettersSet);
  // Se o furo tem tipo com letra única (D/R/S/T), ela sempre é exigida; no Reenvio, usa a letra das faixas se informada, senão D/R/T/S.
  const expectedLetters =
    config && config.allowedLetters.length === 1
      ? [...config.allowedLetters]
      : rangeLetters.length > 0
      ? rangeLetters
      : allowedByType;

  const errorsById: Record<string, string> = {};
  const messages: string[] = [];

  if (expectedLetters.length === 0) {
    return {
      isValid: true,
      errorsById,
      messages,
      expectedLetters,
    };
  }

  const expectedText =
    expectedLetters.length === 1
      ? expectedLetters[0]
      : `${expectedLetters.slice(0, -1).join(', ')} ou ${expectedLetters[expectedLetters.length - 1]}`;

  (qaqcSamples || []).forEach((sample) => {
    const code = normalizeSampleCode(sample.code);
    if (!code) return;

    const letter = getSampleCodeStartingLetter(code);
    if (!expectedLetters.includes(letter)) {
      const cat = getQaqcCategoryLabel(sample.type);
      const msg =
        config && config.allowedLetters.length === 1
          ? `Para ${config.label}, o padrão ${cat} '${code}' deve começar com ${expectedText}, mas começa com ${letter}.`
          : rangeLetters.length > 0
          ? `Os padrões QA/QC devem ter a mesma letra das amostras da faixa (${expectedText}). O padrão ${cat} '${code}' começa com ${letter}.`
          : `Para ${config?.label || 'este tipo'}, os códigos devem começar com ${expectedText}. O padrão ${cat} '${code}' começa com ${letter}.`;

      if (sample.id) {
        errorsById[sample.id] = msg;
      }
      messages.push(msg);
    }
  });

  return {
    isValid: messages.length === 0,
    errorsById,
    messages,
    expectedLetters,
  };
}

import { QaQcSample, SampleRange, SampleShipmentAR, DrillHole, HoleType } from '../types';

export type { HoleType };

export interface HoleTypeConfig {
  type: HoleType;
  label: string;
  shortLabel: string;
  allowedLetters: readonly string[];
  letterHint: string;
  requiredNamePrefix?: string;
  exampleHoleName: string;
  exampleStart: string;
  exampleEnd: string;
  description: string;
  badgeClass: string;
  cardClass: string;
  accentTextClass: string;
}

/**
 * Mapeamento centralizado de Tipo de Furo → Prefixo obrigatório do nome do furo.
 * Apenas os tipos listados aqui exigem prefixo; Solo e Reenvio/Reanálise têm nome livre.
 * Para ajustar prefixos no futuro, basta editar esta constante.
 */
export const HOLE_NAME_PREFIX_BY_TYPE: Partial<
  Record<HoleType, { prefix: string; example: string }>
> = {
  Diamantado: { prefix: 'GUD', example: 'GUD-26-082' },
  RC: { prefix: 'GUR', example: 'GUR-26-085' },
  Trincheira: { prefix: 'GUT', example: 'GUT-26-030' },
};

/**
 * Dígitos finais permitidos para os códigos de padrões QA/QC (OREAS, BLK, DUP).
 * Vale para todos os tipos de furo (inclusive Reenvio/Reanálise e Solo).
 * Para ajustar os finais aceitos no futuro, basta editar esta constante.
 */
export const QAQC_ALLOWED_END_DIGITS = ['0', '1', '5'] as const;

function formatListPt(items: readonly string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} ou ${items[items.length - 1]}`;
}

export const QAQC_END_DIGIT_ERROR_MESSAGE = `Código de padrão deve terminar em ${formatListPt(QAQC_ALLOWED_END_DIGITS)}`;

/**
 * Mapeamento centralizado de Tipos de Furo para Letras de Código de Amostra e Prefixos.
 * Para ajustar as letras permitidas no futuro, basta editar esta constante.
 */
export const HOLE_TYPE_CONFIG: Record<HoleType, HoleTypeConfig> = {
  Diamantado: {
    type: 'Diamantado',
    label: 'Diamantado',
    shortLabel: 'Diamantado',
    allowedLetters: ['D'],
    letterHint: 'D',
    requiredNamePrefix: HOLE_NAME_PREFIX_BY_TYPE.Diamantado?.prefix,
    exampleHoleName: HOLE_NAME_PREFIX_BY_TYPE.Diamantado?.example || 'GUD-26-082',
    exampleStart: 'D00001',
    exampleEnd: 'D00150',
    description: 'Sondagem diamantada. Nome inicia com GUD e códigos de amostra começam com D.',
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
    requiredNamePrefix: HOLE_NAME_PREFIX_BY_TYPE.RC?.prefix,
    exampleHoleName: HOLE_NAME_PREFIX_BY_TYPE.RC?.example || 'GUR-26-085',
    exampleStart: 'R00001',
    exampleEnd: 'R00150',
    description: 'Circulação Reversa (RC). Nome inicia com GUR e códigos de amostra começam com R.',
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
    exampleHoleName: 'SOLO TRIANGULO',
    exampleStart: 'S01637',
    exampleEnd: 'S01706',
    description: 'Amostragem de solo. Nome livre e códigos de amostra começam com S.',
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
    requiredNamePrefix: HOLE_NAME_PREFIX_BY_TYPE.Trincheira?.prefix,
    exampleHoleName: HOLE_NAME_PREFIX_BY_TYPE.Trincheira?.example || 'GUT-26-030',
    exampleStart: 'T00001',
    exampleEnd: 'T00100',
    description: 'Amostragem de trincheira. Nome inicia com GUT e códigos de amostra começam com T.',
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
    exampleHoleName: 'GUD-26-010',
    exampleStart: 'R00001',
    exampleEnd: 'R00100',
    description: 'Reenvio ou reanálise. Nome livre e aceita códigos iniciados em D, R, T ou S.',
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

export function extractHoleNamePrefix(holeName: string): string {
  const normalized = normalizeSampleCode(holeName);
  if (!normalized) return '';
  const hyphenIdx = normalized.indexOf('-');
  if (hyphenIdx !== -1) {
    return normalized.slice(0, hyphenIdx).trim();
  }
  const match = normalized.match(/^[A-Z]+/);
  return match ? match[0] : '';
}

export interface HoleNameValidationResult {
  isValid: boolean;
  normalizedName: string;
  extractedPrefix: string;
  expectedPrefix?: string;
  exampleName?: string;
  errorMessage?: string;
}

/**
 * Valida o prefixo do nome do furo conforme o tipo selecionado.
 * - Diamantado → GUD
 * - RC → GUR
 * - Trincheira → GUT
 * - Solo e Reenvio/Reanálise → nome livre (sem validação de prefixo).
 */
export function validateHoleNameForType(
  holeName: string,
  holeType?: HoleType | null
): HoleNameValidationResult {
  const normalizedName = normalizeSampleCode(holeName);
  const extractedPrefix = extractHoleNamePrefix(normalizedName);

  if (!holeType || !isValidHoleType(holeType)) {
    return { isValid: true, normalizedName, extractedPrefix };
  }

  const rule = HOLE_NAME_PREFIX_BY_TYPE[holeType];
  if (!rule) {
    return { isValid: true, normalizedName, extractedPrefix };
  }

  if (!normalizedName) {
    return {
      isValid: true,
      normalizedName,
      extractedPrefix,
      expectedPrefix: rule.prefix,
      exampleName: rule.example,
    };
  }

  if (extractedPrefix !== rule.prefix) {
    const label = HOLE_TYPE_CONFIG[holeType].label;
    return {
      isValid: false,
      normalizedName,
      extractedPrefix,
      expectedPrefix: rule.prefix,
      exampleName: rule.example,
      errorMessage: `Para ${label}, o nome do furo deve começar com ${rule.prefix} (ex.: ${rule.example}).`,
    };
  }

  return {
    isValid: true,
    normalizedName,
    extractedPrefix,
    expectedPrefix: rule.prefix,
    exampleName: rule.example,
  };
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

export interface QaqcValidationOptions {
  /**
   * Mapa de id -> código normalizado salvo originalmente na AR em edição.
   * Padrões já salvos cujo código não foi alterado pelo usuário geram apenas
   * aviso discreto e não bloqueiam o salvamento.
   */
  legacySavedCodeById?: Record<string, string>;
}

export interface QaqcValidationResult {
  isValid: boolean;
  errorsById: Record<string, string>;
  errorListById: Record<string, string[]>;
  warningsById: Record<string, string>;
  invalidCount: number;
  messages: string[];
  warningMessages: string[];
  expectedLetters: string[];
}

function getQaqcCategoryLabel(type: string): string {
  const upper = (type || '').trim().toUpperCase();
  if (upper.includes('OREAS')) return 'OREAS';
  if (upper.includes('BLK') || upper.includes('BRANCO') || upper.includes('GESSO')) return 'BLK';
  if (upper.includes('DUP')) return 'DUP';
  return type || 'QA/QC';
}

export function hasValidQaqcEndDigit(code: string): boolean {
  const normalized = normalizeSampleCode(code);
  if (!normalized) return true;
  const lastChar = normalized.charAt(normalized.length - 1);
  return (QAQC_ALLOWED_END_DIGITS as readonly string[]).includes(lastChar);
}

/**
 * Valida códigos de padrões QA/QC (OREAS, BLK, DUP).
 * 1) Letra inicial: mesma letra das amostras da faixa do furo (ou permitida pelo tipo).
 * 2) Dígito final: deve terminar em QAQC_ALLOWED_END_DIGITS (0, 1 ou 5) para todos os tipos.
 * Se ambos estiverem errados, reporta os dois erros.
 * Padrões já salvos não alterados recebem aviso discreto (warningsById) sem bloquear salvamento.
 */
export function validateQaqcSamplesForHoleType(
  qaqcSamples: QaQcSample[],
  ranges: SampleRange[],
  holeType?: HoleType | null,
  options?: QaqcValidationOptions
): QaqcValidationResult {
  const config = holeType && isValidHoleType(holeType) ? HOLE_TYPE_CONFIG[holeType] : null;
  const allowedByType = config ? [...config.allowedLetters] : [];

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
  const expectedLetters =
    config && config.allowedLetters.length === 1
      ? [...config.allowedLetters]
      : rangeLetters.length > 0
      ? rangeLetters
      : allowedByType;

  const errorsById: Record<string, string> = {};
  const errorListById: Record<string, string[]> = {};
  const warningsById: Record<string, string> = {};
  const messages: string[] = [];
  const warningMessages: string[] = [];
  let invalidCount = 0;

  const expectedText = formatListPt(expectedLetters);

  (qaqcSamples || []).forEach((sample) => {
    const code = normalizeSampleCode(sample.code);
    if (!code) return;

    const legacyOriginal =
      sample.id && options?.legacySavedCodeById
        ? options.legacySavedCodeById[sample.id]
        : undefined;
    const isUntouchedLegacy = legacyOriginal !== undefined && legacyOriginal === code;

    const cat = getQaqcCategoryLabel(sample.type);
    const rowIssues: string[] = [];

    // 1. Validação da letra inicial (quando houver tipo/faixa configurados)
    if (expectedLetters.length > 0) {
      const letter = getSampleCodeStartingLetter(code);
      if (!expectedLetters.includes(letter)) {
        const letterMsg =
          config && config.allowedLetters.length === 1
            ? `Para ${config.label}, o padrão ${cat} '${code}' deve começar com ${expectedText}, mas começa com ${letter}.`
            : rangeLetters.length > 0
            ? `Os padrões QA/QC devem ter a mesma letra das amostras da faixa (${expectedText}). O padrão ${cat} '${code}' começa com ${letter}.`
            : `Para ${config?.label || 'este tipo'}, os códigos devem começar com ${expectedText}. O padrão ${cat} '${code}' começa com ${letter}.`;
        rowIssues.push(letterMsg);
      }
    }

    // 2. Validação do dígito final (0, 1 ou 5) - vale para todos os tipos (inclusive Solo e Reenvio)
    if (!hasValidQaqcEndDigit(code)) {
      rowIssues.push(`${QAQC_END_DIGIT_ERROR_MESSAGE} (${cat} '${code}').`);
    }

    if (rowIssues.length > 0) {
      if (isUntouchedLegacy) {
        const warnText = `Padrão salvo anteriormente fora da regra atual: ${rowIssues.join(' • ')}`;
        if (sample.id) {
          warningsById[sample.id] = warnText;
        }
        warningMessages.push(warnText);
      } else {
        invalidCount += 1;
        if (sample.id) {
          errorsById[sample.id] = rowIssues.join(' • ');
          errorListById[sample.id] = rowIssues;
        }
        rowIssues.forEach((issue) => messages.push(issue));
      }
    }
  });

  return {
    isValid: invalidCount === 0,
    errorsById,
    errorListById,
    warningsById,
    invalidCount,
    messages,
    warningMessages,
    expectedLetters,
  };
}

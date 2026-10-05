import {
  ProductionLog,
  DrillHole,
  StageId,
  StageProgress,
  HoleProgressSummary,
  OverlapInfo,
  SampleRange,
  QAQCSamplePhoto,
  SampleShipmentAR,
} from '../types';
import { getApplicableStages } from '../constants/stages';

/**
 * Calculates the union of unique covered meters for a list of interval logs.
 */
export function calculateStageProgress(
  hole: DrillHole,
  stageId: StageId,
  logs: ProductionLog[]
): StageProgress {
  const stageLogs = logs.filter(
    (l) => l.drillHoleId === hole.id && l.stageId === stageId
  );

  const holeStart = hole.startMeter;
  const holeEnd = hole.endMeter;
  const totalMeters = Math.max(1, hole.totalMeters || holeEnd - holeStart);

  // Clamp and sanitize valid logs
  const validIntervals: { start: number; end: number }[] = [];
  for (const log of stageLogs) {
    const s = Math.max(holeStart, Math.min(log.startMeter, log.endMeter));
    const e = Math.min(holeEnd, Math.max(log.startMeter, log.endMeter));
    if (e > s) {
      validIntervals.push({ start: s, end: e });
    }
  }

  if (validIntervals.length === 0) {
    return {
      stageId,
      coveredMeters: 0,
      totalMeters,
      percentage: 0,
      isComplete: false,
      mergedIntervals: [],
      logsCount: stageLogs.length,
    };
  }

  // Sort intervals by start point
  validIntervals.sort((a, b) => a.start - b.start);

  // Merge overlapping or continuous intervals
  const merged: { start: number; end: number }[] = [];
  let current = { ...validIntervals[0] };

  for (let i = 1; i < validIntervals.length; i++) {
    const next = validIntervals[i];
    if (next.start <= current.end) {
      // Overlap or touch
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);

  // Calculate covered distance
  const coveredMeters = Number(merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0).toFixed(2));
  const rawPercentage = (coveredMeters / totalMeters) * 100;
  // Round to 1 decimal place, max 100
  const percentage = Math.min(100, Math.round(rawPercentage * 10) / 10);
  const isComplete = coveredMeters >= totalMeters || percentage >= 100;

  return {
    stageId,
    coveredMeters,
    totalMeters,
    percentage,
    isComplete,
    mergedIntervals: merged,
    logsCount: stageLogs.length,
  };
}

/**
 * Calculates overall progress summary for a drill hole across all applicable stages.
 */
export function calculateHoleSummary(
  hole: DrillHole,
  logs: ProductionLog[]
): HoleProgressSummary {
  const applicableStages = getApplicableStages(hole.isLegacyKorePending, hole.holeType);
  const stageProgressMap: Record<StageId, StageProgress> = {} as any;

  let completedStagesCount = 0;
  let sumPercentages = 0;

  for (const stage of applicableStages) {
    const progress = calculateStageProgress(hole, stage.id, logs);
    stageProgressMap[stage.id] = progress;
    if (progress.isComplete) {
      completedStagesCount++;
    }
    sumPercentages += progress.percentage;
  }

  const totalStages = applicableStages.length;
  const overallPercentage =
    totalStages > 0 ? Math.min(100, Math.round((sumPercentages / totalStages) * 10) / 10) : 0;
  const isFullyCompleted = totalStages > 0 && completedStagesCount === totalStages;

  return {
    holeId: hole.id,
    totalStages,
    completedStages: completedStagesCount,
    overallPercentage,
    isFullyCompleted,
    stageProgressMap,
  };
}

/**
 * Checks if a proposed log interval overlaps with existing logs in the same stage.
 */
export function checkOverlap(
  holeId: string,
  stageId: StageId,
  startMeter: number,
  endMeter: number,
  logs: ProductionLog[]
): OverlapInfo {
  const stageLogs = logs.filter(
    (l) => l.drillHoleId === holeId && l.stageId === stageId
  );

  const reqStart = Math.min(startMeter, endMeter);
  const reqEnd = Math.max(startMeter, endMeter);

  const overlapping: { userName: string; range: string; date: string }[] = [];

  for (const log of stageLogs) {
    const lStart = Math.min(log.startMeter, log.endMeter);
    const lEnd = Math.max(log.startMeter, log.endMeter);

    // Overlap condition: max of starts < min of ends
    const oStart = Math.max(reqStart, lStart);
    const oEnd = Math.min(reqEnd, lEnd);

    if (oEnd > oStart) {
      overlapping.push({
        userName: log.userName || 'Usuário Desconhecido',
        range: `${oStart}m - ${oEnd}m (Lançamento original: ${lStart}m - ${lEnd}m)`,
        date: log.date,
      });
    }
  }

  return {
    hasOverlap: overlapping.length > 0,
    overlappingLogs: overlapping,
  };
}

export interface SampleRangeResult {
  count: number;
  prefix: string;
  startNum: number;
  endNum: number;
  isValid: boolean;
  error?: string;
}

/**
 * Calculates total samples between first and last sample codes.
 * Formula: (lastNum + 1) - firstNum
 * Example: D01036 to D01236 -> (1236 + 1) - 1036 = 201 samples
 */
export function parseSampleRange(firstCode: string, lastCode: string): SampleRangeResult {
  if (!firstCode || !lastCode) {
    return { count: 0, prefix: '', startNum: 0, endNum: 0, isValid: false };
  }

  const trimmedFirst = firstCode.trim();
  const trimmedLast = lastCode.trim();

  const matchFirst = trimmedFirst.match(/^(.*?)(0*(\d+))$/);
  const matchLast = trimmedLast.match(/^(.*?)(0*(\d+))$/);

  if (!matchFirst || !matchLast) {
    return {
      count: 0,
      prefix: '',
      startNum: 0,
      endNum: 0,
      isValid: false,
      error: 'Formato de código inválido. Use letras/sufixos seguidos de números (ex: D01036 e D01236).',
    };
  }

  const prefix1 = matchFirst[1];
  const num1 = parseInt(matchFirst[3], 10);

  const prefix2 = matchLast[1];
  const num2 = parseInt(matchLast[3], 10);

  if (num2 < num1) {
    return {
      count: 0,
      prefix: prefix1,
      startNum: num1,
      endNum: num2,
      isValid: false,
      error: 'O número da última amostra deve ser maior ou igual ao número da primeira amostra.',
    };
  }

  // Formula: (num2 + 1) - num1
  const count = (num2 + 1) - num1;
  return {
    count,
    prefix: prefix1 || prefix2,
    startNum: num1,
    endNum: num2,
    isValid: true,
  };
}

export function getNormalizedSampleRanges(
  sampleRanges?: SampleRange[],
  firstCode?: string,
  lastCode?: string
): SampleRange[] {
  const f = firstCode?.trim();
  const l = lastCode?.trim();

  // If explicit single firstCode/lastCode are provided and sampleRanges has 0 or 1 range
  if (f && l && (!sampleRanges || sampleRanges.length <= 1)) {
    return [{ firstSampleCode: f, lastSampleCode: l }];
  }

  // If multi-ranges are provided
  if (sampleRanges && sampleRanges.length > 0) {
    const valid = sampleRanges.filter((r) => r.firstSampleCode?.trim() && r.lastSampleCode?.trim());
    if (valid.length > 0) return valid;
  }

  if (f && l) {
    return [{ firstSampleCode: f, lastSampleCode: l }];
  }
  return [];
}

export interface MultiRangeResult {
  isValid: boolean;
  error?: string;
  totalCount: number;
  rangeResults: SampleRangeResult[];
}

export function parseSampleRanges(
  sampleRanges?: SampleRange[],
  firstCode?: string,
  lastCode?: string
): MultiRangeResult {
  const normalized = getNormalizedSampleRanges(sampleRanges, firstCode, lastCode);
  if (normalized.length === 0) {
    return {
      isValid: false,
      error: 'Informe ao menos uma faixa de amostra válida.',
      totalCount: 0,
      rangeResults: [],
    };
  }

  let totalCount = 0;
  const rangeResults: SampleRangeResult[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const r = normalized[i];
    const parsed = parseSampleRange(r.firstSampleCode, r.lastSampleCode);
    if (!parsed.isValid) {
      return {
        isValid: false,
        error: `Faixa ${i + 1} (${r.firstSampleCode} até ${r.lastSampleCode}): ${parsed.error || 'Código inválido.'}`,
        totalCount: 0,
        rangeResults: [],
      };
    }
    totalCount += parsed.count;
    rangeResults.push(parsed);
  }

  return {
    isValid: true,
    totalCount,
    rangeResults,
  };
}

/**
 * Generates the next sequential AR code across the entire shed.
 * Default format: "ARGMGP-300", "ARGMGP-301"...
 */
export function getNextArCode(existingARs: { arCode: string }[]): string {
  let maxNum = 299; // Default starting sequence suggests ARGMGP-300

  for (const ar of existingARs) {
    if (!ar || !ar.arCode) continue;
    const matches = ar.arCode.match(/(\d+)/g);
    if (matches && matches.length > 0) {
      const num = parseInt(matches[matches.length - 1], 10);
      if (!isNaN(num) && num > maxNum && num < 100000) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `ARGMGP-${nextNum}`;
}

export function formatCustomArCode(customArCode: string, arIndex: number): string {
  const trimmed = customArCode.trim();
  if (!trimmed || trimmed === 'ARGMGP-' || trimmed === 'ARGMGP') return '';

  const match = trimmed.match(/^(.*?)(0*(\d+))$/);
  if (match) {
    let prefix = match[1];
    const padLength = match[2].length;
    const baseNum = parseInt(match[3], 10);
    if (!prefix && !isNaN(baseNum)) {
      prefix = 'ARGMGP-';
    }
    const currentNum = baseNum + arIndex;
    return `${prefix}${String(currentNum).padStart(padLength, '0')}`;
  }

  const cleanBase = trimmed.replace(/-+$/, '');
  return arIndex === 0 ? cleanBase : `${cleanBase}-${arIndex + 1}`;
}

/**
 * Safely formats and displays an AR Code (e.g. "ARGMGP-300").
 * Fixes cases where an AR code was saved incomplete like "ARGMGP-" or empty.
 */
export function getArCodeDisplay(arCode?: string | null, fallbackId?: string): string {
  if (!arCode) {
    if (fallbackId) {
      const nums = fallbackId.replace(/\D/g, '');
      return `ARGMGP-${nums ? nums.slice(-3) : '300'}`;
    }
    return 'ARGMGP-300';
  }
  const trimmed = arCode.trim().toUpperCase();
  if (!trimmed || trimmed === 'ARGMGP' || trimmed === 'ARGMGP-') {
    if (fallbackId) {
      const nums = fallbackId.replace(/\D/g, '');
      return `ARGMGP-${nums ? nums.slice(-3) : '300'}`;
    }
    return 'ARGMGP-300';
  }
  return trimmed;
}

/**
 * Robust matcher between a QA/QC photo and a SampleShipmentAR object.
 * Checks ID, AR Code, normalized strings, and drill hole / sample tags as fallback.
 */
export function isPhotoMatchingAR(
  photo: QAQCSamplePhoto,
  ar: SampleShipmentAR
): boolean {
  if (!photo || !ar) return false;

  const pArId = (photo.arId || '').trim().toLowerCase();
  const pArCode = (photo.arCode || '').trim().toLowerCase();
  const arId = (ar.id || '').trim().toLowerCase();
  const arCode = (ar.arCode || '').trim().toLowerCase();
  const displayArCode = getArCodeDisplay(ar.arCode, ar.id).toLowerCase();

  // 1. Direct ID or AR Code matches
  if (pArId && (pArId === arId || pArId === arCode || pArId === displayArCode)) return true;
  if (pArCode && (pArCode === arCode || pArCode === arId || pArCode === displayArCode)) return true;

  // 2. Normalized string matches (removing hyphens/spaces/underscores)
  const normArCode = arCode.replace(/[^a-z0-9]/g, '');
  const normDisplayArCode = displayArCode.replace(/[^a-z0-9]/g, '');
  const normPArCode = pArCode.replace(/[^a-z0-9]/g, '');
  const normPArId = pArId.replace(/[^a-z0-9]/g, '');

  if (normArCode && (normArCode === normPArCode || normArCode === normPArId)) return true;
  if (normDisplayArCode && (normDisplayArCode === normPArCode || normDisplayArCode === normPArId)) return true;

  // CRITICAL: If photo has an arId or arCode set, but it didn't match this AR above,
  // do NOT fall back to matching by drill hole alone (prevents duplicate photos across different ARs)
  if (pArId || pArCode) {
    return false;
  }

  // 3. Fallback: match by drillHoleCode and sampleCode in QAQC samples (ONLY if photo has no arId/arCode)
  const pHole = (photo.drillHoleCode || '').trim().toLowerCase();
  const arHole = (ar.drillHoleCode || '').trim().toLowerCase();
  if (pHole && arHole && pHole === arHole && photo.sampleCode) {
    const pSample = photo.sampleCode.trim().toLowerCase();
    if (
      pSample === 'geral' ||
      pSample.includes('geral') ||
      (ar.qaqcSamples && ar.qaqcSamples.some((q) => q.code?.trim().toLowerCase() === pSample))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts numeric sequence value from AR code (e.g., "ARGMGP-326" -> 326) for ascending sorting.
 */
export function getArNumericValue(arCode?: string, arId?: string): number {
  const display = getArCodeDisplay(arCode, arId);
  const match = display.match(/\d+/g);
  if (match && match.length > 0) {
    return parseInt(match[match.length - 1], 10);
  }
  return 0;
}

/**
 * Sorts an array of SampleShipmentAR objects strictly by AR sequence number, from smallest to largest (e.g. 326, 327, 328...).
 */
export function sortARsBySequence<T extends { arCode?: string; id?: string }>(arsList: T[]): T[] {
  return [...arsList].sort((a, b) => {
    const numA = getArNumericValue(a.arCode, a.id);
    const numB = getArNumericValue(b.arCode, b.id);

    if (numA > 0 && numB > 0 && numA !== numB) {
      return numA - numB; // Smallest to largest
    }

    const codeA = getArCodeDisplay(a.arCode, a.id);
    const codeB = getArCodeDisplay(b.arCode, b.id);
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Deduplicates QA/QC photo records by ID and image data/URL.
 */
export function deduplicatePhotos(photosList: QAQCSamplePhoto[]): QAQCSamplePhoto[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const deduplicated: QAQCSamplePhoto[] = [];

  for (const p of photosList) {
    if (!p) continue;

    if (p.id && seenIds.has(p.id)) continue;

    const urlKey = (p.dataUrl || p.photoUrl || '').trim();
    if (urlKey && urlKey.length > 30 && seenUrls.has(urlKey)) continue;

    if (p.id) seenIds.add(p.id);
    if (urlKey && urlKey.length > 30) seenUrls.add(urlKey);

    deduplicated.push(p);
  }

  return deduplicated;
}

/**
 * Formats date string (YYYY-MM-DD, ISO string, etc.) into DD/MM/YYYY format (dia/mês/ano).
 */
export function formatDateToPtBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // YYYY-MM-DD format
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  // Fallback via Date object
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return trimmed;
}

export interface PackingVolume {
  volumeIndex: number;
  volumeCode: string;
  fromSample: string;
  toSample: string;
  sendVol: number;
}

export interface PackingPlanResult {
  isValid: boolean;
  error?: string;
  totalSamples: number;
  totalVolumes: number;
  volumes: PackingVolume[];
}

export function parseSampleCodeDetails(code: string) {
  if (!code) return null;
  const trimmed = code.trim();
  const match = trimmed.match(/^(.*?)(0*(\d+))$/);
  if (!match) return null;
  const prefix = match[1];
  const numStr = match[2];
  const padLength = numStr.length;
  const num = parseInt(match[3], 10);
  return { prefix, num, padLength };
}

export function generatePackingPlan(
  startSampleCode: string,
  endSampleCode: string,
  standardSize: number = 10,
  sampleRanges?: SampleRange[]
): PackingPlanResult {
  const normalized = getNormalizedSampleRanges(sampleRanges, startSampleCode, endSampleCode);

  if (normalized.length === 0) {
    return {
      isValid: false,
      error: 'Códigos de amostra inválidos ou faixa incorreta.',
      totalSamples: 0,
      totalVolumes: 0,
      volumes: [],
    };
  }

  const stdSize = Math.max(1, standardSize);
  const volumes: PackingVolume[] = [];
  let globalVolNumber = 1;
  let overallTotalSamples = 0;

  for (const range of normalized) {
    const startInfo = parseSampleCodeDetails(range.firstSampleCode);
    const endInfo = parseSampleCodeDetails(range.lastSampleCode);

    if (!startInfo || !endInfo || endInfo.num < startInfo.num) {
      return {
        isValid: false,
        error: `Faixa de amostra inválida: ${range.firstSampleCode} até ${range.lastSampleCode}`,
        totalSamples: 0,
        totalVolumes: 0,
        volumes: [],
      };
    }

    const prefix = startInfo.prefix || endInfo.prefix;
    const padLength = Math.max(startInfo.padLength, endInfo.padLength);
    const startNum = startInfo.num;
    const endNum = endInfo.num;
    const rangeTotalSamples = (endNum + 1) - startNum;

    if (rangeTotalSamples <= 0) continue;

    overallTotalSamples += rangeTotalSamples;

    const fullVolumes = Math.floor(rangeTotalSamples / stdSize);
    const remainder = rangeTotalSamples % stdSize;

    let volumeSizes: number[] = [];

    if (fullVolumes === 0) {
      volumeSizes = [rangeTotalSamples];
    } else if (remainder === 0) {
      volumeSizes = Array(fullVolumes).fill(stdSize);
    } else if (remainder <= 6) {
      volumeSizes = Array(fullVolumes).fill(stdSize);
      for (let i = 0; i < remainder; i++) {
        const idx = fullVolumes - 1 - i;
        if (idx >= 0) {
          volumeSizes[idx] += 1;
        }
      }
    } else {
      volumeSizes = [...Array(fullVolumes).fill(stdSize), remainder];
    }

    let currentNum = startNum;

    const formatCode = (num: number) => {
      return prefix + String(num).padStart(padLength, '0');
    };

    volumeSizes.forEach((size) => {
      const volCode = `VOL-${String(globalVolNumber).padStart(2, '0')}`;
      const fromSample = formatCode(currentNum);
      const toNum = currentNum + size - 1;
      const toSample = formatCode(toNum);

      volumes.push({
        volumeIndex: globalVolNumber,
        volumeCode: volCode,
        fromSample,
        toSample,
        sendVol: size,
      });

      globalVolNumber++;
      currentNum = toNum + 1;
    });
  }

  if (overallTotalSamples === 0) {
    return {
      isValid: false,
      error: 'Nenhuma amostra encontrada nas faixas fornecidas.',
      totalSamples: 0,
      totalVolumes: 0,
      volumes: [],
    };
  }

  return {
    isValid: true,
    totalSamples: overallTotalSamples,
    totalVolumes: volumes.length,
    volumes,
  };
}

export function getARVolumeCount(ar: {
  startSampleCode: string;
  endSampleCode: string;
  sampleRanges?: SampleRange[];
  volumeCount?: number;
  standardSize?: number;
}): number {
  if (typeof ar.volumeCount === 'number' && ar.volumeCount > 0) {
    return ar.volumeCount;
  }
  const stdSize = typeof ar.standardSize === 'number' && ar.standardSize > 0 ? ar.standardSize : 10;
  if ((ar.startSampleCode && ar.endSampleCode) || (ar.sampleRanges && ar.sampleRanges.length > 0)) {
    const plan = generatePackingPlan(ar.startSampleCode, ar.endSampleCode, stdSize, ar.sampleRanges);
    if (plan.isValid && plan.totalVolumes > 0) {
      return plan.totalVolumes;
    }
  }
  return ar.volumeCount || 1;
}

/**
 * Automatically creates the required ARs for a hole's sample range(s).
 * If total samples <= 200: creates 1 AR.
 * If total samples > 200: distributes samples evenly across multiple ARs (max 200 per AR).
 * Initial volumes, weight, and shipmentDate are left blank/0 for later editing.
 */
export function generateARsForSampleRange(
  hole: { id: string; code: string },
  firstCode: string,
  lastCode: string,
  existingARs: { arCode: string }[],
  activeUser: { id: string; name: string },
  initialData?: {
    customArCode?: string;
    weightKg?: number;
    shipmentDate?: string;
    notes?: string;
    qaqcSamples?: any[];
  },
  sampleRanges?: SampleRange[]
) {
  const normalizedRanges = getNormalizedSampleRanges(sampleRanges, firstCode, lastCode);
  const rangeInfo = parseSampleRanges(normalizedRanges);
  if (!rangeInfo.isValid || rangeInfo.totalCount <= 0) return [];

  const total = rangeInfo.totalCount;
  const numARs = Math.ceil(total / 200);

  const startCode = normalizedRanges[0]?.firstSampleCode || firstCode;
  const endCode = normalizedRanges[normalizedRanges.length - 1]?.lastSampleCode || lastCode;

  if (numARs <= 1) {
    let arCode = '';
    if (initialData?.customArCode && initialData.customArCode.trim()) {
      arCode = formatCustomArCode(initialData.customArCode, 0);
    } else {
      arCode = getNextArCode(existingARs);
    }

    const packingPlan = generatePackingPlan(startCode, endCode, 10, normalizedRanges);
    const volumeCount = packingPlan.isValid && packingPlan.totalVolumes > 0
      ? packingPlan.totalVolumes
      : Math.ceil(total / 10);

    return [{
      arCode,
      drillHoleId: hole.id,
      drillHoleCode: hole.code,
      startSampleCode: startCode,
      endSampleCode: endCode,
      sampleRanges: normalizedRanges,
      sampleCount: total,
      volumeCount,
      weightKg: initialData?.weightKg !== undefined && initialData?.weightKg > 0 ? Number(initialData.weightKg.toFixed(2)) : 0,
      shipmentDate: initialData?.shipmentDate || new Date().toISOString().split('T')[0],
      createdById: activeUser.id,
      createdByName: activeUser.name,
      notes: initialData?.notes || 'AR gerado automaticamente',
      qaqcSamples: initialData?.qaqcSamples || [],
    }];
  }

  // Fallback for > 200 samples
  const startDetails = parseSampleCodeDetails(startCode);
  const endDetails = parseSampleCodeDetails(endCode);
  const prefix = startDetails?.prefix || 'S';
  const padLength = Math.max(startDetails?.padLength || 0, endDetails?.padLength || 0);

  const formatCode = (num: number) => {
    return prefix + String(num).padStart(padLength, '0');
  };

  const baseSize = Math.floor(total / numARs);
  let remainder = total % numARs;

  const arSizes: number[] = [];
  for (let i = 0; i < numARs; i++) {
    let size = baseSize;
    if (remainder > 0) {
      size += 1;
      remainder--;
    }
    arSizes.push(size);
  }

  const generatedARs: {
    arCode: string;
    drillHoleId: string;
    drillHoleCode: string;
    startSampleCode: string;
    endSampleCode: string;
    sampleRanges?: SampleRange[];
    sampleCount: number;
    volumeCount: number;
    weightKg: number;
    shipmentDate: string;
    createdById: string;
    createdByName: string;
    notes?: string;
    qaqcSamples?: any[];
  }[] = [];

  let currentNum = startDetails?.num || 1;
  const tempARList = [...existingARs];

  for (let i = 0; i < numARs; i++) {
    const size = arSizes[i];
    const fromNum = currentNum;
    const toNum = currentNum + size - 1;
    const arStartCode = formatCode(fromNum);
    const arEndCode = formatCode(toNum);

    let arCode = '';
    if (initialData?.customArCode && initialData.customArCode.trim()) {
      arCode = formatCustomArCode(initialData.customArCode, i);
    } else {
      arCode = getNextArCode(tempARList);
    }
    tempARList.push({ arCode });

    const arRange: SampleRange[] = [{ firstSampleCode: arStartCode, lastSampleCode: arEndCode }];
    const packingPlan = generatePackingPlan(arStartCode, arEndCode, 10, arRange);
    const volumeCount = packingPlan.isValid && packingPlan.totalVolumes > 0
      ? packingPlan.totalVolumes
      : Math.ceil(size / 10);

    const initialWeight = initialData?.weightKg !== undefined && initialData?.weightKg > 0
      ? Number((initialData.weightKg / numARs).toFixed(2))
      : 0;

    const baseNotes = initialData?.notes ? initialData.notes : (numARs > 1 ? `AR automatizado (${i + 1}/${numARs})` : 'AR gerado automaticamente');
    const arNotes = numARs > 1 && initialData?.notes ? `${initialData.notes} (${i + 1}/${numARs})` : baseNotes;

    // Filter QA/QC samples that belong to this AR's sample range
    const arQaqc = (initialData?.qaqcSamples || []).filter((sample) => {
      const sDetails = parseSampleCodeDetails(sample.code);
      if (sDetails && typeof sDetails.num === 'number') {
        return sDetails.num >= fromNum && sDetails.num <= toNum;
      }
      // If code cannot be parsed numerically, assign to the first AR
      return i === 0;
    });

    generatedARs.push({
      arCode,
      drillHoleId: hole.id,
      drillHoleCode: hole.code,
      startSampleCode: arStartCode,
      endSampleCode: arEndCode,
      sampleRanges: arRange,
      sampleCount: size,
      volumeCount,
      weightKg: initialWeight,
      shipmentDate: initialData?.shipmentDate || new Date().toISOString().split('T')[0],
      createdById: activeUser.id,
      createdByName: activeUser.name,
      notes: arNotes,
      qaqcSamples: arQaqc,
    });

    currentNum = toNum + 1;
  }

  return generatedARs;
}

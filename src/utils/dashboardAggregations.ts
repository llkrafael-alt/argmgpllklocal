import { SampleShipmentAR, DrillHole, OreasStockEntry, ProductionLog } from '../types';

/**
 * Utilitários puros de agregação para o Dashboard Analítico de Remessas & QA/QC
 * Funções puras: sem React, sem Firestore, 100% testáveis.
 */

export interface DashboardKpis {
  totalARs: number;
  totalSamples: number;
  totalWeightKg: number;
  uniqueHolesCount: number;
}

export interface WeeklyShipmentData {
  weekKey: string;
  weekLabel: string;
  monthKey: string;
  sortTimestamp: number;
  arCount: number;
  sampleCount: number;
  weightKg: number;
  acumuladoMes: number;
}

export interface TargetHoleStatus {
  target: string;
  emAndamento: number;
  concluidos: number;
  total: number;
}

export interface HolesStatusSummary {
  byTarget: TargetHoleStatus[];
  totalHoles: number;
  totalEmAndamento: number;
  totalConcluidos: number;
  taxaConclusao: number; // Porcentagem de 0 a 100
  isInferred: boolean;   // Indica se a conclusão foi inferida por cobertura de ARs
  inferredHolesCount: number;
}

export interface OreasStockStatus {
  code: string;
  lotOrNotes?: string;
  currentStock: number;
  consumedInPeriod: number;
  avgWeeklyConsumption: number;
  estimatedDaysRemaining: number | null; // null se consumo for 0
}

export interface OreasAnalyticsSummary {
  items: OreasStockStatus[];
  totalStockQuantity: number;
  totalConsumedInPeriod: number;
  hasConsumptionData: boolean;
}

// ============================================================================
// FORMATADORES PT-BR
// ============================================================================

export function formatNumberPtBR(num: number, decimals = 0): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatKgPtBR(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0,0 kg';
  return `${formatNumberPtBR(num, 1)} kg`;
}

// ============================================================================
// FILTRAGEM POR PERÍODO
// ============================================================================

/**
 * Normaliza datas string para o formato YYYY-MM-DD
 */
export function normalizeDateString(d?: string | null): string {
  if (!d) return '';
  const trimmed = d.trim();
  if (trimmed.includes('T')) return trimmed.split('T')[0];
  if (trimmed.includes('/')) {
    // Caso venha DD/MM/AAAA
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return trimmed.slice(0, 10);
}

/**
 * Filtra ARs por data de envio (shipmentDate) no intervalo [startDate, endDate]
 */
export function filterARsByPeriod(
  ars: SampleShipmentAR[],
  startDate?: string,
  endDate?: string
): SampleShipmentAR[] {
  if (!Array.isArray(ars)) return [];
  const start = normalizeDateString(startDate);
  const end = normalizeDateString(endDate);

  return ars.filter((ar) => {
    if (!ar) return false;
    const sDate = normalizeDateString(ar.shipmentDate || ar.createdAt);
    if (!sDate) return false;
    if (start && sDate < start) return false;
    if (end && sDate > end) return false;
    return true;
  });
}

// ============================================================================
// 1. KPI CARDS
// ============================================================================

export function calculateDashboardKpis(filteredARs: SampleShipmentAR[]): DashboardKpis {
  if (!Array.isArray(filteredARs) || filteredARs.length === 0) {
    return {
      totalARs: 0,
      totalSamples: 0,
      totalWeightKg: 0,
      uniqueHolesCount: 0,
    };
  }

  const uniqueHoles = new Set<string>();
  let totalSamples = 0;
  let totalWeightKg = 0;

  for (const ar of filteredARs) {
    if (!ar) continue;
    const holeKey = (ar.drillHoleId || ar.drillHoleCode || '').trim();
    if (holeKey) uniqueHoles.add(holeKey);

    const samples = typeof ar.sampleCount === 'number' && !isNaN(ar.sampleCount) ? ar.sampleCount : 0;
    const weight = typeof ar.weightKg === 'number' && !isNaN(ar.weightKg) ? ar.weightKg : 0;

    totalSamples += samples;
    totalWeightKg += weight;
  }

  return {
    totalARs: filteredARs.length,
    totalSamples,
    totalWeightKg: Number(totalWeightKg.toFixed(1)),
    uniqueHolesCount: uniqueHoles.size,
  };
}

// ============================================================================
// 2. ENVIOS POR SEMANA COM ACUMULADO DO MÊS
// ============================================================================

function getMondayOfDate(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Domingo, 1 = Segunda, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function agruparPorSemana(ars: SampleShipmentAR[]): WeeklyShipmentData[] {
  if (!Array.isArray(ars) || ars.length === 0) return [];

  const map = new Map<
    string,
    {
      weekKey: string;
      weekLabel: string;
      monthKey: string;
      sortTimestamp: number;
      arCount: number;
      sampleCount: number;
      weightKg: number;
    }
  >();

  for (const ar of ars) {
    if (!ar) continue;
    const dateStr = normalizeDateString(ar.shipmentDate || ar.createdAt);
    if (!dateStr || dateStr.length < 10) continue;

    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);

    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) continue;

    const monday = getMondayOfDate(d);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = (n: number) => String(n).padStart(2, '0');
    const weekKey = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    const weekLabel = `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} - ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`;
    const monthKey = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}`;

    const existing = map.get(weekKey);
    const samples = typeof ar.sampleCount === 'number' && !isNaN(ar.sampleCount) ? ar.sampleCount : 0;
    const weight = typeof ar.weightKg === 'number' && !isNaN(ar.weightKg) ? ar.weightKg : 0;

    if (existing) {
      existing.arCount += 1;
      existing.sampleCount += samples;
      existing.weightKg += weight;
    } else {
      map.set(weekKey, {
        weekKey,
        weekLabel,
        monthKey,
        sortTimestamp: monday.getTime(),
        arCount: 1,
        sampleCount: samples,
        weightKg: weight,
      });
    }
  }

  // Ordena cronologicamente
  const sorted = Array.from(map.values()).sort((a, b) => a.sortTimestamp - b.sortTimestamp);

  // Calcula o acumulado do mês (reinicia quando o mês muda)
  let currentMonth = '';
  let runningMonthTotal = 0;

  const result: WeeklyShipmentData[] = sorted.map((item) => {
    if (item.monthKey !== currentMonth) {
      currentMonth = item.monthKey;
      runningMonthTotal = item.sampleCount;
    } else {
      runningMonthTotal += item.sampleCount;
    }

    return {
      ...item,
      weightKg: Number(item.weightKg.toFixed(1)),
      acumuladoMes: runningMonthTotal,
    };
  });

  return result;
}

// ============================================================================
// 3. FUROS POR SITUAÇÃO (EM ANDAMENTO VS CONCLUÍDOS POR ALVO)
// ============================================================================

export function furosPorSituacao(
  holes: DrillHole[],
  ars: SampleShipmentAR[] = []
): HolesStatusSummary {
  if (!Array.isArray(holes) || holes.length === 0) {
    return {
      byTarget: [],
      totalHoles: 0,
      totalEmAndamento: 0,
      totalConcluidos: 0,
      taxaConclusao: 0,
      isInferred: false,
      inferredHolesCount: 0,
    };
  }

  // Regra 1: Verificar se existe pelo menos um furo com completedAt preenchido
  const hasAnyCompletedAt = holes.some(
    (h) => h.completedAt !== null && h.completedAt !== undefined && h.completedAt.trim() !== ''
  );

  let inferredHolesCount = 0;

  // Mapa de total de amostras despachadas por furo a partir das ARs
  const shippedSamplesByHole = new Map<string, number>();
  for (const ar of ars) {
    if (!ar) continue;
    const keyId = (ar.drillHoleId || '').trim();
    const keyCode = (ar.drillHoleCode || '').trim().toUpperCase();
    const count = typeof ar.sampleCount === 'number' && !isNaN(ar.sampleCount) ? ar.sampleCount : 0;

    if (keyId) shippedSamplesByHole.set(keyId, (shippedSamplesByHole.get(keyId) || 0) + count);
    if (keyCode) shippedSamplesByHole.set(keyCode, (shippedSamplesByHole.get(keyCode) || 0) + count);
  }

  const targetMap = new Map<string, { emAndamento: number; concluidos: number }>();

  let totalEmAndamento = 0;
  let totalConcluidos = 0;

  for (const hole of holes) {
    if (!hole) continue;
    const target = (hole.target || 'GERAL').trim().toUpperCase() || 'GERAL';

    let isCompleted = false;

    if (hasAnyCompletedAt) {
      // Uso direto do campo completedAt
      isCompleted = hole.completedAt !== null && hole.completedAt !== undefined && hole.completedAt.trim() !== '';
    } else {
      // Inferência conforme especificação:
      // Furo concluído = totalMeters coberto pelas ARs (soma de sampleCount cobrindo o plano ou metragem)
      const shipped = Math.max(
        shippedSamplesByHole.get(hole.id) || 0,
        shippedSamplesByHole.get(hole.code.trim().toUpperCase()) || 0
      );

      const planned = hole.calculatedSampleCount || 0;
      const meters = hole.totalMeters || Math.max(0, hole.endMeter - hole.startMeter);

      // Se possui plano com amostras calculadas e atingiu a meta
      if (planned > 0 && shipped >= planned) {
        isCompleted = true;
      } else if (meters > 0 && shipped >= meters) {
        // Se a amostragem atingiu ou superou a metragem perfurada (ex: 1 amostra/metro)
        isCompleted = true;
      }

      if (isCompleted) {
        inferredHolesCount++;
      }
    }

    if (isCompleted) {
      totalConcluidos++;
    } else {
      totalEmAndamento++;
    }

    const tData = targetMap.get(target) || { emAndamento: 0, concluidos: 0 };
    if (isCompleted) {
      tData.concluidos += 1;
    } else {
      tData.emAndamento += 1;
    }
    targetMap.set(target, tData);
  }

  const byTarget: TargetHoleStatus[] = Array.from(targetMap.entries())
    .map(([target, counts]) => ({
      target,
      emAndamento: counts.emAndamento,
      concluidos: counts.concluidos,
      total: counts.emAndamento + counts.concluidos,
    }))
    .sort((a, b) => b.total - a.total);

  const totalHoles = holes.length;
  const taxaConclusao = totalHoles > 0 ? Number(((totalConcluidos / totalHoles) * 100).toFixed(1)) : 0;

  return {
    byTarget,
    totalHoles,
    totalEmAndamento,
    totalConcluidos,
    taxaConclusao,
    isInferred: !hasAnyCompletedAt,
    inferredHolesCount,
  };
}

// ============================================================================
// 4. ESTOQUE E CONSUMO MÉDIO OREAS
// ============================================================================

export function calcularEstoqueOreas(
  oreasStockEntries: OreasStockEntry[],
  filteredARs: SampleShipmentAR[] = [],
  periodDays = 30
): OreasAnalyticsSummary {
  const stockMap = new Map<string, { currentStock: number; lotOrNotes?: string }>();

  // 1. Saldo atual por code a partir de OreasStockEntry (soma de quantity)
  if (Array.isArray(oreasStockEntries)) {
    for (const entry of oreasStockEntries) {
      if (!entry) continue;
      const rawCode = (entry.code || '').trim().toUpperCase();
      if (!rawCode) continue;

      const qty = typeof entry.quantity === 'number' && !isNaN(entry.quantity) ? entry.quantity : 0;
      const existing = stockMap.get(rawCode) || { currentStock: 0, lotOrNotes: entry.lotOrNotes };
      existing.currentStock += qty;
      if (!existing.lotOrNotes && entry.lotOrNotes) {
        existing.lotOrNotes = entry.lotOrNotes;
      }
      stockMap.set(rawCode, existing);
    }
  }

  // 2. Consumo no período a partir de qaqcSamples nas ARs filtradas
  const consumptionMap = new Map<string, number>();
  let hasAnyConsumption = false;

  if (Array.isArray(filteredARs)) {
    for (const ar of filteredARs) {
      if (!ar || !Array.isArray(ar.qaqcSamples)) continue;

      for (const q of ar.qaqcSamples) {
        if (!q) continue;
        const qType = (q.type || '').trim().toUpperCase();
        const isOreas = qType === 'OREAS' || qType.includes('OREAS') || Boolean(q.oreasProduct);
        if (!isOreas) continue;

        // O código do produto OREAS pode estar em oreasProduct (ex: "250c") ou em code
        const oreasCode = (q.oreasProduct || q.code || '').trim().toUpperCase();
        if (!oreasCode) continue;

        const consumedQty = typeof q.quantity === 'number' && q.quantity > 0 ? q.quantity : 1;
        consumptionMap.set(oreasCode, (consumptionMap.get(oreasCode) || 0) + consumedQty);
        hasAnyConsumption = true;

        // Se o código ainda não estava no mapa de estoque, registra com saldo 0
        if (!stockMap.has(oreasCode)) {
          stockMap.set(oreasCode, { currentStock: 0, lotOrNotes: q.notes });
        }
      }
    }
  }

  const effectiveDays = Math.max(1, periodDays);
  const items: OreasStockStatus[] = [];
  let totalStockQuantity = 0;
  let totalConsumedInPeriod = 0;

  for (const [code, stockData] of stockMap.entries()) {
    const consumed = consumptionMap.get(code) || 0;
    totalStockQuantity += stockData.currentStock;
    totalConsumedInPeriod += consumed;

    // Consumo médio diário e semanal
    const dailyConsumption = consumed / effectiveDays;
    const avgWeeklyConsumption = Number((dailyConsumption * 7).toFixed(1));

    let estimatedDaysRemaining: number | null = null;
    if (dailyConsumption > 0 && stockData.currentStock > 0) {
      estimatedDaysRemaining = Math.round(stockData.currentStock / dailyConsumption);
    }

    items.push({
      code,
      lotOrNotes: stockData.lotOrNotes,
      currentStock: stockData.currentStock,
      consumedInPeriod: consumed,
      avgWeeklyConsumption,
      estimatedDaysRemaining,
    });
  }

  // Ordena por maior saldo de estoque primeiro
  items.sort((a, b) => b.currentStock - a.currentStock);

  return {
    items,
    totalStockQuantity,
    totalConsumedInPeriod,
    hasConsumptionData: hasAnyConsumption,
  };
}

import { OreasStockEntry, SampleShipmentAR, QaQcSample } from '../types';

export interface OreasStockSummaryItem {
  code: string;
  totalReceived: number;
  totalUsed: number;
  currentStock: number;
  status: 'normal' | 'low' | 'out_of_stock';
  entries: OreasStockEntry[];
  usages: {
    arId: string;
    arCode: string;
    drillHoleCode: string;
    shipmentDate: string;
    quantityUsed: number;
    sampleCode?: string;
    userName?: string;
    notes?: string;
  }[];
}

/**
 * Extracts the OREAS product name (e.g. "250c", "626") from a QA/QC sample item.
 */
export function getSampleOreasProduct(sample: Partial<QaQcSample>): string {
  if (sample.oreasProduct && sample.oreasProduct.trim()) {
    return sample.oreasProduct.trim();
  }
  return (sample.notes || sample.code || '').trim();
}

/**
 * Calculates current stock balances and usages for all OREAS product codes
 */
export function calculateOreasBalances(
  entries: OreasStockEntry[],
  ars: SampleShipmentAR[]
): OreasStockSummaryItem[] {
  const codeMap = new Map<string, OreasStockSummaryItem>();

  // 1. Process all stock received entries
  entries.forEach((entry) => {
    const key = (entry.code || '').trim().toUpperCase();
    if (!key) return;

    if (!codeMap.has(key)) {
      codeMap.set(key, {
        code: (entry.code || '').trim(),
        totalReceived: 0,
        totalUsed: 0,
        currentStock: 0,
        status: 'normal',
        entries: [],
        usages: [],
      });
    }

    const item = codeMap.get(key)!;
    item.totalReceived += Math.max(0, entry.quantity);
    item.entries.push(entry);
  });

  // 2. Process usages across all active ARs
  ars.forEach((ar) => {
    if (!ar.qaqcSamples) return;

    ar.qaqcSamples.forEach((sample) => {
      const type = (sample.type || '').trim().toUpperCase();
      if (type !== 'OREAS') return;

      const product = getSampleOreasProduct(sample);
      const key = product.toUpperCase();
      if (!key) return;

      if (!codeMap.has(key)) {
        codeMap.set(key, {
          code: product,
          totalReceived: 0,
          totalUsed: 0,
          currentStock: 0,
          status: 'normal',
          entries: [],
          usages: [],
        });
      }

      const item = codeMap.get(key)!;
      const qtyUsed = sample.quantity !== undefined && sample.quantity !== null && sample.quantity > 0
        ? sample.quantity
        : 1;

      item.totalUsed += qtyUsed;
      item.usages.push({
        arId: ar.id,
        arCode: ar.arCode,
        drillHoleCode: ar.drillHoleCode,
        shipmentDate: ar.shipmentDate,
        quantityUsed: qtyUsed,
        sampleCode: sample.code,
        userName: ar.createdByName || 'Usuário Não Registrado',
        notes: sample.notes,
      });
    });
  });

  // 3. Compute final currentStock and status
  const result: OreasStockSummaryItem[] = [];

  codeMap.forEach((item) => {
    // Only include items that have registered stock entries in the stock control module
    if (item.entries.length === 0) return;

    item.currentStock = item.totalReceived - item.totalUsed;

    if (item.currentStock <= 0) {
      item.status = 'out_of_stock';
    } else if (item.currentStock <= 5) {
      item.status = 'low';
    } else {
      item.status = 'normal';
    }

    // Sort entries by date descending
    item.entries.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    // Sort usages by date descending
    item.usages.sort((a, b) => new Date(b.shipmentDate).getTime() - new Date(a.shipmentDate).getTime());

    result.push(item);
  });

  // Sort by code alphabetically
  result.sort((a, b) => a.code.localeCompare(b.code));

  return result;
}

/**
 * Helper to get available stock for a specific OREAS product code,
 * optionally excluding the usage from a specific AR being edited.
 */
export function getAvailableStockForCode(
  productCode: string,
  entries: OreasStockEntry[],
  ars: SampleShipmentAR[],
  currentArIdToExclude?: string
): { totalReceived: number; totalUsed: number; availableStock: number } {
  const normProduct = (productCode || '').trim().toUpperCase();
  if (!normProduct) return { totalReceived: 0, totalUsed: 0, availableStock: 0 };

  const totalReceived = entries
    .filter((e) => (e.code || '').trim().toUpperCase() === normProduct)
    .reduce((sum, e) => sum + Math.max(0, e.quantity), 0);

  const totalUsed = ars
    .filter((ar) => !currentArIdToExclude || ar.id !== currentArIdToExclude)
    .reduce((sum, ar) => {
      if (!ar.qaqcSamples) return sum;
      const arUsed = ar.qaqcSamples
        .filter((s) => (s.type || '').trim().toUpperCase() === 'OREAS' && getSampleOreasProduct(s).toUpperCase() === normProduct)
        .reduce((qtySum, s) => qtySum + (s.quantity && s.quantity > 0 ? s.quantity : 1), 0);
      return sum + arUsed;
    }, 0);

  return {
    totalReceived,
    totalUsed,
    availableStock: totalReceived - totalUsed,
  };
}

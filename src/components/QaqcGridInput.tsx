import React, { useState, useEffect, useRef } from 'react';
import { QaQcSample, OreasStockEntry, SampleShipmentAR } from '../types';
import { getAvailableStockForCode } from '../utils/oreasStock';
import {
  ShieldCheck,
  Layers,
  Copy,
  Plus,
  Trash2,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface OreasRow {
  id: string;
  code: string;
  lot: string;
}

interface SingleRow {
  id: string;
  code: string;
}

interface QaqcGridInputProps {
  initialSamples: QaQcSample[];
  onChange: (samples: QaQcSample[]) => void;
  oreasStockEntries?: OreasStockEntry[];
  ars?: SampleShipmentAR[];
  currentArId?: string;
  resetKey?: string | number;
}

const generateId = () => `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

const createBlankOreasRow = (): OreasRow => ({
  id: generateId(),
  code: '',
  lot: '',
});

const createBlankSingleRow = (): SingleRow => ({
  id: generateId(),
  code: '',
});

const buildInitialRows = (samples: QaQcSample[]) => {
  const existingOreas: OreasRow[] = [];
  const existingBlk: SingleRow[] = [];
  const existingDup: SingleRow[] = [];

  (samples || []).forEach((s) => {
    const typeUpper = (s.type || '').trim().toUpperCase();
    if (typeUpper.includes('OREAS') || s.oreasProduct) {
      existingOreas.push({
        id: s.id || generateId(),
        code: s.code || '',
        lot: s.oreasProduct || s.notes || '',
      });
    } else if (
      typeUpper.includes('BLK') ||
      typeUpper.includes('GESSO') ||
      typeUpper.includes('BRANCO')
    ) {
      existingBlk.push({
        id: s.id || generateId(),
        code: s.code || '',
      });
    } else if (typeUpper.includes('DUP') || typeUpper.includes('DUPLICATA')) {
      existingDup.push({
        id: s.id || generateId(),
        code: s.code || '',
      });
    } else {
      // Fallback for other standard types -> place in DUP column
      existingDup.push({
        id: s.id || generateId(),
        code: s.code || '',
      });
    }
  });

  // Ensure each column opens with at least 10 rows by default
  while (existingOreas.length < 10) {
    existingOreas.push(createBlankOreasRow());
  }
  while (existingBlk.length < 10) {
    existingBlk.push(createBlankSingleRow());
  }
  while (existingDup.length < 10) {
    existingDup.push(createBlankSingleRow());
  }

  return { oreas: existingOreas, blk: existingBlk, dup: existingDup };
};

export const QaqcGridInput: React.FC<QaqcGridInputProps> = ({
  initialSamples,
  onChange,
  oreasStockEntries = [],
  ars = [],
  currentArId,
  resetKey,
}) => {
  // 3 independent row states for each column, initialized with 10 rows each
  const [oreasRows, setOreasRows] = useState<OreasRow[]>(() => buildInitialRows(initialSamples).oreas);
  const [blkRows, setBlkRows] = useState<SingleRow[]>(() => buildInitialRows(initialSamples).blk);
  const [dupRows, setDupRows] = useState<SingleRow[]>(() => buildInitialRows(initialSamples).dup);

  // Tab view selection (All 3 columns or focused single column on mobile/tablet)
  const [activeTab, setActiveTab] = useState<'all' | 'oreas' | 'blk' | 'dup'>('all');

  // Refs for keyboard navigation on Enter
  const oreasCodeRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const oreasLotRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const blkCodeRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const dupCodeRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Pending focus after adding row
  const pendingFocusRef = useRef<{ column: 'oreas' | 'blk' | 'dup'; index: number; field?: 'code' | 'lot' } | null>(null);

  // Track last focused Oreas row index for quick-chip applying
  const [lastFocusedOreasIndex, setLastFocusedOreasIndex] = useState<number | null>(null);

  // Re-sync if current AR ID changes, resetKey changes, or initialSamples transitions from empty to populated (or vice versa)
  const prevArIdRef = useRef(currentArId);
  const prevResetKeyRef = useRef(resetKey);
  const prevSamplesSignatureRef = useRef<string>(
    (initialSamples || []).map((s) => `${s.type}:${s.code}:${s.oreasProduct || ''}`).join('|')
  );

  useEffect(() => {
    const arIdChanged = prevArIdRef.current !== currentArId;
    const resetKeyChanged = resetKey !== undefined && prevResetKeyRef.current !== resetKey;
    const currentSignature = (initialSamples || []).map((s) => `${s.type}:${s.code}:${s.oreasProduct || ''}`).join('|');
    const signatureChanged = prevSamplesSignatureRef.current !== currentSignature;

    // Only re-sync from props if arId/resetKey changed, or if initialSamples was populated or cleared from outside
    const isTransition =
      (prevSamplesSignatureRef.current === '' && currentSignature !== '') ||
      (prevSamplesSignatureRef.current !== '' && currentSignature === '');

    if (arIdChanged || resetKeyChanged || (signatureChanged && isTransition)) {
      prevArIdRef.current = currentArId;
      prevResetKeyRef.current = resetKey;
      prevSamplesSignatureRef.current = currentSignature;
      const initial = buildInitialRows(initialSamples || []);
      setOreasRows(initial.oreas);
      setBlkRows(initial.blk);
      setDupRows(initial.dup);
    }
  }, [currentArId, resetKey, initialSamples]);

  // Execute pending focus if a row was just added via Enter or button
  useEffect(() => {
    if (!pendingFocusRef.current) return;
    const { column, index, field } = pendingFocusRef.current;
    pendingFocusRef.current = null;

    requestAnimationFrame(() => {
      if (column === 'oreas') {
        if (field === 'lot') {
          oreasLotRefs.current[index]?.focus();
        } else {
          oreasCodeRefs.current[index]?.focus();
        }
      } else if (column === 'blk') {
        blkCodeRefs.current[index]?.focus();
      } else if (column === 'dup') {
        dupCodeRefs.current[index]?.focus();
      }
    });
  }, [oreasRows, blkRows, dupRows]);

  // Convert current filled rows to standard QaQcSample[] and emit
  const emitCleanedSamples = (
    currentOreas: OreasRow[],
    currentBlk: SingleRow[],
    currentDup: SingleRow[]
  ) => {
    const cleaned: QaQcSample[] = [];

    // OREAS: only include rows with non-empty code
    currentOreas.forEach((r) => {
      const code = r.code.trim().toUpperCase();
      const lot = r.lot.trim();
      if (code !== '') {
        cleaned.push({
          id: r.id,
          type: 'OREAS',
          code,
          oreasProduct: lot || undefined,
          notes: lot || undefined,
          quantity: 1,
        });
      }
    });

    // BLK: only include rows with non-empty code
    currentBlk.forEach((r) => {
      const code = r.code.trim().toUpperCase();
      if (code !== '') {
        cleaned.push({
          id: r.id,
          type: 'BLK',
          code,
          quantity: 1,
        });
      }
    });

    // DUP: only include rows with non-empty code
    currentDup.forEach((r) => {
      const code = r.code.trim().toUpperCase();
      if (code !== '') {
        cleaned.push({
          id: r.id,
          type: 'DUP',
          code,
          quantity: 1,
        });
      }
    });

    onChange(cleaned);
  };

  // --- OREAS Handlers ---
  const handleOreasChange = (index: number, field: 'code' | 'lot', value: string) => {
    const updated = [...oreasRows];
    updated[index] = {
      ...updated[index],
      [field]: field === 'code' ? value.toUpperCase() : value,
    };
    setOreasRows(updated);
    emitCleanedSamples(updated, blkRows, dupRows);
  };

  const handleAddOreasRow = (focusIndex?: number) => {
    const updated = [...oreasRows, createBlankOreasRow()];
    setOreasRows(updated);
    const newIdx = focusIndex !== undefined ? focusIndex : updated.length - 1;
    pendingFocusRef.current = { column: 'oreas', index: newIdx, field: 'code' };
  };

  const handleAddMultipleOreasRows = (count: number = 5) => {
    const newRows: OreasRow[] = Array.from({ length: count }, () => createBlankOreasRow());
    const updated = [...oreasRows, ...newRows];
    setOreasRows(updated);
  };

  const handleQuickApplyOreas = (lot: string) => {
    const updated = [...oreasRows];
    let targetIdx = lastFocusedOreasIndex;

    // Check if targetIdx is valid and doesn't already have this lot
    if (
      targetIdx === null ||
      targetIdx < 0 ||
      targetIdx >= updated.length ||
      (updated[targetIdx].code.trim() !== '' && updated[targetIdx].lot.trim() !== '')
    ) {
      // Find first row with a sample code and empty lot
      const pendingRowIdx = updated.findIndex((r) => r.code.trim() !== '' && r.lot.trim() === '');
      if (pendingRowIdx !== -1) {
        targetIdx = pendingRowIdx;
      } else {
        // Find first blank row
        const emptyRowIdx = updated.findIndex((r) => r.code.trim() === '' && r.lot.trim() === '');
        if (emptyRowIdx !== -1) {
          targetIdx = emptyRowIdx;
        } else {
          updated.push(createBlankOreasRow());
          targetIdx = updated.length - 1;
        }
      }
    }

    updated[targetIdx] = {
      ...updated[targetIdx],
      lot,
    };

    setOreasRows(updated);
    emitCleanedSamples(updated, blkRows, dupRows);

    // If sample code of that row is empty, focus code; otherwise keep lot focused
    if (!updated[targetIdx].code.trim()) {
      oreasCodeRefs.current[targetIdx]?.focus();
    } else {
      oreasLotRefs.current[targetIdx]?.focus();
    }
  };

  const handleClearEmptyOreasRows = () => {
    const filled = oreasRows.filter((r) => r.code.trim() !== '' || r.lot.trim() !== '');
    while (filled.length < 10) {
      filled.push(createBlankOreasRow());
    }
    setOreasRows(filled);
  };

  const handleDeleteOreasRow = (index: number) => {
    let updated: OreasRow[];
    if (oreasRows.length > 10) {
      updated = oreasRows.filter((_, i) => i !== index);
    } else {
      // Clear row content if 10 or fewer rows to maintain 10-line canvas
      updated = [...oreasRows];
      updated[index] = createBlankOreasRow();
    }
    setOreasRows(updated);
    emitCleanedSamples(updated, blkRows, dupRows);
  };

  const handleOreasKeyDown = (e: React.KeyboardEvent, index: number, field: 'code' | 'lot') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'code') {
        // Move focus to lot of same row
        oreasLotRefs.current[index]?.focus();
      } else {
        // In lot: move to code of next row
        if (index === oreasRows.length - 1) {
          // Last row: append new row and focus
          handleAddOreasRow(index + 1);
        } else {
          oreasCodeRefs.current[index + 1]?.focus();
        }
      }
    }
  };

  const handleOreasPaste = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number, field: 'code' | 'lot') => {
    const text = e.clipboardData.getData('text');
    if (!text || (!text.includes('\n') && !text.includes('\t'))) return;

    e.preventDefault();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const updated = [...oreasRows];

    lines.forEach((line, lineOffset) => {
      const targetIndex = startIndex + lineOffset;
      while (targetIndex >= updated.length) {
        updated.push(createBlankOreasRow());
      }

      if (line.includes('\t') || line.includes(';') || line.includes(',')) {
        const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
        const parts = line.split(delimiter).map((p) => p.trim());
        updated[targetIndex] = {
          ...updated[targetIndex],
          code: (parts[0] || '').toUpperCase(),
          lot: parts[1] || updated[targetIndex].lot,
        };
      } else {
        if (field === 'code') {
          updated[targetIndex] = {
            ...updated[targetIndex],
            code: line.toUpperCase(),
          };
        } else {
          updated[targetIndex] = {
            ...updated[targetIndex],
            lot: line,
          };
        }
      }
    });

    setOreasRows(updated);
    emitCleanedSamples(updated, blkRows, dupRows);
  };

  // --- BLK Handlers ---
  const handleBlkChange = (index: number, value: string) => {
    const updated = [...blkRows];
    updated[index] = {
      ...updated[index],
      code: value.toUpperCase(),
    };
    setBlkRows(updated);
    emitCleanedSamples(oreasRows, updated, dupRows);
  };

  const handleAddBlkRow = (focusIndex?: number) => {
    const updated = [...blkRows, createBlankSingleRow()];
    setBlkRows(updated);
    const newIdx = focusIndex !== undefined ? focusIndex : updated.length - 1;
    pendingFocusRef.current = { column: 'blk', index: newIdx };
  };

  const handleAddMultipleBlkRows = (count: number = 5) => {
    const newRows: SingleRow[] = Array.from({ length: count }, () => createBlankSingleRow());
    const updated = [...blkRows, ...newRows];
    setBlkRows(updated);
  };

  const handleClearEmptyBlkRows = () => {
    const filled = blkRows.filter((r) => r.code.trim() !== '');
    while (filled.length < 10) {
      filled.push(createBlankSingleRow());
    }
    setBlkRows(filled);
  };

  const handleDeleteBlkRow = (index: number) => {
    let updated: SingleRow[];
    if (blkRows.length > 10) {
      updated = blkRows.filter((_, i) => i !== index);
    } else {
      updated = [...blkRows];
      updated[index] = createBlankSingleRow();
    }
    setBlkRows(updated);
    emitCleanedSamples(oreasRows, updated, dupRows);
  };

  const handleBlkKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === blkRows.length - 1) {
        handleAddBlkRow(index + 1);
      } else {
        blkCodeRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleBlkPaste = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number) => {
    const text = e.clipboardData.getData('text');
    if (!text || (!text.includes('\n') && !text.includes('\t'))) return;

    e.preventDefault();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const updated = [...blkRows];
    lines.forEach((line, lineOffset) => {
      const targetIndex = startIndex + lineOffset;
      while (targetIndex >= updated.length) {
        updated.push(createBlankSingleRow());
      }
      const codeVal = line.split('\t')[0].trim().toUpperCase();
      updated[targetIndex] = {
        ...updated[targetIndex],
        code: codeVal,
      };
    });

    setBlkRows(updated);
    emitCleanedSamples(oreasRows, updated, dupRows);
  };

  // --- DUP Handlers ---
  const handleDupChange = (index: number, value: string) => {
    const updated = [...dupRows];
    updated[index] = {
      ...updated[index],
      code: value.toUpperCase(),
    };
    setDupRows(updated);
    emitCleanedSamples(oreasRows, blkRows, updated);
  };

  const handleAddDupRow = (focusIndex?: number) => {
    const updated = [...dupRows, createBlankSingleRow()];
    setDupRows(updated);
    const newIdx = focusIndex !== undefined ? focusIndex : updated.length - 1;
    pendingFocusRef.current = { column: 'dup', index: newIdx };
  };

  const handleAddMultipleDupRows = (count: number = 5) => {
    const newRows: SingleRow[] = Array.from({ length: count }, () => createBlankSingleRow());
    const updated = [...dupRows, ...newRows];
    setDupRows(updated);
  };

  const handleClearEmptyDupRows = () => {
    const filled = dupRows.filter((r) => r.code.trim() !== '');
    while (filled.length < 10) {
      filled.push(createBlankSingleRow());
    }
    setDupRows(filled);
  };

  const handleDeleteDupRow = (index: number) => {
    let updated: SingleRow[];
    if (dupRows.length > 10) {
      updated = dupRows.filter((_, i) => i !== index);
    } else {
      updated = [...dupRows];
      updated[index] = createBlankSingleRow();
    }
    setDupRows(updated);
    emitCleanedSamples(oreasRows, blkRows, updated);
  };

  const handleDupKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === dupRows.length - 1) {
        handleAddDupRow(index + 1);
      } else {
        dupCodeRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleDupPaste = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number) => {
    const text = e.clipboardData.getData('text');
    if (!text || (!text.includes('\n') && !text.includes('\t'))) return;

    e.preventDefault();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const updated = [...dupRows];
    lines.forEach((line, lineOffset) => {
      const targetIndex = startIndex + lineOffset;
      while (targetIndex >= updated.length) {
        updated.push(createBlankSingleRow());
      }
      const codeVal = line.split('\t')[0].trim().toUpperCase();
      updated[targetIndex] = {
        ...updated[targetIndex],
        code: codeVal,
      };
    });

    setDupRows(updated);
    emitCleanedSamples(oreasRows, blkRows, updated);
  };

  // Known OREAS products in stock for datalist autocomplete & quick chips
  const knownOreasLots = Array.from(
    new Set(oreasStockEntries.map((e) => (e.code || '').trim()).filter(Boolean))
  ).sort();

  // Pre-calculate stock balances for quick selection chips
  const oreasStockChips = knownOreasLots.map((lot) => {
    const stock = getAvailableStockForCode(lot, oreasStockEntries, ars, currentArId);
    return {
      lot,
      availableStock: stock.availableStock,
      totalReceived: stock.totalReceived,
    };
  });

  // Calculate usage counts per OREAS lot within this form
  const currentOreasUsageMap: { [lot: string]: number } = {};
  oreasRows.forEach((r) => {
    const lotKey = r.lot.trim().toUpperCase();
    if (r.code.trim() && lotKey) {
      currentOreasUsageMap[lotKey] = (currentOreasUsageMap[lotKey] || 0) + 1;
    }
  });

  // Calculate counts of filled items
  const filledOreasCount = oreasRows.filter((r) => r.code.trim() !== '').length;
  const filledBlkCount = blkRows.filter((r) => r.code.trim() !== '').length;
  const filledDupCount = dupRows.filter((r) => r.code.trim() !== '').length;
  const totalFilled = filledOreasCount + filledBlkCount + filledDupCount;

  // Render OREAS column
  const renderOreasColumn = (isFullWidth = false) => (
    <div
      className={`flex flex-col rounded-2xl bg-slate-900 border border-purple-500/40 overflow-hidden shadow-md transition-all ${
        isFullWidth ? 'w-full' : 'flex-[1.4] min-w-[420px]'
      }`}
    >
      {/* Column Header */}
      <div className="p-3 bg-gradient-to-r from-purple-950/90 via-purple-900/40 to-slate-900 border-b border-purple-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-purple-400 shrink-0 shadow-sm shadow-purple-500/50" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider text-purple-200">
                OREAS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-900/80 text-purple-200 border border-purple-700/60">
                {filledOreasCount} de {oreasRows.length}
              </span>
            </div>
            <span className="text-xs text-purple-300/80 font-medium">
              Padrões Certificados (Baixa Automática em Estoque)
            </span>
          </div>
        </div>
      </div>

      {/* Quick-Apply Stock Chips for OREAS */}
      {oreasStockChips.length > 0 && (
        <div className="px-3 py-2 bg-purple-950/40 border-b border-purple-900/40 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-purple-300 font-bold flex items-center gap-1.5 text-xs">
              <Boxes className="w-3.5 h-3.5 text-purple-400" />
              Estoque Disponível:
            </span>
            <span className="text-[11px] text-purple-400/80 font-mono">
              (Clique para preencher a linha)
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {oreasStockChips.map(({ lot, availableStock }) => (
              <button
                key={lot}
                type="button"
                onClick={() => handleQuickApplyOreas(lot)}
                title={`Clique para atribuir ${lot} na linha atual/vazia (Saldo: ${availableStock} un)`}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all flex items-center gap-1.5 shrink-0 shadow-2xs hover:scale-105 active:scale-95 cursor-pointer ${
                  availableStock <= 0
                    ? 'bg-red-950/70 border-red-800/70 text-red-300 opacity-70'
                    : availableStock <= 5
                    ? 'bg-amber-950/70 border-amber-700/70 text-amber-200 hover:bg-amber-900'
                    : 'bg-purple-900/80 border-purple-600/70 text-purple-100 hover:bg-purple-800'
                }`}
              >
                <span>{lot}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                    availableStock <= 0
                      ? 'bg-red-800 text-white'
                      : availableStock <= 5
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {availableStock}un
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subheaders */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/90 border-b border-slate-800 text-xs font-black uppercase text-slate-300">
        <div className="w-8 sm:w-9 text-center font-mono shrink-0">#</div>
        <div className="flex-1 min-w-[130px]">Cód. Amostra</div>
        <div className="flex-1 min-w-[150px] flex items-center justify-between">
          <span>Padrão OREAS</span>
          <span className="text-[11px] text-purple-400 font-semibold lowercase">saldo</span>
        </div>
        <div className="w-8 text-center shrink-0"></div>
      </div>

      {/* Rows List */}
      <div className="flex flex-col divide-y divide-slate-800/80 max-h-[420px] overflow-y-auto">
        {oreasRows.map((row, idx) => {
          const lotKey = row.lot.trim().toUpperCase();
          const isFilled = row.code.trim() !== '';
          const stockInfo = lotKey
            ? getAvailableStockForCode(row.lot.trim(), oreasStockEntries, ars, currentArId)
            : null;
          const usagesInForm = currentOreasUsageMap[lotKey] || 0;
          const isExceeded = stockInfo && usagesInForm > stockInfo.availableStock;

          return (
            <div
              key={row.id}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                isFilled ? 'bg-purple-950/25 border-b border-purple-900/20' : 'hover:bg-slate-800/40'
              }`}
            >
              {/* Row Index */}
              <div className="w-8 sm:w-9 text-center font-mono text-xs text-slate-400 font-bold shrink-0">
                {idx + 1}
              </div>

              {/* Sample Code Input */}
              <div className="flex-1 min-w-[130px]">
                <input
                  ref={(el) => {
                    oreasCodeRefs.current[idx] = el;
                  }}
                  type="text"
                  placeholder="Ex: R09415"
                  value={row.code}
                  onFocus={() => setLastFocusedOreasIndex(idx)}
                  onChange={(e) => handleOreasChange(idx, 'code', e.target.value)}
                  onKeyDown={(e) => handleOreasKeyDown(e, idx, 'code')}
                  onPaste={(e) => handleOreasPaste(e, idx, 'code')}
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none transition-all h-11 sm:h-10 ${
                    isFilled
                      ? 'border-purple-500/70 bg-purple-950/40 text-purple-100 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30'
                      : 'border-slate-700 bg-slate-950/80 text-slate-200 placeholder:text-slate-500 focus:border-purple-500'
                  }`}
                />
              </div>

              {/* Lot / Product Input with stock badge */}
              <div className="flex-1 min-w-[150px] relative flex items-center">
                <input
                  ref={(el) => {
                    oreasLotRefs.current[idx] = el;
                  }}
                  type="text"
                  list="oreas-lots-list"
                  placeholder="Ex: 250c"
                  value={row.lot}
                  onFocus={() => setLastFocusedOreasIndex(idx)}
                  onChange={(e) => handleOreasChange(idx, 'lot', e.target.value)}
                  onKeyDown={(e) => handleOreasKeyDown(e, idx, 'lot')}
                  onPaste={(e) => handleOreasPaste(e, idx, 'lot')}
                  className={`w-full px-3 py-2 ${
                    lotKey && stockInfo ? 'pr-16' : 'pr-3'
                  } rounded-xl border text-sm font-mono font-bold outline-none transition-all h-11 sm:h-10 ${
                    isExceeded
                      ? 'border-red-500 bg-red-950/40 text-red-200 focus:border-red-400 focus:ring-1 focus:ring-red-400/30'
                      : row.lot.trim()
                      ? 'border-purple-500/60 bg-purple-950/30 text-purple-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30'
                      : 'border-slate-700 bg-slate-950/80 text-slate-200 placeholder:text-slate-500 focus:border-purple-500'
                  }`}
                  title={stockInfo ? `Padrão: ${row.lot} | Saldo disponível: ${stockInfo.availableStock} un.` : 'Padrão ou lote OREAS'}
                />
                {lotKey && stockInfo && (
                  <span
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black px-2 py-0.5 rounded-md pointer-events-none shadow-xs z-10 select-none ${
                      isExceeded
                        ? 'bg-red-600 text-white animate-pulse'
                        : stockInfo.availableStock <= 0
                        ? 'bg-red-900/90 text-red-200 border border-red-700'
                        : stockInfo.availableStock <= 5
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-emerald-600 text-white'
                    }`}
                    title={`Saldo em estoque: ${stockInfo.availableStock} un.`}
                  >
                    {stockInfo.availableStock}un
                  </span>
                )}
              </div>

              {/* Delete / Clear button */}
              <div className="w-8 shrink-0 flex justify-center">
                {row.code || row.lot ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteOreasRow(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Limpar / remover esta linha"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="w-4 h-4 text-slate-600 text-center text-xs leading-4">•</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Datalist for autocomplete with stock balances */}
      <datalist id="oreas-lots-list">
        {oreasStockChips.map(({ lot, availableStock }) => (
          <option key={lot} value={lot}>
            {lot} (Saldo: {availableStock} un)
          </option>
        ))}
      </datalist>

      {/* OREAS Footer & Action Buttons */}
      <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleAddOreasRow()}
            className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-700/70 text-purple-200 text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Linha
          </button>
          <button
            type="button"
            onClick={() => handleAddMultipleOreasRows(5)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            title="Adicionar mais 5 linhas vazias"
          >
            +5
          </button>
          {oreasRows.length > 10 && (
            <button
              type="button"
              onClick={handleClearEmptyOreasRows}
              className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              title="Recolher linhas em branco excedentes"
            >
              Limpar vazias
            </button>
          )}
        </div>

        {filledOreasCount > 0 && (
          <span className="text-xs text-purple-300 font-mono font-bold">
            {filledOreasCount} padrão(ões) ativo(s)
          </span>
        )}
      </div>
    </div>
  );

  // Render BLK column
  const renderBlkColumn = (isFullWidth = false) => (
    <div
      className={`flex flex-col rounded-2xl bg-slate-900 border border-amber-500/40 overflow-hidden shadow-md transition-all ${
        isFullWidth ? 'w-full' : 'flex-1 min-w-[280px]'
      }`}
    >
      {/* Column Header */}
      <div className="p-3 bg-gradient-to-r from-amber-950/90 via-amber-900/40 to-slate-900 border-b border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0 shadow-sm shadow-amber-500/50" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider text-amber-200">
                BLK
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-900/80 text-amber-200 border border-amber-700/60">
                {filledBlkCount} de {blkRows.length}
              </span>
            </div>
            <span className="text-xs text-amber-300/80 font-medium">
              Branco / Gesso / Quartzo
            </span>
          </div>
        </div>
      </div>

      {/* Subheaders */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/90 border-b border-slate-800 text-xs font-black uppercase text-slate-300">
        <div className="w-8 sm:w-9 text-center font-mono shrink-0">#</div>
        <div className="flex-1 min-w-[180px]">Cód. Amostra (Branco / Gesso)</div>
        <div className="w-8 text-center shrink-0"></div>
      </div>

      {/* Rows List */}
      <div className="flex flex-col divide-y divide-slate-800/80 max-h-[420px] overflow-y-auto">
        {blkRows.map((row, idx) => {
          const isFilled = row.code.trim() !== '';

          return (
            <div
              key={row.id}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                isFilled ? 'bg-amber-950/25 border-b border-amber-900/20' : 'hover:bg-slate-800/40'
              }`}
            >
              {/* Row Index */}
              <div className="w-8 sm:w-9 text-center font-mono text-xs text-slate-400 font-bold shrink-0">
                {idx + 1}
              </div>

              {/* Sample Code Input */}
              <div className="flex-1 min-w-[180px]">
                <input
                  ref={(el) => {
                    blkCodeRefs.current[idx] = el;
                  }}
                  type="text"
                  placeholder="Ex: R09400"
                  value={row.code}
                  onChange={(e) => handleBlkChange(idx, e.target.value)}
                  onKeyDown={(e) => handleBlkKeyDown(e, idx)}
                  onPaste={(e) => handleBlkPaste(e, idx)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none transition-all h-11 sm:h-10 ${
                    isFilled
                      ? 'border-amber-500/70 bg-amber-950/40 text-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30'
                      : 'border-slate-700 bg-slate-950/80 text-slate-200 placeholder:text-slate-500 focus:border-amber-500'
                  }`}
                />
              </div>

              {/* Delete / Clear button */}
              <div className="w-8 shrink-0 flex justify-center">
                {row.code ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteBlkRow(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Limpar / remover esta linha"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="w-4 h-4 text-slate-600 text-center text-xs leading-4">•</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BLK Footer & Action Buttons */}
      <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleAddBlkRow()}
            className="px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-700/70 text-amber-200 text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Linha
          </button>
          <button
            type="button"
            onClick={() => handleAddMultipleBlkRows(5)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            title="Adicionar mais 5 linhas vazias"
          >
            +5
          </button>
          {blkRows.length > 10 && (
            <button
              type="button"
              onClick={handleClearEmptyBlkRows}
              className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              title="Recolher linhas em branco excedentes"
            >
              Limpar vazias
            </button>
          )}
        </div>

        {filledBlkCount > 0 && (
          <span className="text-xs text-amber-300 font-mono font-bold">
            {filledBlkCount} padrão(ões) ativo(s)
          </span>
        )}
      </div>
    </div>
  );

  // Render DUP column
  const renderDupColumn = (isFullWidth = false) => (
    <div
      className={`flex flex-col rounded-2xl bg-slate-900 border border-cyan-500/40 overflow-hidden shadow-md transition-all ${
        isFullWidth ? 'w-full' : 'flex-1 min-w-[280px]'
      }`}
    >
      {/* Column Header */}
      <div className="p-3 bg-gradient-to-r from-cyan-950/90 via-cyan-900/40 to-slate-900 border-b border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0 shadow-sm shadow-cyan-500/50" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider text-cyan-200">
                DUP
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-900/80 text-cyan-200 border border-cyan-700/60">
                {filledDupCount} de {dupRows.length}
              </span>
            </div>
            <span className="text-xs text-cyan-300/80 font-medium">
              Duplicatas de Campo / Polpa
            </span>
          </div>
        </div>
      </div>

      {/* Subheaders */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/90 border-b border-slate-800 text-xs font-black uppercase text-slate-300">
        <div className="w-8 sm:w-9 text-center font-mono shrink-0">#</div>
        <div className="flex-1 min-w-[180px]">Cód. Amostra (Duplicata)</div>
        <div className="w-8 text-center shrink-0"></div>
      </div>

      {/* Rows List */}
      <div className="flex flex-col divide-y divide-slate-800/80 max-h-[420px] overflow-y-auto">
        {dupRows.map((row, idx) => {
          const isFilled = row.code.trim() !== '';

          return (
            <div
              key={row.id}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                isFilled ? 'bg-cyan-950/25 border-b border-cyan-900/20' : 'hover:bg-slate-800/40'
              }`}
            >
              {/* Row Index */}
              <div className="w-8 sm:w-9 text-center font-mono text-xs text-slate-400 font-bold shrink-0">
                {idx + 1}
              </div>

              {/* Sample Code Input */}
              <div className="flex-1 min-w-[180px]">
                <input
                  ref={(el) => {
                    dupCodeRefs.current[idx] = el;
                  }}
                  type="text"
                  placeholder="Ex: R09420"
                  value={row.code}
                  onChange={(e) => handleDupChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDupKeyDown(e, idx)}
                  onPaste={(e) => handleDupPaste(e, idx)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none transition-all h-11 sm:h-10 ${
                    isFilled
                      ? 'border-cyan-500/70 bg-cyan-950/40 text-cyan-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30'
                      : 'border-slate-700 bg-slate-950/80 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500'
                  }`}
                />
              </div>

              {/* Delete / Clear button */}
              <div className="w-8 shrink-0 flex justify-center">
                {row.code ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteDupRow(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Limpar / remover esta linha"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="w-4 h-4 text-slate-600 text-center text-xs leading-4">•</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DUP Footer & Action Buttons */}
      <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleAddDupRow()}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/70 text-cyan-200 text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Linha
          </button>
          <button
            type="button"
            onClick={() => handleAddMultipleDupRows(5)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            title="Adicionar mais 5 linhas vazias"
          >
            +5
          </button>
          {dupRows.length > 10 && (
            <button
              type="button"
              onClick={handleClearEmptyDupRows}
              className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              title="Recolher linhas em branco excedentes"
            >
              Limpar vazias
            </button>
          )}
        </div>

        {filledDupCount > 0 && (
          <span className="text-xs text-cyan-300 font-mono font-bold">
            {filledDupCount} padrão(ões) ativo(s)
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header and Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-700/50 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>Padrões de Controle QA/QC</span>
              <span className="text-[11px] text-purple-300 font-normal normal-case">
                (Grade de Inserção Rápida)
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Digite ou cole os códigos. Linhas em branco são descartadas automaticamente ao salvar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 font-mono text-xs text-slate-300 flex items-center gap-1.5">
            <span>Total preenchidos:</span>
            <strong className={totalFilled > 0 ? 'text-emerald-400 font-bold text-sm' : 'text-slate-400 text-sm'}>
              {totalFilled}
            </strong>
          </span>
          <span className="text-xs text-purple-300 bg-purple-950/70 px-2.5 py-1.5 rounded-xl border border-purple-800/60 flex items-center gap-1.5 font-semibold">
            <Boxes className="w-4 h-4 text-purple-400" />
            Baixa OREAS Automática
          </span>
        </div>
      </div>

      {/* View Mode Switcher / Tab Bar for Desktop, Tablet and Mobile */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-950/90 rounded-xl border border-slate-800 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Todos (3 Colunas)</span>
            {totalFilled > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-200 font-mono">
                {totalFilled}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('oreas')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'oreas'
                ? 'bg-purple-950/90 text-purple-200 shadow-xs border border-purple-600/70 font-black'
                : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0 shadow-xs shadow-purple-500/50" />
            <span>OREAS (Padrões)</span>
            {filledOreasCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-800 text-purple-100 font-mono">
                {filledOreasCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blk')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'blk'
                ? 'bg-amber-950/90 text-amber-200 shadow-xs border border-amber-600/70 font-black'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-xs shadow-amber-500/50" />
            <span>BLK (Brancos)</span>
            {filledBlkCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-800 text-amber-100 font-mono">
                {filledBlkCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dup')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'dup'
                ? 'bg-cyan-950/90 text-cyan-200 shadow-xs border border-cyan-600/70 font-black'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 shadow-xs shadow-cyan-500/50" />
            <span>DUP (Duplicatas)</span>
            {filledDupCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-800 text-cyan-100 font-mono">
                {filledDupCount}
              </span>
            )}
          </button>
        </div>

        <span className="hidden sm:inline-block text-[11px] text-slate-400 italic">
          {activeTab === 'all'
            ? 'Em telas compactas ou tablet, role para os lados ou use as abas acima'
            : 'Foco ampliado: exibindo a coluna selecionada em largura máxima'}
        </span>
      </div>

      {/* Grid Content: Either all 3 columns or single focused column */}
      {activeTab === 'all' ? (
        <div className="overflow-x-auto pb-3 -mx-1 px-1">
          <div className="flex flex-col xl:flex-row gap-4 items-stretch min-w-[340px] xl:min-w-[1060px]">
            {renderOreasColumn(false)}
            {renderBlkColumn(false)}
            {renderDupColumn(false)}
          </div>
        </div>
      ) : activeTab === 'oreas' ? (
        renderOreasColumn(true)
      ) : activeTab === 'blk' ? (
        renderBlkColumn(true)
      ) : (
        renderDupColumn(true)
      )}

      {/* Stock summary warning if any OREAS lot is overdrawn */}
      {Object.entries(currentOreasUsageMap).map(([lotKey, count]) => {
        const stock = getAvailableStockForCode(lotKey, oreasStockEntries, ars, currentArId);
        if (count > stock.availableStock) {
          return (
            <div
              key={lotKey}
              className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs font-medium flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <strong>Estoque OREAS Insuficiente:</strong> O padrão <strong>{lotKey}</strong> foi inserido {count} vez(es), mas há apenas <strong>{stock.availableStock} un.</strong> disponíveis em estoque.
              </span>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

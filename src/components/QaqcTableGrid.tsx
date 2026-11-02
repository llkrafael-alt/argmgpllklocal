import React, { useState } from 'react';
import { QaQcSample } from '../types';
import { Eye, EyeOff, ShieldCheck, Edit2, Check, X } from 'lucide-react';

interface QaqcTableGridProps {
  samples: QaQcSample[];
  compact?: boolean;
  defaultExpanded?: boolean;
  arId?: string;
  onUpdateDuplicateMeter?: (arId: string, sampleIdOrCode: string, meter: string) => Promise<void> | void;
}

export const QaqcTableGrid: React.FC<QaqcTableGridProps> = ({
  samples,
  defaultExpanded = false,
  arId,
  onUpdateDuplicateMeter,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(defaultExpanded);
  const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
  const [editingMeterValue, setEditingMeterValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  if (!samples || samples.length === 0) {
    return <span className="text-slate-600 text-xs italic">-</span>;
  }

  // 1. Group samples by type
  const typesOrder = ['OREAS', 'BLK', 'DUP', 'Gesso', 'Outro'];
  const presentTypesMap: { [key: string]: QaQcSample[] } = {};

  samples.forEach((s) => {
    const typeKey = s.type || 'Outro';
    if (!presentTypesMap[typeKey]) {
      presentTypesMap[typeKey] = [];
    }
    presentTypesMap[typeKey].push(s);
  });

  // Sort present types in standard order
  const activeTypes = Object.keys(presentTypesMap).sort((a, b) => {
    const idxA = typesOrder.indexOf(a);
    const idxB = typesOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Find max row count across all active types
  const maxRows = Math.max(...activeTypes.map((t) => presentTypesMap[t].length));

  const handleStartEdit = (sample: QaQcSample, currentMeter: string) => {
    setEditingSampleId(sample.id || sample.code);
    setEditingMeterValue(currentMeter);
  };

  const handleCancelEdit = () => {
    setEditingSampleId(null);
    setEditingMeterValue('');
  };

  const handleSaveMeter = async (sample: QaQcSample) => {
    if (!arId || !onUpdateDuplicateMeter) {
      setEditingSampleId(null);
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateDuplicateMeter(arId, sample.id || sample.code, editingMeterValue.trim());
      setEditingSampleId(null);
      setEditingMeterValue('');
    } catch (e) {
      console.error('Erro ao atualizar metro da duplicata:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center my-1 gap-1.5">
      {/* Toggle Button Exibir / Ocultar */}
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
        title={isVisible ? 'Ocultar matriz QA/QC' : 'Exibir matriz QA/QC'}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <span>QA/QC ({samples.length})</span>
        {isVisible ? (
          <span className="flex items-center gap-1 text-[10px] text-purple-300/80 font-normal uppercase ml-1">
            <EyeOff className="w-3 h-3 text-purple-400" /> Ocultar
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-cyan-300 font-bold uppercase ml-1">
            <Eye className="w-3 h-3 text-cyan-400" /> Exibir
          </span>
        )}
      </button>

      {/* Grid Table */}
      {isVisible && (
        <div className="overflow-x-auto inline-block max-w-full rounded-xl border border-slate-700 shadow-md">
          <table className="border-collapse bg-slate-900 text-xs sm:text-sm min-w-[280px]">
            <thead>
              <tr className="bg-sky-950/90 border-b border-slate-700 text-sky-200 font-black uppercase text-xs">
                {activeTypes.map((type) => {
                  const isDup = type.toUpperCase().includes('DUP');
                  const hasDetails =
                    isDup ||
                    presentTypesMap[type].some(
                      (s) =>
                        (s.oreasProduct && s.oreasProduct.trim() !== '') ||
                        (s.duplicateMeter && s.duplicateMeter.trim() !== '') ||
                        (s.notes && s.notes.trim() !== '')
                    );
                  return (
                    <th
                      key={type}
                      colSpan={hasDetails ? 2 : 1}
                      className={`px-3.5 py-2 border-r last:border-r-0 border-slate-700 text-center tracking-wider font-mono font-black ${
                        isDup
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                          : 'bg-sky-900/50 text-sky-300'
                      }`}
                    >
                      {isDup ? 'DUP (DUPLICATAS • METRO)' : type}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {Array.from({ length: maxRows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-800/60 transition-colors">
                  {activeTypes.map((type) => {
                    const sampleList = presentTypesMap[type];
                    const item = sampleList[rowIndex];
                    const isDup = type.toUpperCase().includes('DUP');
                    const hasDetails =
                      isDup ||
                      sampleList.some(
                        (s) =>
                          (s.oreasProduct && s.oreasProduct.trim() !== '') ||
                          (s.duplicateMeter && s.duplicateMeter.trim() !== '') ||
                          (s.notes && s.notes.trim() !== '')
                      );

                    if (!item) {
                      // Blank cell placeholder for alignment
                      return hasDetails ? (
                        <React.Fragment key={`${type}_empty_${rowIndex}`}>
                          <td className="px-3 py-2 border-r border-slate-800 font-mono text-xs text-transparent bg-slate-950/20">
                            -
                          </td>
                          <td className="px-3 py-2 border-r last:border-r-0 border-slate-700 font-mono text-xs text-transparent bg-slate-950/20">
                            -
                          </td>
                        </React.Fragment>
                      ) : (
                        <td
                          key={`${type}_empty_${rowIndex}`}
                          className="px-3 py-2 border-r last:border-r-0 border-slate-700 font-mono text-xs text-transparent bg-slate-950/20"
                        >
                          -
                        </td>
                      );
                    }

                    if (isDup) {
                      const dupMeter =
                        item.duplicateMeter ||
                        (item.notes && !item.notes.startsWith('Lote') && !item.notes.includes('250c')
                          ? item.notes.replace(/^metro:\s*/i, '')
                          : '');
                      const isEditingThis = editingSampleId === (item.id || item.code);

                      return (
                        <React.Fragment key={item.id || item.code}>
                          <td className="px-3.5 py-2 border-r border-slate-800 font-mono font-bold text-cyan-200 whitespace-nowrap bg-slate-900 min-w-[100px]">
                            {item.code || '-'}
                          </td>
                          <td className="px-3 py-1.5 border-r last:border-r-0 border-slate-700 font-mono text-cyan-200 font-bold text-xs whitespace-nowrap bg-slate-900/90 min-w-[120px]">
                            {isEditingThis ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  disabled={isSaving}
                                  placeholder="Ex: 45.0m"
                                  value={editingMeterValue}
                                  onChange={(e) => setEditingMeterValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveMeter(item);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      handleCancelEdit();
                                    }
                                  }}
                                  className="w-20 px-2 py-0.5 rounded bg-slate-950 text-cyan-200 border border-cyan-400 font-mono text-xs outline-none"
                                />
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleSaveMeter(item)}
                                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                                  title="Salvar metro (Enter)"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={handleCancelEdit}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                  title="Cancelar (Esc)"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : dupMeter ? (
                              <button
                                type="button"
                                onClick={() => onUpdateDuplicateMeter && handleStartEdit(item, dupMeter)}
                                className={`group px-2 py-0.5 rounded-md font-mono font-black text-xs inline-flex items-center gap-1 shadow-2xs bg-cyan-950/90 border border-cyan-700/70 text-cyan-200 transition-all ${
                                  onUpdateDuplicateMeter
                                    ? 'hover:border-cyan-400 hover:bg-cyan-900 cursor-pointer'
                                    : ''
                                }`}
                                title={
                                  onUpdateDuplicateMeter
                                    ? `Metro de origem: ${dupMeter} • Clique para editar`
                                    : `Metro de origem: ${dupMeter}`
                                }
                              >
                                <span className="text-[10px] text-cyan-400 uppercase">M:</span>
                                <span>{dupMeter.toLowerCase().includes('m') ? dupMeter : `${dupMeter}m`}</span>
                                {onUpdateDuplicateMeter && (
                                  <Edit2 className="w-2.5 h-2.5 text-cyan-400/50 group-hover:text-cyan-300 ml-0.5" />
                                )}
                              </button>
                            ) : onUpdateDuplicateMeter ? (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item, '')}
                                className="px-2 py-0.5 rounded-md font-mono text-[11px] text-cyan-400/80 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/60 border border-dashed border-cyan-800/80 cursor-pointer inline-flex items-center gap-1 transition-all"
                                title="Clique para inserir o metro desta duplicata"
                              >
                                <span>+ metro</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs italic">-</span>
                            )}
                          </td>
                        </React.Fragment>
                      );
                    }

                    const detailText = item.oreasProduct
                      ? item.notes
                        ? `${item.oreasProduct} (${item.notes})`
                        : item.oreasProduct
                      : item.notes || '';

                    if (hasDetails) {
                      return (
                        <React.Fragment key={item.id || item.code}>
                          <td className="px-3.5 py-2 border-r border-slate-800 font-mono font-bold text-white whitespace-nowrap bg-slate-900 min-w-[100px]">
                            {item.code || '-'}
                          </td>
                          <td className="px-3.5 py-2 border-r last:border-r-0 border-slate-700 font-mono text-purple-200 font-bold text-xs whitespace-nowrap bg-slate-900/90 min-w-[100px]">
                            {detailText ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-950/90 border border-purple-700/60 text-purple-200 font-mono font-black text-xs inline-block shadow-2xs">
                                {detailText}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </React.Fragment>
                      );
                    }

                    return (
                      <td
                        key={item.id || item.code}
                        className="px-3.5 py-2 border-r last:border-r-0 border-slate-700 font-mono font-bold text-white text-center whitespace-nowrap bg-slate-900 min-w-[90px]"
                      >
                        {item.code || '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

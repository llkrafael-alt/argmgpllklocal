import React, { useState } from 'react';
import { QaQcSample } from '../types';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface QaqcTableGridProps {
  samples: QaQcSample[];
  compact?: boolean;
  defaultExpanded?: boolean;
}

export const QaqcTableGrid: React.FC<QaqcTableGridProps> = ({
  samples,
  defaultExpanded = false,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(defaultExpanded);

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

  return (
    <div className="flex flex-col items-center my-1 gap-1.5">
      {/* Toggle Button Exibir / Ocultar */}
      <button
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
                  const hasDetails = presentTypesMap[type].some(
                    (s) => (s.oreasProduct && s.oreasProduct.trim() !== '') || (s.notes && s.notes.trim() !== '')
                  );
                  return (
                    <th
                      key={type}
                      colSpan={hasDetails ? 2 : 1}
                      className="px-3.5 py-2 border-r last:border-r-0 border-slate-700 text-center tracking-wider bg-sky-900/50 text-sky-300 font-mono font-black"
                    >
                      {type}
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
                    const hasDetails = sampleList.some(
                      (s) => (s.oreasProduct && s.oreasProduct.trim() !== '') || (s.notes && s.notes.trim() !== '')
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

                    const detailText = item.oreasProduct
                      ? item.notes
                        ? `${item.oreasProduct} (${item.notes})`
                        : item.oreasProduct
                      : item.notes || '';

                    if (hasDetails) {
                      return (
                        <React.Fragment key={item.id}>
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
                        key={item.id}
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

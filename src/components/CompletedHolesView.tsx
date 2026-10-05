import React from 'react';
import { DrillHole, ProductionLog } from '../types';
import { calculateHoleSummary } from '../utils/calculator';
import {
  CheckCircle2,
  Box,
  MapPin,
  Eye,
  Archive,
  Calendar,
  Layers,
  Award,
  Trash2,
} from 'lucide-react';

interface CompletedHolesViewProps {
  holes: DrillHole[];
  logs: ProductionLog[];
  onOpenHoleDetail: (hole: DrillHole) => void;
  onDeleteHoleRequest: (hole: DrillHole) => void;
  onReopenHole?: (holeId: string) => void;
}

export const CompletedHolesView: React.FC<CompletedHolesViewProps> = ({
  holes,
  logs,
  onOpenHoleDetail,
  onDeleteHoleRequest,
  onReopenHole,
}) => {
  // Find all holes that are marked completed OR have 100% in all applicable stages
  const completedHoles = holes.filter((hole) => {
    if (hole.completedAt) return true;
    const summary = calculateHoleSummary(hole, logs);
    return summary.isFullyCompleted;
  });

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-emerald-950 text-white shadow-md border border-emerald-900/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Award className="w-4 h-4" /> Arquivo de Produção Concluída
          </div>
          <h2 className="text-2xl font-black font-mono mt-1">
            Furos 100% Processados ({completedHoles.length})
          </h2>
          <p className="text-xs text-emerald-200 mt-1">
            Furos de sondagem que passaram por todas as etapas e se encontram catalogados no galpão.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-emerald-900/80 border border-emerald-700 text-xs font-mono font-bold text-emerald-200 flex items-center gap-2">
          <Archive className="w-4 h-4 text-emerald-400" />
          <span>
            Total Armazenado: {completedHoles.filter((h) => h.holeType === 'Diamantado' || !h.holeType).reduce((acc, h) => acc + h.totalCases, 0)} caixas ({completedHoles.filter((h) => h.holeType === 'Diamantado' || !h.holeType).length} furos diamantados)
          </span>
        </div>
      </div>

      {completedHoles.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-200 text-base">
            Nenhum furo concluído no momento
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Assim que um furo atingir 100% em todas as etapas aplicáveis (incluindo KORE se aplicável), ele aparecerá automaticamente neste arquivo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {completedHoles.map((hole) => {
            const summary = calculateHoleSummary(hole, logs);
            const isRC = hole.holeType === 'RC';
            const isSolo = hole.holeType === 'Solo';
            const isTrincheira = hole.holeType === 'Trincheira';

            return (
              <div
                key={hole.id}
                className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/60 shadow-sm flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black font-mono text-white">
                          {hole.code}
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isRC
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : isSolo
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isTrincheira
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isRC ? '🔄 RC' : isSolo ? '🌱 Solo' : isTrincheira ? '⛏️ Trincheira' : '💎 Diamantado'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Alvo: <strong className="text-white">{hole.target}</strong>
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-blue-400" /> Metragem:
                      </span>
                      <strong className="font-mono text-white">
                        {hole.startMeter}m - {hole.endMeter}m ({hole.totalMeters}m)
                      </strong>
                    </div>

                    {!isRC && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Box className="w-3.5 h-3.5 text-amber-400" /> Caixas (cases):
                        </span>
                        <strong className="font-mono text-white">
                          {hole.totalCases} caixas
                        </strong>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400" /> Localização:
                      </span>
                      <strong className="text-white">
                        {hole.storageLocation || 'Galpão Principal'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Concluído
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenHoleDetail(hole)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 border border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Histórico</span>
                    </button>

                    <button
                      onClick={() => onDeleteHoleRequest(hole)}
                      className="p-1.5 rounded-lg border border-slate-800 hover:border-red-900/60 bg-slate-800/40 hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition-all"
                      title="Apagar furo do sistema"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

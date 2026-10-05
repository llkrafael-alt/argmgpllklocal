import React from 'react';
import { DrillHole, ProductionLog } from '../types';
import { AlertTriangle, Trash2, X, Box, Layers, Tag } from 'lucide-react';

interface DeleteHoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  hole: DrillHole | null;
  logs: ProductionLog[];
  onConfirmDelete: (holeId: string) => void;
}

export const DeleteHoleModal: React.FC<DeleteHoleModalProps> = ({
  isOpen,
  onClose,
  hole,
  logs,
  onConfirmDelete,
}) => {
  if (!isOpen || !hole) return null;

  const holeLogs = logs.filter((l) => l.drillHoleId === hole.id);

  const handleDelete = () => {
    onConfirmDelete(hole.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-red-900/60 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-red-950/40 border-b border-red-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-400">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Confirmar Exclusão de Furo
              </h3>
              <p className="text-[11px] text-red-300">
                Ação irreversível no sistema
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                {hole.code}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded ${
                hole.holeType === 'RC'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {hole.holeType === 'RC' ? '🔄 RC' : '💎 Diamantado'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Alvo: <strong>{hole.target}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Metragem: <strong>{hole.totalMeters}m</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/60 pt-2 mt-1">
              <span>Apontamentos vinculados:</span>
              <strong className="text-red-400 font-mono">{holeLogs.length} apontamentos</strong>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Tem certeza de que deseja apagar o furo <strong className="text-white font-mono">{hole.code}</strong>? Todos os dados, histórico de etapas e <strong className="text-red-400">{holeLogs.length} lançamentos</strong> vinculados serão excluídos do galpão de forma permanente.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-900/30 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sim, Apagar Furo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

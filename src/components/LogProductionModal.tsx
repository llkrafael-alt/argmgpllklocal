import React, { useState, useEffect } from 'react';
import { DrillHole, ProductionLog, StageId, User } from '../types';
import { getApplicableStages, getStageById } from '../constants/stages';
import { checkOverlap, calculateStageProgress } from '../utils/calculator';
import { AlertTriangle, CheckCircle2, X, PlusCircle, UserCheck } from 'lucide-react';

interface LogProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Omit<ProductionLog, 'id' | 'createdAt'>) => void;
  holes: DrillHole[];
  logs: ProductionLog[];
  activeUser: User;
  initialHoleId?: string;
  initialStageId?: StageId;
}

export const LogProductionModal: React.FC<LogProductionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  holes,
  logs,
  activeUser,
  initialHoleId,
  initialStageId,
}) => {
  const activeHoles = holes.filter((h) => !h.completedAt && h.holeType !== 'Solo' && h.holeType !== 'Trincheira');
  const selectedHoleObj = activeHoles.find((h) => h.id === (initialHoleId || activeHoles[0]?.id)) || activeHoles[0];

  const [holeId, setHoleId] = useState<string>(selectedHoleObj?.id || '');
  const [stageId, setStageId] = useState<StageId>(initialStageId || 1);
  const [startMeter, setStartMeter] = useState<string | number>(0);
  const [endMeter, setEndMeter] = useState<string | number>(50);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [confirmOverlap, setConfirmOverlap] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const currentHole = holes.find((h) => h.id === holeId) || selectedHoleObj;
  const applicableStages = currentHole ? getApplicableStages(currentHole.isLegacyKorePending, currentHole.holeType) : [];

  // Reset form when opening or changing hole
  useEffect(() => {
    if (isOpen) {
      const targetHoleId = initialHoleId || activeHoles[0]?.id || '';
      setHoleId(targetHoleId);
      const hole = holes.find((h) => h.id === targetHoleId);
      if (hole) {
        const stages = getApplicableStages(hole.isLegacyKorePending, hole.holeType);
        const stgId = initialStageId || stages[0]?.id || 1;
        setStageId(stgId);

        // Pre-fill smart next start meter
        const stageProgress = calculateStageProgress(hole, stgId, logs);
        if (stageProgress.mergedIntervals.length > 0) {
          const lastInterval = stageProgress.mergedIntervals[stageProgress.mergedIntervals.length - 1];
          const nextStart = lastInterval.end < hole.endMeter ? lastInterval.end : hole.startMeter;
          setStartMeter(nextStart);
          setEndMeter(Math.min(hole.endMeter, nextStart + 50));
        } else {
          setStartMeter(hole.startMeter);
          setEndMeter(Math.min(hole.endMeter, hole.startMeter + 50));
        }
      }
      setNotes('');
      setConfirmOverlap(false);
      setErrorMsg('');
    }
  }, [isOpen, initialHoleId, initialStageId]);

  // Handle hole change
  const handleHoleChange = (newHoleId: string) => {
    setHoleId(newHoleId);
    const hole = holes.find((h) => h.id === newHoleId);
    if (hole) {
      const stages = getApplicableStages(hole.isLegacyKorePending, hole.holeType);
      const defaultStage = stages[0]?.id || 1;
      setStageId(defaultStage);
      setStartMeter(hole.startMeter);
      setEndMeter(Math.min(hole.endMeter, hole.startMeter + 50));
    }
    setConfirmOverlap(false);
    setErrorMsg('');
  };

  // Handle stage change
  const handleStageChange = (newStageId: StageId) => {
    setStageId(newStageId);
    if (currentHole) {
      const stageProgress = calculateStageProgress(currentHole, newStageId, logs);
      if (stageProgress.mergedIntervals.length > 0) {
        const lastInterval = stageProgress.mergedIntervals[stageProgress.mergedIntervals.length - 1];
        const nextStart = lastInterval.end < currentHole.endMeter ? lastInterval.end : currentHole.startMeter;
        setStartMeter(nextStart);
        setEndMeter(Math.min(currentHole.endMeter, nextStart + 50));
      } else {
        setStartMeter(currentHole.startMeter);
        setEndMeter(Math.min(currentHole.endMeter, currentHole.startMeter + 50));
      }
    }
    setConfirmOverlap(false);
    setErrorMsg('');
  };

  if (!isOpen) return null;

  if (!currentHole) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full text-center">
          <p className="text-slate-300 mb-4">
            Nenhum furo de Diamantado ou RC ativo encontrado para realizar apontamentos. Furos do tipo Solo e Trincheira não possuem lançamento de etapas.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Parse numeric values
  const numStart = typeof startMeter === 'string' ? parseFloat(startMeter.replace(',', '.')) : startMeter;
  const numEnd = typeof endMeter === 'string' ? parseFloat(endMeter.replace(',', '.')) : endMeter;

  // Check overlap for current selection
  const overlapInfo = checkOverlap(
    currentHole.id,
    stageId,
    isNaN(numStart) ? 0 : numStart,
    isNaN(numEnd) ? 0 : numEnd,
    logs
  );

  // Quick meters helpers
  const handleAddMeters = (metersToAdd: number) => {
    const validStart = isNaN(numStart) ? currentHole.startMeter : numStart;
    const newEnd = Math.min(currentHole.endMeter, validStart + metersToAdd);
    setEndMeter(Number(newEnd.toFixed(2)));
  };

  const handleFillAll = () => {
    setStartMeter(currentHole.startMeter);
    setEndMeter(currentHole.endMeter);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isNaN(numStart) || isNaN(numEnd)) {
      setErrorMsg('Informe valores numéricos válidos para a metragem.');
      return;
    }

    if (numStart < currentHole.startMeter || numEnd > currentHole.endMeter) {
      setErrorMsg(`A metragem deve estar dentro do limite do furo (${currentHole.startMeter}m até ${currentHole.endMeter}m).`);
      return;
    }

    if (numEnd <= numStart) {
      setErrorMsg('A metragem final deve ser estritamente maior que a metragem inicial.');
      return;
    }

    if (overlapInfo.hasOverlap && !confirmOverlap) {
      setErrorMsg('Atenção: A faixa informada possui sobreposição com lançamentos anteriores. Verifique e confirme o termo abaixo para prosseguir.');
      return;
    }

    onSave({
      drillHoleId: currentHole.id,
      stageId,
      startMeter: Number(numStart.toFixed(2)),
      endMeter: Number(numEnd.toFixed(2)),
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.role,
      date,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const selectedStageInfo = getStageById(stageId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Apontamento Diário de Produção
              </h3>
              <p className="text-[11px] text-slate-400">
                Registro de trecho por etapa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User indicator */}
        <div className="px-6 py-2.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Lançando como: <strong className="text-white">{activeUser.name}</strong> ({activeUser.role})
            </span>
          </div>
          <span className="font-mono text-amber-400 font-bold">{date}</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Furo Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Furo de Sondagem
            </label>
            <select
              value={holeId}
              onChange={(e) => handleHoleChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono font-bold focus:border-amber-500 outline-none"
            >
              {activeHoles.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} [{h.holeType === 'RC' ? 'RC' : 'Diamantado'}] ({h.target}) — {h.startMeter}m a {h.endMeter}m
                </option>
              ))}
            </select>
          </div>

          {/* Etapa Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Etapa de Trabalho (13 Etapas)
            </label>
            <select
              value={stageId}
              onChange={(e) => handleStageChange(Number(e.target.value) as StageId)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-semibold focus:border-amber-500 outline-none"
            >
              {applicableStages.map((stg) => (
                <option key={stg.id} value={stg.id}>
                  {stg.id}. {stg.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              {selectedStageInfo.description}
            </p>
          </div>

          {/* Metragem Inputs */}
          <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-slate-800/50 border border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Intervalo de Metragem (em metros)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Limite: {currentHole.startMeter}m - {currentHole.endMeter}m
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  De (metro inicial):
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={startMeter}
                  onChange={(e) => setStartMeter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 font-mono text-white font-bold focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Até (metro final):
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={endMeter}
                  onChange={(e) => setEndMeter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 font-mono text-white font-bold focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1 pt-2 border-t border-slate-700/80">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Atalhos rápidos:</span>
              <button
                type="button"
                onClick={() => handleAddMeters(10)}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 font-mono font-medium hover:bg-slate-700 text-slate-200"
              >
                +10m
              </button>
              <button
                type="button"
                onClick={() => handleAddMeters(25)}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 font-mono font-medium hover:bg-slate-700 text-slate-200"
              >
                +25m
              </button>
              <button
                type="button"
                onClick={() => handleAddMeters(50)}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 font-mono font-medium hover:bg-slate-700 text-slate-200"
              >
                +50m
              </button>
              <button
                type="button"
                onClick={handleFillAll}
                className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold hover:bg-amber-500/30"
              >
                Furo completo ({currentHole.totalMeters}m)
              </button>
            </div>
          </div>

          {/* Overlap Alert Warning */}
          {overlapInfo.hasOverlap && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800 flex flex-col gap-2.5">
              <div className="flex items-start gap-2 text-amber-200 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Aviso de Sobreposição de Metragem</p>
                  <p className="font-normal text-[11px] text-amber-300">
                    O trecho de {startMeter}m a {endMeter}m possui lançamentos anteriores nesta etapa.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-amber-900/60 text-xs flex flex-col gap-1">
                {overlapInfo.overlappingLogs?.map((log, idx) => (
                  <div key={idx} className="text-[11px] text-slate-300">
                    • <strong>{log.userName}</strong> em {log.date}: {log.range}
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-amber-200 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={confirmOverlap}
                  onChange={(e) => setConfirmOverlap(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <span>Confirmar lançamento (reprocessamento / revisão)</span>
              </label>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Data do Apontamento
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Observações (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: caixas 05 a 12, recuperação 98%"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Apontamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React from 'react';
import { StageProgress } from '../types';
import { STAGES } from '../constants/stages';

interface StageProgressBarProps {
  progress: StageProgress;
  compact?: boolean;
  onClick?: () => void;
}

export const StageProgressBar: React.FC<StageProgressBarProps> = ({
  progress,
  compact = false,
  onClick,
}) => {
  const stage = STAGES.find((s) => s.id === progress.stageId);
  if (!stage) return null;

  const { percentage, isComplete, coveredMeters, totalMeters, logsCount } = progress;

  let barBg = 'bg-slate-300 dark:bg-slate-700';
  if (isComplete) {
    barBg = 'bg-emerald-500';
  } else if (percentage > 0) {
    barBg = 'bg-amber-500';
  }

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`group relative flex flex-col gap-0.5 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 ${
          onClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors' : ''
        }`}
        title={`Etapa ${stage.id}: ${stage.name} - ${coveredMeters}m/${totalMeters}m (${percentage}%)`}
      >
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-300">
          <span className="truncate max-w-[110px]" title={stage.shortName}>
            {stage.order || stage.id}. {stage.shortName}
          </span>
          <span className={`font-mono ${isComplete ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : percentage > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
            {percentage}%
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${barBg}`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${
        onClick ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-sm hover:shadow' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
              {stage.order || stage.id}
            </span>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              {stage.name}
            </h4>
            {stage.isSpecialKore && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                KORE ESPECIAL
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {stage.description}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`text-sm font-bold font-mono px-2 py-0.5 rounded-md ${
              isComplete
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                : percentage > 0
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {percentage}%
          </span>
        </div>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-300 ${barBg}`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Metragem coberta: <strong className="text-slate-800 dark:text-slate-200">{coveredMeters}m</strong> de {totalMeters}m
        </span>
        <span>
          {logsCount} {logsCount === 1 ? 'apontamento' : 'apontamentos'}
        </span>
      </div>
    </div>
  );
};

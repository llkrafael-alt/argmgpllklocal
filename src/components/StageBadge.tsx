import React from 'react';
import { StageProgress } from '../types';

interface StageBadgeProps {
  progress: StageProgress;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StageBadge: React.FC<StageBadgeProps> = ({
  progress,
  showText = true,
  size = 'md',
}) => {
  const { percentage, isComplete, coveredMeters, totalMeters } = progress;

  let bgColor = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  let dotColor = 'bg-slate-400';

  if (isComplete) {
    bgColor = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    dotColor = 'bg-emerald-500';
  } else if (percentage > 0) {
    bgColor = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    dotColor = 'bg-amber-500';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 rounded-md gap-1',
    md: 'text-xs px-2.5 py-1 rounded-md gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 rounded-lg gap-2 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center border transition-colors ${bgColor} ${sizeClasses[size]}`}
      title={`${coveredMeters}m de ${totalMeters}m (${percentage}%)`}
    >
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      {showText && (
        <span>
          {percentage}% {isComplete && '✓'}
        </span>
      )}
    </span>
  );
};

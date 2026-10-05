import React from 'react';
import { ProductionLog, StageId } from '../types';

interface VisualMeterStripProps {
  drillHoleId: string;
  stageId: StageId;
  totalMeters: number;
  startMeter?: number;
  logs: ProductionLog[];
}

export const VisualMeterStrip: React.FC<VisualMeterStripProps> = ({
  drillHoleId,
  stageId,
  totalMeters,
  startMeter = 0,
  logs,
}) => {
  const stageLogs = logs.filter(
    (l) => l.drillHoleId === drillHoleId && l.stageId === stageId
  );

  const endMeter = startMeter + totalMeters;

  // Colors for user segments
  const colors = [
    'bg-blue-500 hover:bg-blue-600',
    'bg-emerald-500 hover:bg-emerald-600',
    'bg-purple-500 hover:bg-purple-600',
    'bg-amber-500 hover:bg-amber-600',
    'bg-indigo-500 hover:bg-indigo-600',
    'bg-teal-500 hover:bg-teal-600',
    'bg-rose-500 hover:bg-rose-600',
  ];

  // Map user names to color indexes
  const userColorMap: Record<string, string> = {};
  let colorIdx = 0;
  stageLogs.forEach((log) => {
    const key = log.userId || log.userName || 'default';
    if (!userColorMap[key]) {
      userColorMap[key] = colors[colorIdx % colors.length];
      colorIdx++;
    }
  });

  return (
    <div className="w-full flex flex-col gap-1.5 py-2">
      <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
        <span>{startMeter}m</span>
        <span>{Math.round((startMeter + endMeter) / 2)}m</span>
        <span>{endMeter}m</span>
      </div>

      {/* Track bar */}
      <div className="relative w-full h-7 bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 flex">
        {stageLogs.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400 italic">
            Nenhum trecho trabalhado nesta etapa
          </div>
        ) : (
          stageLogs.map((log) => {
            const lStart = Math.max(startMeter, Math.min(log.startMeter, log.endMeter));
            const lEnd = Math.min(endMeter, Math.max(log.startMeter, log.endMeter));
            const len = Math.max(0, lEnd - lStart);
            if (len <= 0) return null;

            const leftPercent = ((lStart - startMeter) / totalMeters) * 100;
            const widthPercent = (len / totalMeters) * 100;
            const colorClass = userColorMap[log.userId || log.userName || 'default'] || 'bg-blue-500';

            return (
              <div
                key={log.id}
                className={`absolute h-full ${colorClass} transition-all group flex items-center justify-center border-r border-white/20`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                }}
                title={`${log.userName} (${log.userRole || ''}): ${lStart}m - ${lEnd}m em ${log.date}. ${log.notes || ''}`}
              >
                {widthPercent > 12 && (
                  <span className="text-[10px] font-bold text-white truncate px-1 drop-shadow-sm">
                    {log.userName?.split(' ')[0]} ({lStart}-{lEnd}m)
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend if there are logs */}
      {stageLogs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Responsáveis:</span>
          {Array.from(
            new Set<string>(stageLogs.map((l) => JSON.stringify({ id: l.userId, name: l.userName })))
          ).map((raw: string) => {
            const u = JSON.parse(raw) as { id: string; name: string };
            const colorClass = userColorMap[u.id || u.name || 'default'];
            return (
              <div key={u.id || u.name} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                <span className="font-medium">{u.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

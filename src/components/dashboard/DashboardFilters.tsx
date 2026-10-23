import React from 'react';
import { Calendar, Filter, X, RefreshCw } from 'lucide-react';

interface DashboardFiltersProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClearFilters: () => void;
  onSelectPreset: (preset: '7d' | '30d' | 'thisMonth' | '90d' | 'all') => void;
  activePreset: string;
  totalFilteredARs: number;
  totalAllARs: number;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
  onSelectPreset,
  activePreset,
  totalFilteredARs,
  totalAllARs,
}) => {
  const isFiltered = Boolean(startDate || endDate);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Presets Button Group */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            Período:
          </span>

          <button
            type="button"
            onClick={() => onSelectPreset('7d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === '7d'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Últimos 7 dias
          </button>

          <button
            type="button"
            onClick={() => onSelectPreset('30d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === '30d'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Últimos 30 dias
          </button>

          <button
            type="button"
            onClick={() => onSelectPreset('thisMonth')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === 'thisMonth'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Este Mês
          </button>

          <button
            type="button"
            onClick={() => onSelectPreset('90d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === '90d'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Últimos 90 dias
          </button>

          <button
            type="button"
            onClick={() => onSelectPreset('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Todo o Período
          </button>
        </div>

        {/* Counter Badge */}
        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
          <span>Remessas filtradas:</span>
          <span className="font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {totalFilteredARs} de {totalAllARs}
          </span>
        </div>
      </div>

      {/* Date Pickers Row */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-slate-400 uppercase">De:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-transparent text-xs font-mono font-bold text-white outline-none cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-slate-400 uppercase">Até:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-transparent text-xs font-mono font-bold text-white outline-none cursor-pointer"
          />
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all flex items-center gap-1 border border-slate-700"
            title="Limpar filtro e ver todo o período"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>
    </div>
  );
};

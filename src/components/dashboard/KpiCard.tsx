import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'amber' | 'cyan' | 'emerald' | 'purple';
  trendText?: string;
}

const variantStyles = {
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    valueColor: 'text-amber-400',
    glow: 'hover:border-amber-500/40 shadow-amber-500/5',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    valueColor: 'text-cyan-400',
    glow: 'hover:border-cyan-500/40 shadow-cyan-500/5',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    valueColor: 'text-emerald-400',
    glow: 'hover:border-emerald-500/40 shadow-emerald-500/5',
  },
  purple: {
    iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    valueColor: 'text-purple-300',
    glow: 'hover:border-purple-500/40 shadow-purple-500/5',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'amber',
  trendText,
}) => {
  const styles = variantStyles[variant] || variantStyles.amber;

  return (
    <div
      className={`relative p-5 rounded-2xl bg-slate-900/90 border border-slate-800 transition-all duration-200 shadow-md ${styles.glow} flex flex-col justify-between overflow-hidden`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-xl border ${styles.iconBg} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline gap-2 mt-1">
        <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${styles.valueColor}`}>
          {value}
        </span>
      </div>

      {/* Footer Info / Subtitle */}
      {(subtitle || trendText) && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {trendText && (
            <span className="font-mono text-slate-300 font-semibold bg-slate-800 px-2 py-0.5 rounded text-[10px]">
              {trendText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

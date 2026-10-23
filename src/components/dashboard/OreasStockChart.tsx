import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { OreasAnalyticsSummary } from '../../utils/dashboardAggregations';
import { ShieldCheck, Package, AlertCircle, TrendingDown, Clock } from 'lucide-react';

interface OreasStockChartProps {
  analytics: OreasAnalyticsSummary;
}

const CustomOreasTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs flex flex-col gap-1.5 backdrop-blur-md">
        <span className="font-bold text-amber-400 border-b border-slate-800 pb-1 font-mono">
          OREAS {label} {data.lotOrNotes ? `(${data.lotOrNotes})` : ''}
        </span>
        <div className="flex items-center justify-between gap-4 text-cyan-300">
          <span>Saldo em Estoque:</span>
          <span className="font-mono font-bold">{data.currentStock} un</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-purple-300">
          <span>Consumo no Período:</span>
          <span className="font-mono font-bold">{data.consumedInPeriod} un</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-emerald-300">
          <span>Consumo Médio Semanal:</span>
          <span className="font-mono font-bold">{data.avgWeeklyConsumption} un/sem</span>
        </div>
        {data.estimatedDaysRemaining !== null && (
          <div className="flex items-center justify-between gap-4 text-amber-300 border-t border-slate-800/80 pt-1">
            <span>Duração Estimada:</span>
            <span className="font-mono font-bold">~{data.estimatedDaysRemaining} dias</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const OreasStockChart: React.FC<OreasStockChartProps> = ({ analytics }) => {
  if (!analytics || analytics.items.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col items-center justify-center text-center gap-3 min-h-[360px]">
        <ShieldCheck className="w-10 h-10 text-slate-600 stroke-[1.5]" />
        <h4 className="font-bold text-slate-300 text-sm">Nenhum estoque de OREAS cadastrado</h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Registre entradas de padrões OREAS no módulo de remessas para acompanhar saldos e consumo.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Estoque & Consumo de Padrões OREAS
          </h3>
          <p className="text-xs text-slate-400">
            Saldo físico disponível por código de padrão e taxa de consumo nas remessas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-cyan-400" />
            Total Estoque: {analytics.totalStockQuantity} un
          </span>
          {analytics.hasConsumptionData && (
            <span className="px-2.5 py-1 rounded-lg bg-purple-950/70 border border-purple-800 text-purple-300 text-xs font-mono font-bold flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-purple-400" />
              Consumido: {analytics.totalConsumedInPeriod} un
            </span>
          )}
        </div>
      </div>

      {/* Notice if no consumption recorded in QA/QC samples */}
      {!analytics.hasConsumptionData && (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-200">Aviso sobre Consumo:</strong> Não foram encontrados lançamentos de
            consumo de OREAS vinculados às remessas do período selecionado (campo <code className="text-cyan-300 font-mono text-[11px]">qaqcSamples</code>).
            O gráfico abaixo está exibindo o <strong>saldo físico atual</strong> de cada código OREAS em estoque.
          </div>
        </div>
      )}

      {/* Bar Chart Canvas */}
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={analytics.items}
            margin={{ top: 20, right: 20, bottom: 25, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="code"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              dy={8}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              dx={-5}
              label={{
                value: 'Unidades (un)',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 10,
                offset: 10,
              }}
            />
            <Tooltip content={<CustomOreasTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
            />
            <Bar
              dataKey="currentStock"
              name="Saldo em Estoque"
              fill="#06b6d4"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
            {analytics.hasConsumptionData && (
              <Bar
                dataKey="consumedInPeriod"
                name="Consumido no Período"
                fill="#a855f7"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Grid of Stock Items Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/80">
        {analytics.items.map((item) => (
          <div
            key={item.code}
            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1 text-[11px]"
          >
            <div className="flex items-center justify-between text-slate-300 font-bold font-mono">
              <span className="text-amber-400">{item.code}</span>
              <span className="text-cyan-300">{item.currentStock} un</span>
            </div>
            {item.lotOrNotes && (
              <span className="text-[10px] text-slate-500 truncate" title={item.lotOrNotes}>
                {item.lotOrNotes}
              </span>
            )}
            {item.estimatedDaysRemaining !== null && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono pt-1 border-t border-slate-900 mt-0.5">
                <Clock className="w-2.5 h-2.5" /> ~{item.estimatedDaysRemaining}d de estoque
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

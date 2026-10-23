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
import { HolesStatusSummary } from '../../utils/dashboardAggregations';
import { Layers, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface HolesByStatusChartProps {
  summary: HolesStatusSummary;
}

const CustomHoleTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs flex flex-col gap-1.5 backdrop-blur-md">
        <span className="font-bold text-white border-b border-slate-800 pb-1 font-mono">
          Alvo: {label}
        </span>
        <div className="flex items-center justify-between gap-4 text-emerald-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Concluídos:
          </span>
          <span className="font-mono font-bold">{data.concluidos}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-amber-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Em Andamento:
          </span>
          <span className="font-mono font-bold">{data.emAndamento}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-300 border-t border-slate-800/80 pt-1">
          <span>Total no Alvo:</span>
          <span className="font-mono font-bold">{data.total} furos</span>
        </div>
      </div>
    );
  }
  return null;
};

export const HolesByStatusChart: React.FC<HolesByStatusChartProps> = ({ summary }) => {
  if (!summary || summary.byTarget.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col items-center justify-center text-center gap-3 min-h-[360px]">
        <Layers className="w-10 h-10 text-slate-600 stroke-[1.5]" />
        <h4 className="font-bold text-slate-300 text-sm">Nenhum furo cadastrado</h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Cadastre novos furos de sondagem para acompanhar o status por alvo.
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
            <Layers className="w-4 h-4 text-emerald-400" />
            Situação dos Furos por Alvo
          </h3>
          <p className="text-xs text-slate-400">
            Comparativo de furos em andamento vs. concluídos agrupados por alvo geológico
          </p>
        </div>

        {/* Global Status Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {summary.totalConcluidos} Concluídos ({summary.taxaConclusao}%)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {summary.totalEmAndamento} Em Andamento
          </span>
        </div>
      </div>

      {/* Inference Notice Banner if completedAt is empty */}
      {summary.isInferred && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-amber-200">Aviso de Inferência:</strong> O campo{' '}
            <code className="text-white bg-slate-950 px-1 py-0.5 rounded text-[11px] font-mono">
              completedAt
            </code>{' '}
            não está preenchido nos furos do banco de dados. A conclusão foi inferida automaticamente pela cobertura
            das amostras enviadas em ARs em relação à metragem/plano de amostragem ({summary.inferredHolesCount} furo(s) com amostragem completa).
          </div>
        </div>
      )}

      {/* Bar Chart Canvas */}
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={summary.byTarget}
            margin={{ top: 20, right: 20, bottom: 25, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="target"
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
                value: 'Qtd de Furos',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 10,
                offset: 10,
              }}
            />
            <Tooltip content={<CustomHoleTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
            />
            <Bar
              dataKey="concluidos"
              name="Concluídos"
              fill="#10b981"
              stackId="a"
              radius={[0, 0, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="emAndamento"
              name="Em Andamento"
              fill="#f59e0b"
              stackId="a"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { WeeklyShipmentData, formatNumberPtBR, formatKgPtBR } from '../../utils/dashboardAggregations';
import { BarChart3, Info } from 'lucide-react';

interface ShipmentsByWeekChartProps {
  data: WeeklyShipmentData[];
}

// Tooltip customizado com o tema escuro do app
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const rawData: WeeklyShipmentData = payload[0]?.payload;
    return (
      <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs flex flex-col gap-1.5 backdrop-blur-md">
        <span className="font-bold text-white border-b border-slate-800 pb-1 font-mono">
          Semana: {label}
        </span>
        <div className="flex items-center justify-between gap-4 text-cyan-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            Remessas (ARs):
          </span>
          <span className="font-mono font-bold">{rawData.arCount}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-amber-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            Amostras na Semana:
          </span>
          <span className="font-mono font-bold">{formatNumberPtBR(rawData.sampleCount)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-emerald-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            Peso na Semana:
          </span>
          <span className="font-mono font-bold">{formatKgPtBR(rawData.weightKg)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-purple-300 border-t border-slate-800/80 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
            Acumulado do Mês:
          </span>
          <span className="font-mono font-bold">{formatNumberPtBR(rawData.acumuladoMes)} am.</span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Badge Label para renderizar o número de ARs com fundo escuro semi-transparente e borda
const renderArLabelBadge = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || Number(value) === 0) return null;
  const numVal = Number(value);
  const text = `${numVal} ${numVal === 1 ? 'AR' : 'ARs'}`;
  const badgeWidth = text.length * 6.5 + 10;
  const badgeHeight = 17;
  const centerX = Number(x || 0) + Number(width || 0) / 2;
  const topY = Number(y || 0) - 8;

  return (
    <g className="pointer-events-none select-none">
      {/* Retângulo de fundo escuro para destacar sobre a linha roxa e linhas de grade */}
      <rect
        x={centerX - badgeWidth / 2}
        y={topY - badgeHeight + 3}
        width={badgeWidth}
        height={badgeHeight}
        rx={4}
        fill="#0f172a"
        fillOpacity={0.92}
        stroke="#334155"
        strokeWidth={1}
      />
      {/* Texto claro com contorno para máxima legibilidade */}
      <text
        x={centerX}
        y={topY}
        fill="#f1f5f9"
        textAnchor="middle"
        fontSize={10.5}
        fontWeight={700}
        fontFamily="monospace"
        stroke="#0f172a"
        strokeWidth={0.5}
        paintOrder="stroke fill"
      >
        {text}
      </text>
    </g>
  );
};

export const ShipmentsByWeekChart: React.FC<ShipmentsByWeekChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col items-center justify-center text-center gap-3 min-h-[360px]">
        <BarChart3 className="w-10 h-10 text-slate-600 stroke-[1.5]" />
        <h4 className="font-bold text-slate-300 text-sm">Sem remessas no período selecionado</h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Ajuste o filtro de datas acima para visualizar a distribuição semanal de envios.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            Evolução dos Envios por Semana
          </h3>
          <p className="text-xs text-slate-400">
            Barras de amostras com contagem de ARs no topo e linha de acumulado do mês (eixo secundário)
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>{data.length} semana(s) registradas</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 48, right: 25, bottom: 25, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="weekLabel"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              dy={8}
            />
            {/* Eixo Esquerdo: Nº de Amostras */}
            <YAxis
              yAxisId="left"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              dx={-5}
              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.08)]}
              label={{
                value: 'Amostras',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 10,
                offset: 10,
              }}
            />
            {/* Eixo Direito: Acumulado do Mês */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#c084fc"
              fontSize={11}
              tickLine={false}
              dx={5}
              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.08)]}
              label={{
                value: 'Acumulado Mês',
                angle: 90,
                position: 'insideRight',
                fill: '#c084fc',
                fontSize: 10,
                offset: 10,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
            />
            {/* Barra: Nº de Amostras com badge de destaque do Nº de ARs no topo */}
            <Bar
              yAxisId="left"
              dataKey="sampleCount"
              name="Amostras Semana"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              maxBarSize={42}
            >
              <LabelList
                dataKey="arCount"
                content={renderArLabelBadge}
              />
            </Bar>
            {/* Linha: Acumulado do Mês (Eixo Direito) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="acumuladoMes"
              name="Acumulado Mês (am.)"
              stroke="#a855f7"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#a855f7', strokeWidth: 1, stroke: '#ffffff' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

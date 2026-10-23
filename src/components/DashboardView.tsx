import React, { useState, useMemo } from 'react';
import { DrillHole, SampleShipmentAR, User, OreasStockEntry, ProductionLog } from '../types';
import {
  calculateDashboardKpis,
  filterARsByPeriod,
  agruparPorSemana,
  furosPorSituacao,
  calcularEstoqueOreas,
  formatNumberPtBR,
  formatKgPtBR,
  normalizeDateString,
} from '../utils/dashboardAggregations';
import { KpiCard } from './dashboard/KpiCard';
import { DashboardFilters } from './dashboard/DashboardFilters';
import { ShipmentsByWeekChart } from './dashboard/ShipmentsByWeekChart';
import { HolesByStatusChart } from './dashboard/HolesByStatusChart';
import { OreasStockChart } from './dashboard/OreasStockChart';
import { parseSampleRanges, getARVolumeCount, getNormalizedSampleRanges } from '../utils/calculator';
import { QaqcTableGrid } from './QaqcTableGrid';
import {
  Search,
  Filter,
  PlusCircle,
  Eye,
  Truck,
  AlertCircle,
  Trash2,
  Package,
  Calendar,
  UserCheck,
  Edit2,
  Camera,
  BarChart2,
  Layers,
  Scale,
  Compass,
} from 'lucide-react';

interface DashboardViewProps {
  holes: DrillHole[];
  ars: SampleShipmentAR[];
  activeUser: User;
  oreasStockEntries?: OreasStockEntry[];
  logs?: ProductionLog[];
  onOpenHoleDetail: (hole: DrillHole) => void;
  onOpenNewHoleModal: () => void;
  onDeleteHoleRequest: (hole: DrillHole) => void;
  onOpenPackingPlan?: (ar: SampleShipmentAR, initialTab?: 'plan' | 'photos') => void;
  onOpenCreateARModal?: (holeId?: string) => void;
  onEditAR?: (ar: SampleShipmentAR) => void;
  onUpdateHoleInfo?: (holeId: string, newCode: string, newTarget?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  holes,
  ars,
  activeUser,
  oreasStockEntries = [],
  logs = [],
  onOpenHoleDetail,
  onOpenNewHoleModal,
  onDeleteHoleRequest,
  onOpenPackingPlan,
  onOpenCreateARModal,
  onEditAR,
  onUpdateHoleInfo,
}) => {
  // Navigation between Analytics Dashboard (Read-Only) and Operational View
  const [activeSection, setActiveSection] = useState<'analytics' | 'operational'>('analytics');

  // ==========================================================================
  // DASHBOARD ANALYTICS (SOMENTE LEITURA) - ESTADO E AGREGAÇÕES
  // ==========================================================================
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string>('all');

  const handleSelectPreset = (preset: '7d' | '30d' | 'thisMonth' | '90d' | 'all') => {
    setActivePreset(preset);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    const endStr = toDateStr(today);
    setEndDate(endStr);

    if (preset === '7d') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setStartDate(toDateStr(past));
    } else if (preset === '30d') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      setStartDate(toDateStr(past));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(toDateStr(firstDay));
    } else if (preset === '90d') {
      const past = new Date(today);
      past.setDate(today.getDate() - 90);
      setStartDate(toDateStr(past));
    }
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setActivePreset('all');
  };

  // ARs filtradas pelo período selecionado
  const filteredARs = useMemo(() => {
    return filterARsByPeriod(ars, startDate, endDate);
  }, [ars, startDate, endDate]);

  // Indicador 1: KPIs de Topo
  const kpis = useMemo(() => {
    return calculateDashboardKpis(filteredARs);
  }, [filteredARs]);

  // Indicador 2: Envios por Semana
  const weeklyData = useMemo(() => {
    return agruparPorSemana(filteredARs);
  }, [filteredARs]);

  // Indicador 3: Furos por Situação (Agrupados por Target)
  const holesStatus = useMemo(() => {
    return furosPorSituacao(holes, ars);
  }, [holes, ars]);

  // Indicador 4: Estoque e Consumo OREAS
  const oreasAnalytics = useMemo(() => {
    // Calcula a quantidade de dias no período filtrado para consumo médio
    let daysCount = 30;
    if (startDate && endDate) {
      const dStart = new Date(startDate).getTime();
      const dEnd = new Date(endDate).getTime();
      const diff = Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24));
      if (diff > 0) daysCount = diff;
    }
    return calcularEstoqueOreas(oreasStockEntries, filteredARs, daysCount);
  }, [oreasStockEntries, filteredARs, startDate, endDate]);

  // ==========================================================================
  // GESTÃO OPERACIONAL (LISTAGEM DE FUROS E CADASTROS)
  // ==========================================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  // Inline editing state for holes
  const [editingHoleId, setEditingHoleId] = useState<string | null>(null);
  const [editCodeInput, setEditCodeInput] = useState('');
  const [editTargetInput, setEditTargetInput] = useState('');

  // Targets options
  const targets = useMemo(() => {
    return Array.from(new Set(holes.map((h) => h.target || 'GERAL')));
  }, [holes]);

  // Filter logic for holes
  const filteredHoles = useMemo(() => {
    return holes.filter((hole) => {
      const holeDateOnly = hole.createdAt ? hole.createdAt.split('T')[0] : '';

      const matchesSearch =
        hole.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hole.target || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hole.firstSampleCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hole.lastSampleCode || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTarget = selectedTarget === 'ALL' || hole.target === selectedTarget;

      const matchesDate =
        selectedDate === 'ALL' ||
        !selectedDate ||
        holeDateOnly === selectedDate ||
        hole.createdAt.startsWith(selectedDate);

      return matchesSearch && matchesTarget && matchesDate;
    });
  }, [holes, searchTerm, selectedTarget, selectedDate]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Navigation Switcher: Somente Leitura (Dashboard) vs Operacional */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSection('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSection === 'analytics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Dashboard de Indicadores</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950/40 font-semibold">
              Somente Leitura
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('operational')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSection === 'operational'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Furos & Amostragem</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950/40 font-semibold">
              {holes.length}
            </span>
          </button>
        </div>

        {activeSection === 'operational' && (
          <button
            onClick={onOpenNewHoleModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Novo Cadastro</span>
          </button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SEÇÃO 1: DASHBOARD DE INDICADORES (SOMENTE LEITURA - FASE 1)         */}
      {/* ===================================================================== */}
      {activeSection === 'analytics' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Filtro de Período Local */}
          <DashboardFilters
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(d) => {
              setStartDate(d);
              setActivePreset('');
            }}
            onEndDateChange={(d) => {
              setEndDate(d);
              setActivePreset('');
            }}
            onClearFilters={handleClearFilters}
            onSelectPreset={handleSelectPreset}
            activePreset={activePreset}
            totalFilteredARs={filteredARs.length}
            totalAllARs={ars.length}
          />

          {/* 1) 4 KPI Cards no Topo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total de Remessas (ARs)"
              value={formatNumberPtBR(kpis.totalARs)}
              subtitle="Despachos ao laboratório no período"
              icon={Truck}
              variant="amber"
              trendText={`${kpis.totalARs} AR(s)`}
            />

            <KpiCard
              title="Total de Amostras"
              value={formatNumberPtBR(kpis.totalSamples)}
              subtitle="Amostras enviadas na soma das faixas"
              icon={Package}
              variant="cyan"
              trendText={`${formatNumberPtBR(kpis.totalSamples)} un`}
            />

            <KpiCard
              title="Total de Peso Enviado"
              value={formatKgPtBR(kpis.totalWeightKg)}
              subtitle="Peso aferido de caixas/sacos despachados"
              icon={Scale}
              variant="emerald"
              trendText="Carga total"
            />

            <KpiCard
              title="Furos com Envio"
              value={kpis.uniqueHolesCount}
              subtitle="Furos distintos com remessas no período"
              icon={Compass}
              variant="purple"
              trendText={`de ${holes.length} furos`}
            />
          </div>

          {/* 2) Gráfico 1: Envios por Semana com Acumulado do Mês */}
          <ShipmentsByWeekChart data={weeklyData} />

          {/* 3) e 4) Grid com Furos por Situação e Estoque OREAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3) Furos por Situação (Agrupados por Target) */}
            <HolesByStatusChart summary={holesStatus} />

            {/* 4) Estoque OREAS e Consumo Médio */}
            <OreasStockChart analytics={oreasAnalytics} />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SEÇÃO 2: GESTÃO OPERACIONAL (FUROS & CADASTROS EXISTENTES)            */}
      {/* ===================================================================== */}
      {activeSection === 'operational' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Filter and Search Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Text Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por código, Alvo ou amostra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-medium text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Target Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">Todos os Alvos ({targets.length})</option>
                  {targets.map((tgt) => (
                    <option key={tgt} value={tgt}>
                      {tgt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter Input */}
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Data:</span>
                <input
                  type="date"
                  value={selectedDate === 'ALL' ? '' : selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || 'ALL')}
                  className="bg-transparent text-xs font-mono font-bold text-white outline-none cursor-pointer"
                />
                {selectedDate !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('ALL')}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold ml-1 bg-slate-700 px-1.5 py-0.5 rounded transition-colors"
                    title="Limpar filtro de data"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List of Holes / Sample Plans */}
          {filteredHoles.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-200 text-base">
                Nenhum furo/amostragem encontrado
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Não foram encontrados cadastros com os filtros selecionados. Clique no botão abaixo para cadastrar um novo furo.
              </p>
              <button
                onClick={onOpenNewHoleModal}
                className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs hover:bg-amber-400 inline-flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Cadastrar Furo / Amostragem
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {filteredHoles.map((hole) => {
                const holeARs = ars.filter((ar) => ar.drillHoleId === hole.id);
                const holeShippedSamples = holeARs.reduce((acc, ar) => acc + (ar.sampleCount || 0), 0);

                const multiParsed = parseSampleRanges(hole.sampleRanges, hole.firstSampleCode, hole.lastSampleCode);
                const plannedCount = hole.calculatedSampleCount || (multiParsed.isValid ? multiParsed.totalCount : 0);

                const displayRanges = hole.sampleRanges && hole.sampleRanges.length > 0
                  ? hole.sampleRanges
                  : (hole.firstSampleCode && hole.lastSampleCode ? [{ firstSampleCode: hole.firstSampleCode, lastSampleCode: hole.lastSampleCode }] : []);

                return (
                  <div
                    key={hole.id}
                    className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg hover:border-slate-700 transition-all flex flex-col gap-5"
                  >
                    {/* Hole Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div className="flex-1">
                        {editingHoleId === hole.id ? (
                          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950 border border-amber-500/40 rounded-xl mb-2">
                            <div className="flex-1 min-w-[150px]">
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">CÓDIGO DO FURO / AMOSTRA</label>
                              <input
                                type="text"
                                value={editCodeInput}
                                onChange={(e) => setEditCodeInput(e.target.value.toUpperCase())}
                                className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-sm font-bold outline-none focus:border-amber-500"
                              />
                            </div>
                            <div className="w-28">
                              <label className="text-[10px] text-slate-400 font-bold block mb-1">ALVO</label>
                              <input
                                type="text"
                                value={editTargetInput}
                                onChange={(e) => setEditTargetInput(e.target.value.toUpperCase())}
                                className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-bold outline-none focus:border-amber-500"
                              />
                            </div>
                            <div className="flex items-center gap-1 mt-4">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editCodeInput.trim()) return;
                                  onUpdateHoleInfo?.(hole.id, editCodeInput, editTargetInput);
                                  setEditingHoleId(null);
                                }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingHoleId(null)}
                                className="px-2 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs rounded-lg transition-all"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-black font-mono text-white tracking-tight">
                              {hole.code}
                            </h3>

                            {onUpdateHoleInfo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingHoleId(hole.id);
                                  setEditCodeInput(hole.code);
                                  setEditTargetInput(hole.target || 'GERAL');
                                }}
                                className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title="Editar nome do furo e alvo"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 font-semibold text-amber-300 border border-amber-500/30">
                              Alvo: {hole.target || 'GERAL'}
                            </span>

                            {hole.createdByName && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                                {hole.createdByName}
                              </span>
                            )}
                          </div>
                        )}

                        {displayRanges.length > 0 ? (
                          <div className="text-xs font-mono text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                            <span>Plano:</span>
                            {displayRanges.map((r, i) => (
                              <span key={i} className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                                <strong>{r.firstSampleCode}</strong> → <strong>{r.lastSampleCode}</strong>
                              </span>
                            ))}
                            <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-[11px]">
                              {plannedCount} amostras ({displayRanges.length} {displayRanges.length === 1 ? 'faixa' : 'faixas'})
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic mt-1">
                            Faixa de amostras não informada
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {holeARs.length > 0 && onOpenPackingPlan && (
                          <button
                            type="button"
                            onClick={() => onOpenPackingPlan(holeARs[0], 'photos')}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            title="Anexar e visualizar fotos dos padrões QA/QC deste furo"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-400" />
                            <span>Fotos</span>
                          </button>
                        )}

                        {onOpenCreateARModal && (
                          <button
                            onClick={() => onOpenCreateARModal(hole.id)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-bold transition-all flex items-center gap-1.5"
                            title="Adicionar AR para este furo"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>+ AR Adicional</span>
                          </button>
                        )}

                        <button
                          onClick={() => onOpenHoleDetail(hole)}
                          className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detalhes</span>
                        </button>

                        <button
                          onClick={() => onDeleteHoleRequest(hole)}
                          className="p-1.5 rounded-xl border border-slate-800 hover:border-red-900/60 bg-slate-800/40 hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition-all"
                          title="Apagar cadastro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Linked ARGMGP Shipments */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Truck className="w-4 h-4" /> Remessas de Envio (ARGMGP - {holeARs.length})
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Amostras vinculadas em ARs: <strong>{holeShippedSamples} / {plannedCount}</strong>
                        </span>
                      </div>

                      {holeARs.length === 0 ? (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 italic flex items-center justify-between">
                          <span>Nenhum AR gerado para este furo.</span>
                          {onOpenCreateARModal && (
                            <button
                              onClick={() => onOpenCreateARModal(hole.id)}
                              className="text-cyan-400 font-bold hover:underline not-italic text-xs"
                            >
                              Gerar AR agora &rarr;
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950">
                                <th className="p-2.5">Código AR</th>
                                <th className="p-2.5">Faixa Amostras</th>
                                <th className="p-2.5 text-center">Amostras</th>
                                <th className="p-2.5 text-center">Volumes</th>
                                <th className="p-2.5 text-center">Peso</th>
                                <th className="p-2.5">Padrões QA/QC</th>
                                <th className="p-2.5">Data Envio</th>
                                <th className="p-2.5 text-right">Plano Empacotamento</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 font-medium bg-slate-950/50">
                              {holeARs.map((ar) => (
                                <tr key={ar.id} className="hover:bg-slate-800/50 transition-colors">
                                  <td className="p-2.5 font-mono font-bold text-cyan-300">{ar.arCode}</td>
                                  <td className="p-2.5 font-mono text-slate-300">
                                    <div className="flex flex-col gap-1">
                                      {getNormalizedSampleRanges(ar.sampleRanges, ar.startSampleCode, ar.endSampleCode).map((r, idx) => (
                                        <span key={idx} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px] whitespace-nowrap">
                                          {r.firstSampleCode} - {r.lastSampleCode}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-bold text-emerald-400">{ar.sampleCount}</td>
                                  <td className="p-2.5 text-center font-mono text-slate-300">{getARVolumeCount(ar)} vol</td>
                                  <td className="p-2.5 text-center font-mono text-purple-300">{ar.weightKg ? `${ar.weightKg} kg` : '-'}</td>
                                  <td className="p-2.5">
                                    <QaqcTableGrid samples={ar.qaqcSamples || []} />
                                  </td>
                                  <td className="p-2.5 font-mono text-slate-400">{ar.shipmentDate || <span className="text-slate-600 italic">Em branco</span>}</td>
                                  <td className="p-2.5 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {onOpenPackingPlan && (
                                        <button
                                          onClick={() => onOpenPackingPlan(ar, 'photos')}
                                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-bold rounded-lg inline-flex items-center gap-1 transition-colors"
                                          title="Fotos dos Padrões QA/QC"
                                        >
                                          <Camera className="w-3 h-3 text-amber-400" />
                                          <span>Fotos</span>
                                        </button>
                                      )}
                                      {onEditAR && (
                                        <button
                                          onClick={() => onEditAR(ar)}
                                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-lg inline-flex items-center gap-1 transition-colors"
                                          title="Editar esta remessa (AR)"
                                        >
                                          <Edit2 className="w-3 h-3 text-amber-400" />
                                          <span>Editar AR</span>
                                        </button>
                                      )}
                                      {onOpenPackingPlan && (
                                        <button
                                          onClick={() => onOpenPackingPlan(ar)}
                                          className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[10px] font-bold rounded-lg inline-flex items-center gap-1 transition-colors"
                                          title="Gerar Plano de Empacotamento"
                                        >
                                          <Package className="w-3 h-3 text-cyan-400" />
                                          <span>Plano</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

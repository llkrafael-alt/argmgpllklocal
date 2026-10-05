import React, { useState } from 'react';
import { DrillHole, SampleShipmentAR, OreasStockEntry, QAQCSamplePhoto } from '../types';
import { calculateOreasBalances } from '../utils/oreasStock';
import { getARVolumeCount, formatDateToPtBR, getNormalizedSampleRanges, isPhotoMatchingAR } from '../utils/calculator';
import { QaqcTableGrid } from './QaqcTableGrid';
import { WeeklyLabReport } from './WeeklyLabReport';
import {
  Truck,
  Search,
  PlusCircle,
  Calendar,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Info,
  Edit2,
  ShieldCheck,
  FileSpreadsheet,
  List,
  Boxes,
  Package,
  Camera,
  FileText,
} from 'lucide-react';

interface ShipmentsViewProps {
  ars: SampleShipmentAR[];
  holes: DrillHole[];
  oreasStockEntries?: OreasStockEntry[];
  photos?: QAQCSamplePhoto[];
  onOpenCreateARModal: () => void;
  onOpenOreasStockModal?: () => void;
  onOpenPdfReportModal?: (date?: string) => void;
  onEditAR: (ar: SampleShipmentAR) => void;
  onDeleteAR: (arId: string) => void;
  onOpenHoleDetailByCode: (holeCode: string) => void;
  onOpenPackingPlan: (ar: SampleShipmentAR, initialTab?: 'plan' | 'photos') => void;
}

export const ShipmentsView: React.FC<ShipmentsViewProps> = ({
  ars,
  holes,
  oreasStockEntries = [],
  photos = [],
  onOpenCreateARModal,
  onOpenOreasStockModal,
  onOpenPdfReportModal,
  onEditAR,
  onDeleteAR,
  onOpenHoleDetailByCode,
  onOpenPackingPlan,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'report'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  // Available unique shipment dates for quick filtering
  const availableDates: string[] = Array.from<string>(
    new Set<string>(ars.map((a) => (a.shipmentDate ? a.shipmentDate.split('T')[0] : '')).filter((d): d is string => Boolean(d)))
  )
    .sort()
    .reverse();

  // Calculate OREAS Stock alerts for visual badge
  const oreasSummaries = calculateOreasBalances(oreasStockEntries, ars);
  const outOfStockCount = oreasSummaries.filter((s) => s.status === 'out_of_stock').length;
  const lowStockCount = oreasSummaries.filter((s) => s.status === 'low').length;

  // Sort ARs in sequential order
  const sortedARs = [...ars].sort((a, b) => {
    const numA = parseInt(a.arCode.match(/\d+$/)?.[0] || '0', 10);
    const numB = parseInt(b.arCode.match(/\d+$/)?.[0] || '0', 10);
    return numA - numB;
  });

  // Filter logic
  const filteredARs = sortedARs.filter((ar) => {
    const arDateOnly = ar.shipmentDate ? ar.shipmentDate.split('T')[0] : '';
    const formattedDate = formatDateToPtBR(ar.shipmentDate);

    const matchesSearch =
      ar.arCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ar.drillHoleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ar.startSampleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ar.endSampleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formattedDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ar.qaqcSamples &&
        ar.qaqcSamples.some(
          (q) =>
            q.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.type.toLowerCase().includes(searchTerm.toLowerCase())
        ));

    const matchesDate =
      selectedDate === 'ALL' ||
      !selectedDate ||
      arDateOnly === selectedDate ||
      ar.shipmentDate === selectedDate;

    return matchesSearch && matchesDate;
  });

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* SubTab Navigation Switcher & Actions */}
      <div className="no-print grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('list')}
          className={`px-1.5 sm:px-4 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 min-h-[42px] ${
            activeSubTab === 'list'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
          }`}
        >
          <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">
            <span className="inline sm:hidden">Relação ARs</span>
            <span className="hidden sm:inline">Relação de Remessas (ARs)</span>
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('report')}
          className={`px-1.5 sm:px-4 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 min-h-[42px] ${
            activeSubTab === 'report'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">
            <span className="inline sm:hidden">Relat. Semanal</span>
            <span className="hidden sm:inline">Relatório Semanal de Envio (Laboratório)</span>
          </span>
        </button>

        {onOpenPdfReportModal && (
          <button
            type="button"
            onClick={() => onOpenPdfReportModal(selectedDate === 'ALL' ? undefined : selectedDate)}
            className="px-1.5 sm:px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-md hover:border-amber-400/50 min-h-[42px]"
            title="Gerar relatório fotográfico em PDF dos padrões enviados nesta data"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              <span className="inline sm:hidden">PDF Fotos</span>
              <span className="hidden sm:inline">Relatório PDF Fotos</span>
            </span>
          </button>
        )}
      </div>

      {activeSubTab === 'report' ? (
        <WeeklyLabReport
          ars={ars}
          holes={holes}
          onOpenHoleDetailByCode={onOpenHoleDetailByCode}
          onOpenPdfReportModal={onOpenPdfReportModal}
          onOpenPackingPlan={onOpenPackingPlan}
          photos={photos}
        />
      ) : (
        <>
          {/* Control Bar & Filter */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">


              {/* Date Filter Input */}
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
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

              {/* Quick Select Dropdown of Available Shipment Dates */}
              {availableDates.length > 0 && (
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xs outline-none focus:border-cyan-500 cursor-pointer max-w-[200px]"
                >
                  <option value="ALL">Todas as Datas ({ars.length} ARs)</option>
                  {availableDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDateToPtBR(date)} ({ars.filter((a) => (a.shipmentDate ? a.shipmentDate.split('T')[0] : '') === date).length} ARs)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  const targetAR = filteredARs[0] || sortedARs[0];
                  if (targetAR) {
                    onOpenPackingPlan(targetAR, 'photos');
                  }
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-amber-300 border border-slate-700 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
                title="Abrir galeria para tirar, anexar e visualizar fotos dos padrões QA/QC"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Fotos QA/QC ({photos.length})</span>
              </button>

              {onOpenOreasStockModal && (
                <button
                  onClick={onOpenOreasStockModal}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 active:bg-purple-950 text-purple-200 border border-purple-700/80 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md relative"
                >
                  <Boxes className="w-4 h-4 text-purple-400" />
                  <span>Estoque de OREAS</span>
                  {outOfStockCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-slate-950 font-black text-[10px] animate-pulse">
                      {outOfStockCount}
                    </span>
                  ) : lowStockCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                      {lowStockCount}
                    </span>
                  ) : null}
                </button>
              )}

              <button
                onClick={onOpenCreateARModal}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Gerar Novo Envio (AR)</span>
              </button>
            </div>
          </div>

      {/* List of ARs */}
      {filteredARs.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-200 text-base">
            Nenhuma Autorização de Remessa (AR) encontrada
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Gere o primeiro registro de envio de amostras para acompanhar o fluxo da amostragem (Etapa 11).
          </p>
          <button
            onClick={onOpenCreateARModal}
            className="mt-4 px-4 py-2 bg-cyan-500 text-slate-950 font-black rounded-xl text-xs hover:bg-cyan-400 inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Registrar Primeiro AR
          </button>
        </div>
      ) : (
        <>
          {/* Mobile AR Cards View */}
          <div className="block md:hidden space-y-3">
            <div className="flex items-center justify-between px-1 mb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>Relação de ARs ({filteredARs.length})</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                Sequencial ativo
              </span>
            </div>

            {filteredARs.map((ar) => {
              const arPhotosCount = photos.filter((p) => isPhotoMatchingAR(p, ar)).length;
              const ranges = getNormalizedSampleRanges(ar.sampleRanges, ar.startSampleCode, ar.endSampleCode);

              return (
                <div
                  key={ar.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-3 transition-all hover:border-slate-700"
                >
                  {/* Card Header: AR Code & Drill Hole */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-cyan-300 px-2.5 py-1 rounded bg-cyan-950/90 border border-cyan-800 text-xs">
                        {ar.arCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenHoleDetailByCode(ar.drillHoleCode)}
                        className="font-mono font-bold text-white hover:text-amber-400 text-xs hover:underline transition-colors"
                        title="Clique para ver o histórico do furo"
                      >
                        {ar.drillHoleCode}
                      </button>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 font-medium whitespace-nowrap">
                      {formatDateToPtBR(ar.shipmentDate)}
                    </span>
                  </div>

                  {/* Sample Count, Volumes & Weight Grid */}
                  <div className="grid grid-cols-3 gap-2 py-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-center">
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-500 block">Amostras</span>
                      <span className="font-mono font-black text-emerald-400 text-xs">{ar.sampleCount}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-500 block">Volumes</span>
                      <span className="font-mono font-bold text-amber-300 text-xs">{getARVolumeCount(ar)} vol.</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-500 block">Peso</span>
                      <span className="font-mono font-bold text-purple-300 text-xs">{ar.weightKg ?? 0} kg</span>
                    </div>
                  </div>

                  {/* Sample Ranges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Faixa:</span>
                    {ranges.map((r, idx) => (
                      <span
                        key={idx}
                        className="font-mono font-semibold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[10px]"
                      >
                        {r.firstSampleCode} a {r.lastSampleCode}
                      </span>
                    ))}
                  </div>

                  {/* QA/QC Standards */}
                  {ar.qaqcSamples && ar.qaqcSamples.length > 0 && (
                    <div className="pt-1 border-t border-slate-800/50">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Padrões QA/QC:</span>
                      <QaqcTableGrid samples={ar.qaqcSamples} />
                    </div>
                  )}

                  {/* Action Buttons Footer */}
                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenPackingPlan(ar, 'photos')}
                        className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all min-h-[40px]"
                        title="Tirar e visualizar fotos dos padrões QA/QC"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{arPhotosCount} Fotos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenPackingPlan(ar, 'plan')}
                        className="px-3 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 active:bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold text-xs flex items-center gap-1.5 transition-all min-h-[40px]"
                        title="Gerar Plano de Empacotamento do Envio"
                      >
                        <Package className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Plano</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditAR(ar)}
                        className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-cyan-300 active:bg-slate-700 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center border border-slate-700"
                        title="Editar todos os campos deste AR"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteAR(ar.id)}
                        className="p-2.5 rounded-xl bg-red-950/40 text-red-400 hover:bg-red-900/60 active:bg-red-950 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center border border-red-900/40"
                        title="Excluir este AR"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-400" />
                Relação Sequencial de Envio de Amostras ({filteredARs.length} registros)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Regra: Máximo de 200 amostras por lote/AR • Todos os campos editáveis
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-950/60">
                  <th className="py-3 px-3">Código AR</th>
                  <th className="py-3 px-3">Furo</th>
                  <th className="py-3 px-3">Faixa de Amostras</th>
                  <th className="py-3 px-3 text-center">Amostras</th>
                  <th className="py-3 px-3 text-center">Volumes</th>
                  <th className="py-3 px-3 text-center">Peso (kg)</th>
                  <th className="py-3 px-3">Padrões QA/QC (Controle)</th>
                  <th className="py-3 px-3">Data Envio</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredARs.map((ar) => (
                  <tr key={ar.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* AR Code */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-black text-cyan-300 px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-800 text-xs">
                        {ar.arCode}
                      </span>
                    </td>

                    {/* Hole Code */}
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => onOpenHoleDetailByCode(ar.drillHoleCode)}
                        className="font-mono font-bold text-white hover:text-amber-400 hover:underline transition-colors"
                        title="Clique para ver o histórico do furo"
                      >
                        {ar.drillHoleCode}
                      </button>
                    </td>

                    {/* Sample Range */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1">
                        {getNormalizedSampleRanges(ar.sampleRanges, ar.startSampleCode, ar.endSampleCode).map((r, idx) => (
                          <span key={idx} className="font-mono font-semibold text-slate-200 bg-slate-800 px-2 py-1 rounded border border-slate-700 text-[11px] whitespace-nowrap">
                            {r.firstSampleCode} a {r.lastSampleCode}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Sample Count */}
                    <td className="py-3.5 px-3 text-center font-mono font-black text-emerald-400">
                      {ar.sampleCount}
                      {ar.sampleCount > 200 && (
                        <span className="text-[9px] text-red-400 block font-normal">
                          ! &gt; 200
                        </span>
                      )}
                    </td>

                    {/* Volumes */}
                    <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                      {getARVolumeCount(ar)} vol.
                    </td>

                    {/* Weight */}
                    <td className="py-3.5 px-3 text-center font-mono text-purple-300 font-bold">
                      {ar.weightKg !== undefined && ar.weightKg !== null ? ar.weightKg : 0} kg
                    </td>

                    {/* QA/QC Standard Samples */}
                    <td className="py-2 px-3">
                      <QaqcTableGrid samples={ar.qaqcSamples || []} />
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 text-slate-300 font-mono whitespace-nowrap">
                      {formatDateToPtBR(ar.shipmentDate)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenPackingPlan(ar, 'photos')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-[11px] flex items-center gap-1 transition-all min-h-[36px]"
                          title="Tirar e visualizar fotos dos padrões QA/QC deste AR"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-400" />
                          <span>{photos.filter((p) => isPhotoMatchingAR(p, ar)).length} Fotos</span>
                        </button>

                        <button
                          onClick={() => onOpenPackingPlan(ar, 'plan')}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 active:bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-xs min-h-[36px]"
                          title="Gerar Plano de Empacotamento do Envio"
                        >
                          <Package className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Plano</span>
                        </button>

                        <button
                          onClick={() => onEditAR(ar)}
                          className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Editar todos os campos deste AR"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDeleteAR(ar.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Excluir este AR"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
};

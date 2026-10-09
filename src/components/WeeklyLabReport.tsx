import React, { useState } from 'react';
import { SampleShipmentAR, DrillHole, QAQCSamplePhoto } from '../types';
import { getARVolumeCount, formatDateToPtBR, getNormalizedSampleRanges, getArCodeDisplay, isPhotoMatchingAR, sortARsBySequence, deduplicatePhotos } from '../utils/calculator';
import { QaqcTableGrid } from './QaqcTableGrid';
import { AppLogo } from './AppLogo';
import {
  FileText,
  Printer,
  Copy,
  Check,
  Download,
  Calendar,
  Layers,
  PackageCheck,
  Weight,
  ShieldCheck,
  Truck,
  Camera,
  Image as ImageIcon,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';

interface WeeklyLabReportProps {
  ars: SampleShipmentAR[];
  holes: DrillHole[];
  onOpenHoleDetailByCode?: (holeCode: string) => void;
  onOpenPdfReportModal?: (date?: string) => void;
  onOpenPackingPlan?: (ar: SampleShipmentAR, initialTab?: 'plan' | 'photos') => void;
  photos?: QAQCSamplePhoto[];
}

export const WeeklyLabReport: React.FC<WeeklyLabReportProps> = ({
  ars,
  holes,
  onOpenHoleDetailByCode,
  onOpenPdfReportModal,
  onOpenPackingPlan,
  photos = [],
}) => {
  const normalizeDate = (d?: string | null) => (d ? d.split('T')[0].trim() : '');

  // Get unique shipment dates sorted descending
  const availableDates: string[] = Array.from(
    new Set<string>(ars.map((a) => normalizeDate(a.shipmentDate)).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  // Selected filters
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedAR, setSelectedAR] = useState<string>('all');
  const [reportMode, setReportMode] = useState<'summary' | 'standards' | 'photos'>('summary');
  const [copied, setCopied] = useState<boolean>(false);

  // Filter available ARs based on date selection and sort strictly by AR sequence number
  const availableARs = sortARsBySequence(
    [...ars].filter((ar) =>
      selectedDate === 'all'
        ? true
        : normalizeDate(ar.shipmentDate) === normalizeDate(selectedDate)
    )
  );

  // Filter ARs by date and AR selection
  const reportARs = availableARs.filter((ar) =>
    selectedAR === 'all' ? true : ar.arCode === selectedAR || ar.id === selectedAR
  );

  // Totals
  const totalSamples = reportARs.reduce((sum, ar) => sum + ar.sampleCount, 0);
  const totalVolumes = reportARs.reduce((sum, ar) => sum + getARVolumeCount(ar), 0);
  const totalWeightKg = reportARs.reduce((sum, ar) => sum + ar.weightKg, 0);

  React.useEffect(() => {
    const matched = photos.filter((p) => reportARs.some((ar) => isPhotoMatchingAR(p, ar)));
    console.log('[WeeklyLabReport DIAGNOSTIC LOG]', {
      selectedDate,
      selectedAR,
      reportARsCount: reportARs.length,
      reportARsCodes: reportARs.map((a) => a.arCode),
      totalPhotosInState: photos.length,
      matchedPhotosCount: matched.length,
      matchedPhotoSampleCodes: matched.map((p) => ({ arCode: p.arCode, sampleCode: p.sampleCode, arId: p.arId })),
    });
  }, [selectedDate, selectedAR, reportARs, photos]);

  // Date text for report footer row
  const reportDateText =
    selectedDate !== 'all' ? formatDateToPtBR(selectedDate) : formatDateToPtBR(new Date().toISOString());

  // Helper to format numbers with Portuguese thousands dot (e.g. 1.490)
  const formatPtNumber = (num: number) => {
    if (isNaN(num)) return '0';
    return Math.round(num).toLocaleString('pt-BR');
  };

  // Copy to Excel TSV
  const handleCopyToClipboard = () => {
    let tsv = '';
    if (reportMode === 'summary') {
      tsv += `RELATÓRIO DE ENVIO DE AMOSTRAS PARA LABORATÓRIO\n`;
      tsv += `Data do Envio / Referência: ${selectedDate === 'all' ? 'Todas as Datas' : formatDateToPtBR(selectedDate)}\n\n`;
      tsv += `NAME\tNº\tFROM\tTO\tSAMPLES\tVOLUMES\tKG\n`;

      reportARs.forEach((ar) => {
        const holeCode = ar.drillHoleCode || holes.find((h) => h.id === ar.drillHoleId)?.code || '-';
        const ranges = getNormalizedSampleRanges(ar.sampleRanges, ar.startSampleCode, ar.endSampleCode);
        const fromStr = ranges.map(r => r.firstSampleCode).join(' / ');
        const toStr = ranges.map(r => r.lastSampleCode).join(' / ');
        tsv += `${holeCode}\t${ar.arCode}\t${fromStr}\t${toStr}\t${ar.sampleCount}\t${getARVolumeCount(ar)}\t${Math.round(ar.weightKg)}\n`;
      });

      tsv += `${reportDateText}\tTOTAL\t\t\t${formatPtNumber(totalSamples)}\t${formatPtNumber(totalVolumes)}\t${formatPtNumber(totalWeightKg)}\n`;
    } else {
      tsv += `G MINING VENTURES - PROJETO GURUPI\n`;
      tsv += `RELATÓRIO DE FUROS E PADRÕES QA/QC (OREAS & BLK)\n\n`;

      reportARs.forEach((ar) => {
        const holeCode = ar.drillHoleCode || holes.find((h) => h.id === ar.drillHoleId)?.code || '-';
        tsv += `${holeCode}\t${ar.arCode}\tOREAS\tBLK\n`;

        const oreasList = ar.qaqcSamples?.filter((q) => q.type.toUpperCase() === 'OREAS') || [];
        const blkList = ar.qaqcSamples?.filter((q) => q.type.toUpperCase() === 'BLK') || [];
        const rowCount = Math.max(oreasList.length, blkList.length, 1);

        for (let i = 0; i < rowCount; i++) {
          const oCode = oreasList[i]?.code || '';
          const oProd = oreasList[i]?.oreasProduct || '';
          const bCode = blkList[i]?.code || '';
          tsv += `\t${oCode}\t${oProd}\t${bCode}\n`;
        }
      });
    }

    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = '';
    if (reportMode === 'summary') {
      csv += `NAME,Nº,FROM,TO,SAMPLES,VOLUMES,KG\n`;

      reportARs.forEach((ar) => {
        const holeCode = ar.drillHoleCode || holes.find((h) => h.id === ar.drillHoleId)?.code || '-';
        const ranges = getNormalizedSampleRanges(ar.sampleRanges, ar.startSampleCode, ar.endSampleCode);
        const fromStr = ranges.map(r => r.firstSampleCode).join(' / ');
        const toStr = ranges.map(r => r.lastSampleCode).join(' / ');
        csv += `"${holeCode}","${ar.arCode}","${fromStr}","${toStr}",${ar.sampleCount},${getARVolumeCount(ar)},${Math.round(ar.weightKg)}\n`;
      });

      csv += `"${reportDateText}","TOTAL","","","${formatPtNumber(totalSamples)}","${formatPtNumber(totalVolumes)}","${formatPtNumber(totalWeightKg)}"\n`;
    } else {
      csv += `"FURO","AR","OREAS","BLK"\n`;

      reportARs.forEach((ar) => {
        const holeCode = ar.drillHoleCode || holes.find((h) => h.id === ar.drillHoleId)?.code || '-';
        csv += `"${holeCode}","${ar.arCode}","OREAS","BLK"\n`;

        const oreasList = ar.qaqcSamples?.filter((q) => q.type.toUpperCase() === 'OREAS') || [];
        const blkList = ar.qaqcSamples?.filter((q) => q.type.toUpperCase() === 'BLK') || [];
        const rowCount = Math.max(oreasList.length, blkList.length, 1);

        for (let i = 0; i < rowCount; i++) {
          const oCode = oreasList[i]?.code || '';
          const oProd = oreasList[i]?.oreasProduct || '';
          const bCode = blkList[i]?.code || '';
          csv += `,"${oCode}","${oProd}","${bCode}"\n`;
        }
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Relatorio_${reportMode === 'summary' ? 'Envio_Laboratorio' : 'Furos_E_Padroes'}_${formatDateToPtBR(selectedDate).replace(/\//g, '-')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="printable-lab-report" className="flex flex-col gap-6">
      {/* Control Bar & Filter Actions (hidden during print) */}
      <div className="no-print p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase whitespace-nowrap">
                Data do Envio:
              </span>
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedAR('all');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xs outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">Todas as Datas ({ars.length} ARs)</option>
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDateToPtBR(date)} ({ars.filter((a) => normalizeDate(a.shipmentDate) === date).length} ARs)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AR Code Filter */}
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase whitespace-nowrap">
                Remessa / AR:
              </span>
              <select
                value={selectedAR}
                onChange={(e) => setSelectedAR(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xs outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">Todas as ARs ({availableARs.length})</option>
                {availableARs.map((ar) => {
                  const holeCode = ar.drillHoleCode || holes.find((h) => h.id === ar.drillHoleId)?.code || '';
                  return (
                    <option key={ar.id} value={ar.arCode}>
                      {ar.arCode} {holeCode ? `(${holeCode})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={handleCopyToClipboard}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm ${
              copied
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30'
            }`}
            title="Copiar tabela formatada para colar direto no Excel ou Google Sheets"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tabela Copiada!' : 'Copiar p/ Excel'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center gap-2"
            title="Baixar arquivo em formato CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            title="Imprimir ou Salvar como PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Report View Mode Switcher (hidden in print) */}
      <div className="no-print flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-fit">
        <button
          onClick={() => setReportMode('summary')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            reportMode === 'summary'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Resumo de Envio (Amostras & Caixas)</span>
        </button>

        <button
          onClick={() => setReportMode('standards')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            reportMode === 'standards'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>2. Furos e Padrões QA/QC (OREAS / BLK)</span>
        </button>

        <button
          onClick={() => setReportMode('photos')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            reportMode === 'photos'
              ? 'bg-amber-400 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>3. Relatório de Fotos QA/QC</span>
        </button>

        {onOpenPdfReportModal && (
          <button
            type="button"
            onClick={() => onOpenPdfReportModal(selectedDate === 'all' ? undefined : selectedDate)}
            className="px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-300 border border-amber-500/40 ml-auto sm:ml-2 shadow-sm"
            title="Gerar / Baixar Relatório de Fotos em PDF"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Gerar PDF Fotos</span>
          </button>
        )}
      </div>

      {/* Main Print Area / Report Card */}
      <div className="print-area p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        {/* BRANDING LOGO HEADER ALWAYS AT TOP (ON-SCREEN AND PRINT) */}
        <div className="border border-slate-800 print:border-2 print:border-black p-3 rounded-xl bg-slate-950 print:bg-white mb-4 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AppLogo size={38} className="shrink-0" />
            <div className="flex flex-col text-left leading-none font-sans">
              <span className="text-sm sm:text-base font-black tracking-wider text-white print:text-black uppercase">
                MINING
              </span>
              <span className="text-sm sm:text-base font-black tracking-wider text-amber-400 print:text-black uppercase">
                VENTURES
              </span>
            </div>
          </div>

          <div className="text-center font-sans">
            <h2 className="text-xs sm:text-sm font-black text-white print:text-black tracking-wide uppercase">
              {reportMode === 'summary'
                ? 'Relatório Semanal de Envio para Laboratório'
                : 'Relatório de Furos e Padrões QA/QC (OREAS / BLK)'}
            </h2>
            <p className="text-[10px] font-bold text-amber-300 print:text-black uppercase tracking-wider">
              PROJETO GURUPI • GALPÃO DE TESTEMUNHOS
            </p>
          </div>

          <div className="text-right font-mono shrink-0">
            <span className="text-[9px] text-slate-400 print:text-slate-700 uppercase font-bold block">
              Data de Referência / Envio
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-300 print:text-black">
              {selectedDate === 'all' ? 'Todas as Remessas' : formatDateToPtBR(selectedDate)}
            </span>
          </div>
        </div>

        {/* Summary KPI Ribbon (screen only) */}
        {reportMode === 'summary' && (
          <div className="no-print grid grid-cols-3 gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Amostras</span>
                <div className="text-base font-black font-mono text-emerald-400">{totalSamples}</div>
              </div>
              <PackageCheck className="w-4 h-4 text-emerald-400/60" />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Volumes</span>
                <div className="text-base font-black font-mono text-amber-300">{totalVolumes} vol</div>
              </div>
              <Layers className="w-4 h-4 text-amber-400/60" />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Peso Total</span>
                <div className="text-base font-black font-mono text-purple-300">{totalWeightKg.toFixed(1)} kg</div>
              </div>
              <Weight className="w-4 h-4 text-purple-400/60" />
            </div>
          </div>
        )}

        {/* REPORT MODE 1: SUMMARY TABLE */}
        {reportMode === 'summary' ? (
          <div className="overflow-x-auto">
            <table className="print-table w-full text-center text-xs border-collapse border border-slate-700 bg-slate-950/90 rounded-xl overflow-hidden font-mono">
            <thead>
              <tr className="bg-slate-800 text-slate-100 font-black uppercase text-[10.5px] border-b-2 border-slate-700">
                <th className="py-1.5 px-2.5 border-r border-slate-700 text-center">NAME</th>
                <th className="py-1.5 px-2.5 border-r border-slate-700 text-center">Nº</th>
                <th className="py-1.5 px-2.5 border-r border-slate-700 text-center">FROM</th>
                <th className="py-1.5 px-2.5 border-r border-slate-700 text-center">TO</th>
                <th className="py-1.5 px-2.5 border-r border-slate-700 text-center">SAMPLES</th>
                <th className="py-1.5 px-2.5 border-r border-slate-700 text-center">VOLUMES</th>
                <th className="py-1.5 px-2.5 text-center">KG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-200">
              {reportARs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    Nenhum AR encontrado para o período selecionado.
                  </td>
                </tr>
              ) : (
                reportARs.map((ar) => {
                  const holeCode = ar.drillHoleCode || holes.find((h) => h.id === ar.drillHoleId)?.code || '-';

                  return (
                    <tr key={ar.id} className="hover:bg-slate-900/80 transition-colors">
                      {/* NOME (Furo) */}
                      <td className="py-1 px-2 border-r border-slate-800 font-bold text-white text-center">
                        {onOpenHoleDetailByCode ? (
                          <>
                            <button
                              onClick={() => onOpenHoleDetailByCode(holeCode)}
                              className="no-print hover:text-amber-400 hover:underline transition-colors text-center cursor-pointer"
                            >
                              {holeCode}
                            </button>
                            <span className="hidden print:inline font-bold text-black">
                              {holeCode}
                            </span>
                          </>
                        ) : (
                          <span className="font-bold">{holeCode}</span>
                        )}
                      </td>

                      {/* Nº (AR Code) */}
                      <td className="py-1 px-2 border-r border-slate-800 font-bold text-cyan-300 text-center whitespace-nowrap">
                        {ar.arCode}
                      </td>

                    {/* FROM */}
                    <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-200 whitespace-nowrap">
                      {getNormalizedSampleRanges(ar.sampleRanges, ar.startSampleCode, ar.endSampleCode)
                        .map((r) => r.firstSampleCode)
                        .join(' / ')}
                    </td>

                    {/* TO */}
                    <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-200 whitespace-nowrap">
                      {getNormalizedSampleRanges(ar.sampleRanges, ar.startSampleCode, ar.endSampleCode)
                        .map((r) => r.lastSampleCode)
                        .join(' / ')}
                    </td>

                    {/* AMOSTRAS */}
                    <td className="py-1 px-2 border-r border-slate-800 font-bold text-emerald-400 text-center">
                      {formatPtNumber(ar.sampleCount)}
                    </td>

                    {/* VOLUME */}
                    <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-200">
                      {getARVolumeCount(ar)}
                    </td>

                    {/* KG */}
                    <td className="py-1 px-2 font-bold text-purple-300 text-center">
                      {formatPtNumber(ar.weightKg)}
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>

            {/* TOTAL FOOTER ROW (matching image: Date | TOTAL (colSpan=3) | AMOSTRAS | VOLUME | KG) */}
            {reportARs.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800/90 border-t-2 border-slate-700 font-mono font-black text-white text-xs">
                  <td className="py-1.5 px-2 border-r border-slate-700 text-center font-bold text-slate-200">
                    {reportDateText}
                  </td>
                  <td colSpan={3} className="py-1.5 px-2 border-r border-slate-700 text-center uppercase tracking-wider text-slate-100 font-black">
                    TOTAL
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-700 text-center text-emerald-300 font-extrabold text-sm">
                    {formatPtNumber(totalSamples)}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-700 text-center text-amber-300 font-extrabold text-sm">
                    {formatPtNumber(totalVolumes)}
                  </td>
                  <td className="py-1.5 px-2 text-center text-purple-300 font-extrabold text-sm">
                    {formatPtNumber(totalWeightKg)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        ) : reportMode === 'standards' ? (
          /* REPORT MODE 2: STANDARDS (FUROS & PADRÕES QA/QC) MATCHING REFERENCE IMAGE */
          <div className="overflow-x-auto">
            <table className="print-table w-full text-center text-xs border-collapse border border-slate-700 bg-slate-950/90 rounded-xl overflow-hidden font-mono">
              <thead>
                <tr className="bg-slate-800 text-slate-100 font-black uppercase text-[10.5px] border-b-2 border-slate-700 no-print">
                  <th className="py-1.5 px-2 border-r border-slate-700 text-center w-1/4">FURO / NOME</th>
                  <th className="py-1.5 px-2 border-r border-slate-700 text-center w-1/4">AR / CÓDIGO</th>
                  <th className="py-1.5 px-2 border-r border-slate-700 text-center w-1/4">OREAS</th>
                  <th className="py-1.5 px-2 text-center w-1/4">BLK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium text-slate-200">
                {reportARs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500 italic">
                      Nenhum lote de remessa encontrado para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  reportARs.map((ar) => {
                    const holeCode = ar.drillHoleCode || holes.find((h) => h.id === ar.drillHoleId)?.code || '-';
                    const oreasList = ar.qaqcSamples?.filter((q) => q.type.toUpperCase() === 'OREAS') || [];
                    const blkList = ar.qaqcSamples?.filter((q) => q.type.toUpperCase() === 'BLK') || [];
                    const rowCount = Math.max(oreasList.length, blkList.length);

                    return (
                      <React.Fragment key={ar.id}>
                        {/* BLOCK HEADER ROW (Peach/Light Orange in print, matching reference image) */}
                        <tr className="standards-header-row bg-amber-950/80 text-amber-200 font-black text-xs border-t-2 border-b border-slate-700">
                          <td className="py-1 px-2 border-r border-slate-700 font-extrabold text-center text-amber-100">
                            {holeCode}
                          </td>
                          <td className="py-1 px-2 border-r border-slate-700 font-extrabold text-center text-amber-100">
                            {ar.arCode}
                          </td>
                          <td className="py-1 px-2 border-r border-slate-700 font-extrabold text-center text-amber-100 uppercase">
                            OREAS
                          </td>
                          <td className="py-1 px-2 font-extrabold text-center text-amber-100 uppercase">
                            BLK
                          </td>
                        </tr>

                        {/* DATA ROWS FOR THIS AR */}
                        {rowCount === 0 ? (
                          <tr key={`${ar.id}-qaqc-empty`} className="standards-data-row hover:bg-slate-900/60 transition-colors">
                            <td colSpan={4} className="py-1 px-2 text-center text-slate-500 italic text-[11px] border-b border-slate-800">
                              Sem padrões QA/QC vinculados
                            </td>
                          </tr>
                        ) : (
                          Array.from({ length: rowCount }).map((_, idx) => {
                            const oreasSample = oreasList[idx];
                            const blkSample = blkList[idx];

                            return (
                              <tr key={`${ar.id}-qaqc-${idx}`} className="standards-data-row hover:bg-slate-900/60 transition-colors">
                                {/* Column 1: Empty left cell as in image */}
                                <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-500">
                                  {/* Blank */}
                                </td>

                                {/* Column 2: OREAS Sample Code */}
                                <td className="py-1 px-2 border-r border-slate-800 text-center font-bold text-slate-200">
                                  {oreasSample ? oreasSample.code : ''}
                                </td>

                                {/* Column 3: OREAS Product */}
                                <td className="py-1 px-2 border-r border-slate-800 text-center font-bold text-amber-300">
                                  {oreasSample ? oreasSample.oreasProduct || '-' : ''}
                                </td>

                                {/* Column 4: BLK Sample Code */}
                                <td className="py-1 px-2 text-center font-bold text-slate-200">
                                  {blkSample ? blkSample.code : ''}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
            {/* Printable Photo Appendix when printing Summary or Standards mode */}
            {reportMode !== 'photos' && (() => {
              const printPhotos = photos.filter((p) => reportARs.some((ar) => isPhotoMatchingAR(p, ar)));
              if (printPhotos.length === 0) return null;

              return (
                <div className="hidden print:block mt-6 pt-4 border-t-2 border-black">
                  <div className="bg-slate-200 border border-black p-2 mb-3 flex items-center justify-between font-black text-xs text-black uppercase">
                    <span>COMPROVAÇÃO FOTOGRÁFICA DOS PADRÕES QA/QC DA REMESSA ({printPhotos.length} FOTOS)</span>
                    <span>PROJETO GURUPI</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {printPhotos.map((photo) => {
                      const ar = ars.find((a) => isPhotoMatchingAR(photo, a));
                      const holeCode = ar?.drillHoleCode || holes.find((h) => h.id === ar?.drillHoleId)?.code || '-';
                      const photoSrc = photo.dataUrl || photo.photoUrl || (photo as any).dataUrl || '';
                      const capturedDateStr = photo.capturedAt
                        ? formatDateToPtBR(photo.capturedAt.split('T')[0])
                        : '';

                      return (
                        <div key={photo.id} className="border border-black p-2 rounded bg-white flex flex-col gap-1.5">
                          <div className="aspect-4/3 w-full bg-slate-100 border border-black rounded overflow-hidden flex items-center justify-center">
                            <img
                              src={photoSrc}
                              alt={photo.sampleCode || 'Foto QAQC'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col text-[10px] font-mono text-black leading-tight">
                            <div className="flex items-center justify-between font-bold">
                              <span>PADRÃO: {photo.sampleCode || 'Geral'}</span>
                              <span>TIPO: {photo.sampleType || 'QAQC'}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 text-[9px]">
                              <span>AR: {ar ? getArCodeDisplay(ar.arCode, ar.id) : photo.arCode}</span>
                              <span>Furo: {holeCode}</span>
                            </div>
                            {capturedDateStr && (
                              <span className="text-[8px] text-slate-600">Data: {capturedDateStr}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* REPORT MODE 3: PHOTOS GALLERY & REPORT */
          <div className="flex flex-col gap-6">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Relatório Fotográfico dos Padrões QA/QC
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedDate === 'all'
                      ? 'Exibindo fotos registradas em todas as remessas'
                      : `Fotos vinculadas às remessas de ${formatDateToPtBR(selectedDate)}`}
                  </p>
                </div>
              </div>

              {onOpenPdfReportModal && (
                <button
                  type="button"
                  onClick={() => onOpenPdfReportModal(selectedDate === 'all' ? undefined : selectedDate)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <FileText className="w-4 h-4" />
                  <span>Gerar Relatório PDF Oficial (Fotos)</span>
                </button>
              )}
            </div>

            {(() => {
              const matchingPhotos = photos.filter((p) => reportARs.some((ar) => isPhotoMatchingAR(p, ar)));

              if (matchingPhotos.length === 0) {
                return (
                  <div className="p-10 text-center bg-slate-950/60 border border-slate-800 rounded-xl">
                    <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h5 className="font-bold text-slate-200 text-sm">
                      Nenhuma foto cadastrada para o filtro selecionado
                    </h5>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Você pode tirar ou anexar fotos dos padrões OREAS e BLK diretamente no Plano de Empacotamento das remessas ou gerar o relatório fotográfico em PDF.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                      {reportARs.length > 0 && onOpenPackingPlan && (
                        <button
                          type="button"
                          onClick={() => onOpenPackingPlan(reportARs[0], 'photos')}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center gap-2"
                        >
                          <PlusCircle className="w-4 h-4 text-amber-400" />
                          <span>Anexar Fotos em {reportARs[0].arCode}</span>
                        </button>
                      )}

                      {onOpenPdfReportModal && (
                        <button
                          type="button"
                          onClick={() => onOpenPdfReportModal(selectedDate === 'all' ? undefined : selectedDate)}
                          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Abrir Gerador de PDF de Fotos</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-3">
                  {matchingPhotos.map((photo) => {
                    const ar = ars.find((a) => a.id === photo.arId);
                    const holeCode = ar?.drillHoleCode || holes.find((h) => h.id === ar?.drillHoleId)?.code || '-';
                    const photoSrc = photo.dataUrl || photo.photoUrl || (photo as any).dataUrl || '';
                    const capturedDateStr = photo.capturedAt
                      ? formatDateToPtBR(photo.capturedAt.split('T')[0])
                      : (photo as any).timestamp
                      ? formatDateToPtBR(String((photo as any).timestamp).split('T')[0])
                      : '';

                    return (
                      <div
                        key={photo.id}
                        className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-md flex flex-col group hover:border-amber-500/50 transition-all print:bg-white print:border-black print:text-black print:shadow-none"
                      >
                        <div className="relative aspect-video bg-slate-900 overflow-hidden print:bg-slate-100">
                          <img
                            src={photoSrc}
                            alt={photo.sampleCode || 'Foto QAQC'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 print:bg-slate-200 print:text-black backdrop-blur-xs text-amber-300 text-[10px] font-black uppercase border border-slate-700 print:border-black">
                            {photo.sampleType || 'QAQC'}
                          </span>
                          {capturedDateStr && (
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/90 print:bg-slate-200 print:text-black backdrop-blur-xs text-slate-300 text-[10px] font-mono border border-slate-700 print:border-black">
                              {capturedDateStr}
                            </span>
                          )}
                        </div>

                        <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between print:p-2">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-white print:text-black text-xs">
                                {photo.sampleCode || 'Geral'}
                              </span>
                              {(photo as any).oreasProduct && (
                                <span className="font-mono text-[10px] font-bold text-amber-400 print:text-black bg-amber-950/60 print:bg-slate-200 px-1.5 py-0.5 rounded border border-amber-800 print:border-black">
                                  {(photo as any).oreasProduct}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 print:text-slate-800 font-mono mt-1 flex items-center justify-between">
                              <span>Furo: <strong className="text-slate-200 print:text-black">{holeCode}</strong></span>
                              <span>AR: <strong className="text-cyan-400 print:text-black">{ar?.arCode}</strong></span>
                            </div>
                            {(photo as any).caption && (
                              <p className="text-[11px] text-slate-300 print:text-slate-800 italic mt-1.5 line-clamp-2">
                                "{(photo as any).caption}"
                              </p>
                            )}
                          </div>

                          {ar && onOpenPackingPlan && (
                            <button
                              type="button"
                              onClick={() => onOpenPackingPlan(ar, 'photos')}
                              className="no-print mt-2 w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-[10px] border border-slate-800 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Ver no Lote {ar.arCode}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Footer info (hidden in print) */}
        <div className="no-print mt-8 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>Galpão de Testemunhos • Controle de Amostragem & QA/QC</span>
          <span>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};

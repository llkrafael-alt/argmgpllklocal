import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileText,
  X,
  Printer,
  Download,
  Copy,
  Check,
  Boxes,
  AlertTriangle,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { OreasStockEntry, SampleShipmentAR, User } from '../types';
import { calculateOreasBalances, OreasStockSummaryItem } from '../utils/oreasStock';
import { formatDateToPtBR } from '../utils/calculator';
import { AppLogo } from './AppLogo';

interface OreasStockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  oreasStockEntries: OreasStockEntry[];
  ars: SampleShipmentAR[];
  activeUser: User;
}

export const OreasStockReportModal: React.FC<OreasStockReportModalProps> = ({
  isOpen,
  onClose,
  oreasStockEntries,
  ars,
  activeUser,
}) => {
  const [reportType, setReportType] = useState<'synthetic' | 'analytic'>('synthetic');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NORMAL' | 'LOW' | 'OUT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const emissionDateStr = now.toLocaleDateString('pt-BR');
  const emissionTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Calculate balances from utility
  const allSummaries = calculateOreasBalances(oreasStockEntries, ars);

  // Filter items
  const filteredSummaries = allSummaries.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.entries.some((e) => (e.lotOrNotes || '').toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'NORMAL') return item.status === 'normal';
    if (statusFilter === 'LOW') return item.status === 'low';
    if (statusFilter === 'OUT') return item.status === 'out_of_stock';
    return true;
  });

  // KPI Calculations
  const totalCodesCount = allSummaries.length;
  const totalStockBalance = allSummaries.reduce((sum, item) => sum + item.currentStock, 0);
  const totalReceivedCount = allSummaries.reduce((sum, item) => sum + item.totalReceived, 0);
  const totalUsedCount = allSummaries.reduce((sum, item) => sum + item.totalUsed, 0);
  const lowStockCount = allSummaries.filter((item) => item.status === 'low').length;
  const outOfStockCount = allSummaries.filter((item) => item.status === 'out_of_stock').length;

  // Handle Browser Native Print
  const handlePrint = () => {
    document.body.classList.add('print-oreas-report-active');
    const cleanup = () => {
      document.body.classList.remove('print-oreas-report-active');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2500);
    window.print();
  };

  // Copy to Clipboard (TSV format for Excel / Google Sheets)
  const handleCopyToClipboard = () => {
    let tsv = '';
    tsv += `ARGMGP - G MINING VENTURES / PROJETO GURUPI\n`;
    tsv += `RELATÓRIO DE ESTOQUE E BALANÇO DE PADRÕES OREAS (CRM)\n`;
    tsv += `Data de Emissão:\t${emissionDateStr} ${emissionTimeStr}\n`;
    tsv += `Responsável:\t${activeUser.name} (${activeUser.role || 'Usuário'})\n`;
    tsv += `Tipo de Relatório:\t${reportType === 'synthetic' ? 'Sintético (Balanço)' : 'Analítico (Movimentações)'}\n\n`;

    tsv += `PRODUTO OREAS\tENTRADAS (UN)\tBAIXAS/ARs (UN)\tSALDO ATUAL (UN)\tSTATUS\tÚLTIMO LOTE/OBS\n`;

    filteredSummaries.forEach((item) => {
      const statusLabel =
        item.status === 'out_of_stock'
          ? 'ZERADO/CRÍTICO'
          : item.status === 'low'
          ? 'ESTOQUE BAIXO'
          : 'NORMAL';

      const latestLot = item.entries[0]?.lotOrNotes || '-';
      tsv += `${item.code}\t${item.totalReceived}\t${item.totalUsed}\t${item.currentStock}\t${statusLabel}\t${latestLot}\n`;
    });

    tsv += `TOTAL\t${totalReceivedCount}\t${totalUsedCount}\t${totalStockBalance}\t\t\n`;

    if (reportType === 'analytic') {
      tsv += `\n--- DETALHAMENTO DE MOVIMENTAÇÕES DE SAÍDA (BAIXAS POR AR) ---\n`;
      tsv += `DATA ENVIO\tPRODUTO OREAS\tNº AR\tFURO\tCÓD. AMOSTRA\tQUANTIDADE\tRESPONSÁVEL\n`;

      filteredSummaries.forEach((item) => {
        item.usages.forEach((u) => {
          tsv += `${formatDateToPtBR(u.shipmentDate)}\t${item.code}\t${u.arCode}\t${u.drillHoleCode}\t${u.sampleCode || '-'}\t${u.quantityUsed}\t${u.userName || '-'}\n`;
        });
      });
    }

    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // Download CSV format
  const handleExportCSV = () => {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    csv += `PRODUTO OREAS;ENTRADAS (UN);BAIXAS AR (UN);SALDO ATUAL (UN);STATUS;ULTIMO LOTE OBS\n`;

    filteredSummaries.forEach((item) => {
      const statusLabel =
        item.status === 'out_of_stock'
          ? 'ZERADO/CRÍTICO'
          : item.status === 'low'
          ? 'ESTOQUE BAIXO'
          : 'NORMAL';

      const latestLot = (item.entries[0]?.lotOrNotes || '-').replace(/;/g, ',');
      csv += `"${item.code}";${item.totalReceived};${item.totalUsed};${item.currentStock};"${statusLabel}";"${latestLot}"\n`;
    });

    csv += `"TOTAL GERAL";${totalReceivedCount};${totalUsedCount};${totalStockBalance};"";""\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Estoque_OREAS_${emissionDateStr.replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Download PDF using jsPDF
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 14;

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(10, y, pageWidth - 20, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('ARGMGP – G MINING VENTURES / PROJETO GURUPI', 15, y + 8);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text('RELATÓRIO DE BALANÇO E CONTROLE DE ESTOQUE - PADRÕES OREAS (CRM)', 15, y + 15);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Emissão: ${emissionDateStr} às ${emissionTimeStr} | Responsável: ${activeUser.name}`, 15, y + 20);

      y += 30;

      // KPI boxes
      const kpiWidth = (pageWidth - 20 - 9) / 4;
      const kpis = [
        { label: 'Padrões Cadastrados', val: `${totalCodesCount} códigos`, color: [100, 116, 139] },
        { label: 'Saldo Total em Galpão', val: `${totalStockBalance} un.`, color: [16, 185, 129] },
        { label: 'Total Recebido (Entradas)', val: `${totalReceivedCount} un.`, color: [59, 130, 246] },
        { label: 'Total Utilizado (ARs)', val: `${totalUsedCount} un.`, color: [245, 158, 11] },
      ];

      kpis.forEach((kpi, idx) => {
        const xPos = 10 + idx * (kpiWidth + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(xPos, y, kpiWidth, 14, 'FD');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label.toUpperCase(), xPos + 2.5, y + 5);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(kpi.val, xPos + 2.5, y + 11);
      });

      y += 19;

      // Table Header
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(10, y, pageWidth - 20, 7, 'F');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);

      doc.text('PRODUTO OREAS', 14, y + 5);
      doc.text('ENTRADAS (UN)', 65, y + 5);
      doc.text('UTILIZADO / AR (UN)', 100, y + 5);
      doc.text('SALDO ATUAL', 140, y + 5);
      doc.text('STATUS', 170, y + 5);

      y += 7;

      // Table Rows
      filteredSummaries.forEach((item, index) => {
        if (y > pageHeight - 35) {
          doc.addPage();
          y = 15;
          // Subheader in new page
          doc.setFillColor(30, 41, 59);
          doc.rect(10, y, pageWidth - 20, 7, 'F');
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('PRODUTO OREAS', 14, y + 5);
          doc.text('ENTRADAS (UN)', 65, y + 5);
          doc.text('UTILIZADO / AR (UN)', 100, y + 5);
          doc.text('SALDO ATUAL', 140, y + 5);
          doc.text('STATUS', 170, y + 5);
          y += 7;
        }

        const isEven = index % 2 === 0;
        doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
        doc.rect(10, y, pageWidth - 20, 6.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(item.code, 14, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`${item.totalReceived} un`, 65, y + 4.5);
        doc.text(`${item.totalUsed} un`, 100, y + 4.5);

        // Saldo
        doc.setFont('helvetica', 'bold');
        if (item.currentStock <= 0) {
          doc.setTextColor(220, 38, 38);
        } else if (item.currentStock <= 5) {
          doc.setTextColor(217, 119, 6);
        } else {
          doc.setTextColor(5, 150, 105);
        }
        doc.text(`${item.currentStock} un`, 140, y + 4.5);

        // Status
        const statusText =
          item.status === 'out_of_stock'
            ? 'ZERADO'
            : item.status === 'low'
            ? 'BAIXO ESTOQUE'
            : 'NORMAL';
        doc.text(statusText, 170, y + 4.5);

        y += 6.5;
      });

      // Total summary line
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y, pageWidth - 20, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('TOTAL CONSOLIDADO', 14, y + 5);
      doc.text(`${totalReceivedCount} un`, 65, y + 5);
      doc.text(`${totalUsedCount} un`, 100, y + 5);
      doc.setTextColor(5, 150, 105);
      doc.text(`${totalStockBalance} un`, 140, y + 5);

      y += 18;

      // Signatures
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 25;
      }

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);

      // Line 1
      doc.line(20, y + 10, 85, y + 10);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('RESPONSÁVEL PELO ESTOQUE QA/QC', 24, y + 14);
      doc.setFont('helvetica', 'normal');
      doc.text(`${activeUser.name} (${activeUser.role || 'Galpão'})`, 24, y + 18);

      // Line 2
      doc.line(pageWidth - 85, y + 10, pageWidth - 20, y + 10);
      doc.setFont('helvetica', 'bold');
      doc.text('SUPERVISÃO DE GEOLOGIA / PROJETO', pageWidth - 80, y + 14);
      doc.setFont('helvetica', 'normal');
      doc.text('G Mining Ventures - Projeto Gurupi', pageWidth - 80, y + 18);

      doc.save(`Relatorio_Estoque_OREAS_${emissionDateStr.replace(/\//g, '-')}.pdf`);
    } catch (e) {
      console.error('Erro ao gerar PDF do relatório OREAS:', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:static print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block">
      {/* Outer Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-4 max-h-[94vh] flex flex-col print:static print:border-none print:shadow-none print:bg-transparent print:p-0 print:m-0 print:max-w-full print:rounded-none print:overflow-visible print:block">
        {/* Modal Top Header (No print) */}
        <div className="no-print flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Relatório de Estoque de OREAS</h3>
                <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800/80 font-mono px-2 py-0.5 rounded-full font-bold">
                  CRM & Padrões
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Balanço geral de entradas, baixas por AR e saldos disponíveis para controle de qualidade
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
              title="Imprimir relatório formatado via navegador"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-950/40"
              title="Baixar arquivo em formato PDF com timbrado"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isExportingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>

            <button
              onClick={handleCopyToClipboard}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
              title="Copiar para colar no Excel ou Google Sheets"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar Excel'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
              title="Baixar planilha CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Mode Bar (No print) */}
        <div className="no-print p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setReportType('synthetic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                reportType === 'synthetic'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Visão Sintética (Saldos)
            </button>
            <button
              type="button"
              onClick={() => setReportType('analytic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                reportType === 'analytic'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Visão Analítica (Movimentações)
            </button>
          </div>

          {/* Status filter buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({allSummaries.length})
              </button>
              <button
                onClick={() => setStatusFilter('NORMAL')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  statusFilter === 'NORMAL' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Normal ({allSummaries.filter((s) => s.status === 'normal').length})
              </button>
              <button
                onClick={() => setStatusFilter('LOW')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  statusFilter === 'LOW' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Baixo ({lowStockCount})
              </button>
              <button
                onClick={() => setStatusFilter('OUT')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  statusFilter === 'OUT' ? 'bg-red-950 text-red-300 border border-red-800' : 'text-slate-400 hover:text-red-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Zerado ({outOfStockCount})
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Printable Report Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 print:static print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block" id="oreas-printable-report">
          {/* Printable Document Paper Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6 text-slate-100">
            {/* Document Official Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
              <div className="flex items-center gap-3">
                <AppLogo className="w-12 h-12 shrink-0" />
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase font-mono">
                    G MINING VENTURES - PROJETO GURUPI
                  </h2>
                  <h3 className="text-sm font-bold text-purple-400 mt-0.5">
                    RELATÓRIO DE BALANÇO E CONTROLE DE ESTOQUE DE PADRÕES OREAS
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Laboratório e Galpão de Testemunhos • Amostragem e Controle de Qualidade QA/QC
                  </p>
                </div>
              </div>

              <div className="sm:text-right text-xs text-slate-400 space-y-1 font-mono">
                <div>
                  <span className="text-slate-400">Data de Emissão: </span>
                  <strong className="text-white">{emissionDateStr} às {emissionTimeStr}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Emitido por: </span>
                  <strong className="text-purple-300">{activeUser.name}</strong>
                  <span className="text-slate-400"> ({activeUser.role || 'Usuário'})</span>
                </div>
                <div>
                  <span className="text-slate-400">Status Geral: </span>
                  <span className={`font-bold ${outOfStockCount > 0 ? 'text-red-400' : lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {outOfStockCount > 0 ? 'Reabastecimento Urgente' : lowStockCount > 0 ? 'Estoque Parcial em Atenção' : 'Estoque Adequado'}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Padrões Auditados</span>
                <span className="text-xl font-black font-mono text-white mt-1">{totalCodesCount} códigos</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Cadastrados no sistema</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Saldo Total em Galpão</span>
                <span className="text-xl font-black font-mono text-emerald-400 mt-1">{totalStockBalance} un.</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Sachês disponíveis</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Entradas Acumuladas</span>
                <span className="text-xl font-black font-mono text-cyan-400 mt-1">{totalReceivedCount} un.</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Total de reabastecimentos</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Baixas Efetivas (ARs)</span>
                <span className="text-xl font-black font-mono text-amber-400 mt-1">{totalUsedCount} un.</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Consumo em remessas</span>
              </div>
            </div>

            {/* Alert warnings if low/critical items */}
            {(outOfStockCount > 0 || lowStockCount > 0) && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-amber-300 font-bold">Aviso de Gestão de Materiais de Referência: </strong>
                  <span className="text-slate-300">
                    Foram identificados <strong>{outOfStockCount} produto(s) com saldo zerado</strong> e{' '}
                    <strong>{lowStockCount} produto(s) com estoque baixo</strong> (≤ 5 unidades). Solicitar novo lote de sachês ao setor de suprimentos/QA/QC para não interromper os envios de rotina.
                  </span>
                </div>
              </div>
            )}

            {/* Main Stock Table */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-purple-400" />
                  <span>Balanço Consolidado por Produto OREAS</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  Exibindo <strong>{filteredSummaries.length}</strong> de <strong>{allSummaries.length}</strong> produtos
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Produto OREAS</th>
                      <th className="py-2.5 px-3">Último Lote / Obs</th>
                      <th className="py-2.5 px-3 text-right">Entradas</th>
                      <th className="py-2.5 px-3 text-right">Baixas (ARs)</th>
                      <th className="py-2.5 px-3 text-right">Saldo Atual</th>
                      <th className="py-2.5 px-3 text-center">Nível / Status</th>
                      <th className="py-2.5 px-3 text-right">Última Entrada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Nenhum produto OREAS localizado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredSummaries.map((item) => {
                        const latestEntry = item.entries[0];
                        const latestLot = latestEntry?.lotOrNotes || '-';
                        const latestEntryDate = latestEntry?.date ? formatDateToPtBR(latestEntry.date) : '-';

                        return (
                          <tr key={item.code} className="hover:bg-slate-900/60 transition-colors">
                            {/* Product Code */}
                            <td className="py-2.5 px-3 font-mono font-bold text-white flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-purple-300 flex items-center justify-center text-xs shrink-0 font-bold">
                                {item.code.substring(0, 3)}
                              </span>
                              <span>{item.code}</span>
                            </td>

                            {/* Lot */}
                            <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] max-w-[150px] truncate" title={latestLot}>
                              {latestLot}
                            </td>

                            {/* Received */}
                            <td className="py-2.5 px-3 font-mono font-bold text-cyan-400 text-right">
                              +{item.totalReceived} un
                            </td>

                            {/* Used */}
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-400 text-right">
                              -{item.totalUsed} un
                            </td>

                            {/* Current Stock */}
                            <td className="py-2.5 px-3 font-mono font-black text-right text-sm">
                              <span
                                className={
                                  item.currentStock <= 0
                                    ? 'text-red-400'
                                    : item.currentStock <= 5
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {item.currentStock} un
                              </span>
                            </td>

                            {/* Status badge */}
                            <td className="py-2.5 px-3 text-center">
                              {item.status === 'out_of_stock' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold">
                                  <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                                  ZERADO
                                </span>
                              )}
                              {item.status === 'low' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                  BAIXO
                                </span>
                              )}
                              {item.status === 'normal' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                                  OK
                                </span>
                              )}
                            </td>

                            {/* Latest Entry Date */}
                            <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[11px]">
                              {latestEntryDate}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredSummaries.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-700 bg-slate-900/95 font-bold text-xs text-white">
                        <td className="py-3 px-3 uppercase">Total Consolidado</td>
                        <td className="py-3 px-3 text-slate-400">-</td>
                        <td className="py-3 px-3 font-mono text-cyan-400 text-right">+{totalReceivedCount} un</td>
                        <td className="py-3 px-3 font-mono text-amber-400 text-right">-{totalUsedCount} un</td>
                        <td className="py-3 px-3 font-mono text-emerald-400 text-right text-sm">{totalStockBalance} un</td>
                        <td colSpan={2} className="py-3 px-3 text-right text-[11px] text-slate-400">
                          {outOfStockCount > 0 ? `${outOfStockCount} em falta` : 'Sem falta crítica'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Analytic Section: Recent Movements / AR Usages if analytic mode */}
            {reportType === 'analytic' && (
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span>Extrato Detalhado de Baixas em Remessas (ARs)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Rastreabilidade completa de consumo por envio</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Data do Envio</th>
                        <th className="py-2.5 px-3">Produto OREAS</th>
                        <th className="py-2.5 px-3">Nº AR</th>
                        <th className="py-2.5 px-3">Furo</th>
                        <th className="py-2.5 px-3">Cód. Amostra</th>
                        <th className="py-2.5 px-3 text-right">Qtd Baixa</th>
                        <th className="py-2.5 px-3">Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredSummaries.flatMap((item) =>
                        item.usages.map((u, i) => (
                          <tr key={`${item.code}-${u.arId}-${i}`} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-2 px-3 font-mono text-slate-300 text-[11px]">
                              {formatDateToPtBR(u.shipmentDate)}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-purple-300">{item.code}</td>
                            <td className="py-2 px-3 font-mono font-bold text-cyan-400">{u.arCode}</td>
                            <td className="py-2 px-3 font-mono text-slate-300">{u.drillHoleCode}</td>
                            <td className="py-2 px-3 font-mono text-amber-300">{u.sampleCode || '-'}</td>
                            <td className="py-2 px-3 font-mono font-bold text-red-400 text-right">
                              -{u.quantityUsed} un
                            </td>
                            <td className="py-2 px-3 text-slate-300 text-[11px]">{u.userName || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Document Signature Block (Professional Audit) */}
            <div className="pt-8 mt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-slate-400">
              <div className="flex flex-col items-center text-center">
                <div className="w-64 border-b border-slate-700 pb-1 mb-2" />
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  {activeUser.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {activeUser.role || 'Responsável pelo Galpão de Amostras'} • G Mining Ventures
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">Assinatura / Conferência Física</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-64 border-b border-slate-700 pb-1 mb-2" />
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Supervisão de Geologia & QA/QC
                </span>
                <span className="text-[10px] text-slate-400">
                  Controle de Qualidade Analítica • Projeto Gurupi
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">Validação Técnica</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer (No print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <p className="text-[11px] text-slate-400">
            💡 Dica: Você pode imprimir diretamente no navegador em folha A4 ou baixar em PDF / Excel para envio semanal.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};

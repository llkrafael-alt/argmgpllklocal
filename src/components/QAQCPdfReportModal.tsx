import React, { useState, useEffect } from 'react';
import { SampleShipmentAR, QAQCSamplePhoto, DrillHole } from '../types';
import { jsPDF } from 'jspdf';
import {
  FileText,
  X,
  Printer,
  Download,
  Calendar,
  Package,
  Camera,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  formatDateToPtBR,
  getArCodeDisplay,
  isPhotoMatchingAR,
  sortARsBySequence,
  deduplicatePhotos,
  getARVolumeCount,
  getNormalizedSampleRanges,
} from '../utils/calculator';
import { AppLogo } from './AppLogo';

interface QAQCPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  ars: SampleShipmentAR[];
  holes: DrillHole[];
  photos: QAQCSamplePhoto[];
  defaultDate?: string;
}

export const QAQCPdfReportModal: React.FC<QAQCPdfReportModalProps> = ({
  isOpen,
  onClose,
  ars,
  holes,
  photos,
  defaultDate,
}) => {
  const normalizeDate = (d?: string | null) => {
    if (!d) return '';
    if (d === 'ALL' || d === 'all') return 'ALL';
    return d.split('T')[0].trim();
  };

  // Available shipment dates from ARs
  const availableDates: string[] = Array.from<string>(
    new Set<string>(
      ars
        .map((a) => normalizeDate(a.shipmentDate))
        .filter((d): d is string => Boolean(d) && d !== 'ALL')
    )
  )
    .sort()
    .reverse();

  const [selectedDate, setSelectedDate] = useState<string>(
    normalizeDate(defaultDate) || availableDates[0] || 'ALL'
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Sync selectedDate whenever defaultDate or isOpen changes
  useEffect(() => {
    if (isOpen) {
      const normDefault = defaultDate ? normalizeDate(defaultDate) : '';
      if (normDefault) {
        setSelectedDate(normDefault);
      } else if (availableDates.length > 0) {
        setSelectedDate(availableDates[0]);
      } else {
        setSelectedDate('ALL');
      }
    }
  }, [isOpen, defaultDate]);

  const cleanSelectedDate = normalizeDate(selectedDate);

  // Filter ARs matching selected shipment date & sort ascending by AR sequence number (smallest to largest)
  const rawFilteredARs: SampleShipmentAR[] =
    !cleanSelectedDate || cleanSelectedDate === 'ALL' || cleanSelectedDate === 'all'
      ? ars
      : ars.filter((a) => normalizeDate(a.shipmentDate) === cleanSelectedDate);

  const filteredARs: SampleShipmentAR[] = sortARsBySequence<SampleShipmentAR>(rawFilteredARs);

  // Group photos by AR for the selected date and deduplicate photos
  const arGroupedData = filteredARs.map((ar) => {
    const rawArPhotos = photos.filter((p) => isPhotoMatchingAR(p, ar));
    const arPhotos = deduplicatePhotos(rawArPhotos);
    const hole = holes.find((h) => h.id === ar.drillHoleId);
    return {
      ar,
      hole,
      photos: arPhotos,
    };
  });

  const totalPhotosForDate = arGroupedData.reduce((acc, item) => acc + item.photos.length, 0);

  useEffect(() => {
    if (isOpen) {
      console.log('[QAQCPdfReportModal DIAGNOSTIC LOG]', {
        selectedDate: cleanSelectedDate,
        totalARsCount: ars.length,
        filteredARsCount: filteredARs.length,
        totalPhotosInState: photos.length,
        matchedPhotosCount: totalPhotosForDate,
        groupedDetails: arGroupedData.map((g) => ({
          arId: g.ar.id,
          arCode: g.ar.arCode,
          shipmentDate: g.ar.shipmentDate,
          matchedPhotos: g.photos.map((p) => ({ id: p.id, arId: p.arId, arCode: p.arCode, sampleCode: p.sampleCode })),
        })),
      });
    }
  }, [isOpen, cleanSelectedDate, ars, photos, totalPhotosForDate]);

  if (!isOpen) return null;

  // Helper to convert Image URL to Base64 Image element & measure aspect ratio for jsPDF
  const loadImageAsBase64 = async (primaryUrl: string, fallbackUrl?: string): Promise<string> => {
    const urlToTry = primaryUrl || fallbackUrl || '';
    if (!urlToTry) return '';
    if (urlToTry.startsWith('data:image/')) return urlToTry;

    const fallbackBase64 = fallbackUrl && fallbackUrl.startsWith('data:image/') ? fallbackUrl : '';

    try {
      const response = await fetch(urlToTry);
      if (response.ok) {
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
        if (base64 && base64.startsWith('data:image/')) {
          return base64;
        }
      }
    } catch (e) {
      console.warn('[PDF] Fetch blob image conversion failed, trying Image Canvas fallback:', e);
    }

    if (fallbackBase64) return fallbackBase64;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
            resolve(dataUrl);
          } else {
            resolve(fallbackBase64);
          }
        } catch (e) {
          console.error('Error converting image to canvas base64:', e);
          resolve(fallbackBase64);
        }
      };
      img.onerror = () => {
        resolve(fallbackBase64);
      };
      img.src = urlToTry;
    });
  };

  const loadFullImageDetails = async (primaryUrl: string, fallbackUrl?: string) => {
    const base64 = await loadImageAsBase64(primaryUrl, fallbackUrl);
    if (!base64) return null;

    return new Promise<{ base64: string; width: number; height: number; format: 'PNG' | 'JPEG' }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width || 800;
        const h = img.naturalHeight || img.height || 600;
        const format = base64.toLowerCase().includes('png') ? 'PNG' : 'JPEG';
        resolve({ base64, width: w, height: h, format });
      };
      img.onerror = () => {
        resolve({ base64, width: 800, height: 600, format: 'JPEG' });
      };
      img.src = base64;
    });
  };

  // Generate jsPDF Downloadable Report (Official Document + Compiled Photo Album)
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

      const displayDateStr = selectedDate === 'ALL' || selectedDate === 'all'
        ? 'Todas as Datas'
        : formatDateToPtBR(selectedDate);

      // Filter groups that have photos
      const activeGroups = arGroupedData.filter((g) => g.photos.length > 0);

      if (activeGroups.length === 0) {
        // Document Header Banner only (no photos attached)
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(10, 10, pageWidth - 20, 22, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('G MINING VENTURES - PROJETO GURUPI', 15, 19);

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(203, 213, 225);
        doc.text('RELATÓRIO OFICIAL DE FOTOS QA/QC', 15, 26);

        doc.setFontSize(8.5);
        doc.setTextColor(234, 179, 8); // gold
        doc.setFont('helvetica', 'bold');
        doc.text(`Data: ${displayDateStr}`, pageWidth - 15, 19, { align: 'right' });
        doc.setTextColor(226, 232, 240);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total ARs: ${filteredARs.length}  •  Fotos Anexadas: 0`, pageWidth - 15, 26, { align: 'right' });

        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.text('Nenhum registro fotográfico de padrão QA/QC anexado para este período.', pageWidth / 2, 70, { align: 'center' });
      } else {
        let pageCount = 0;

        for (const item of activeGroups) {
          const loadedPhotos = [];
          for (const p of item.photos) {
            const details = await loadFullImageDetails(p.dataUrl || p.photoUrl, p.photoUrl);
            if (details) {
              loadedPhotos.push({
                ...p,
                imageDetails: details,
              });
            }
          }

          if (loadedPhotos.length === 0) continue;

          const holeCode = item.ar.drillHoleCode || holes.find((h) => h.id === item.ar.drillHoleId)?.code || '-';
          const ranges = getNormalizedSampleRanges(item.ar.sampleRanges, item.ar.startSampleCode, item.ar.endSampleCode);
          const sampleRangeStr = ranges.length > 0
            ? ranges.map((r) => `${r.firstSampleCode} a ${r.lastSampleCode}`).join(' / ')
            : (item.ar.startSampleCode && item.ar.endSampleCode ? `${item.ar.startSampleCode} a ${item.ar.endSampleCode}` : 'Amostras gerais');

          // Chunk photos into pages (up to 2 photos stacked vertically per page)
          for (let i = 0; i < loadedPhotos.length; i += 2) {
            const pagePhotos = loadedPhotos.slice(i, i + 2);
            pageCount++;

            if (pageCount > 1) {
              doc.addPage();
            }

            let startY = 10;

            // On Page 1: Main Document Header Banner
            if (pageCount === 1) {
              doc.setFillColor(15, 23, 42); // slate-900
              doc.rect(10, 10, pageWidth - 20, 22, 'F');

              doc.setTextColor(255, 255, 255);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(13);
              doc.text('G MINING VENTURES - PROJETO GURUPI', 15, 19);

              doc.setFontSize(9.5);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(203, 213, 225);
              doc.text('RELATÓRIO OFICIAL DE FOTOS QA/QC', 15, 26);

              doc.setFontSize(8.5);
              doc.setTextColor(234, 179, 8); // gold
              doc.setFont('helvetica', 'bold');
              doc.text(`Data: ${displayDateStr}`, pageWidth - 15, 19, { align: 'right' });
              doc.setTextColor(226, 232, 240);
              doc.setFont('helvetica', 'normal');
              doc.text(`Total ARs: ${filteredARs.length}  •  Fotos Anexadas: ${totalPhotosForDate}`, pageWidth - 15, 26, { align: 'right' });

              startY = 35;
            }

            // AR Group Header Bar: código do AR, furo, faixa de amostras
            doc.setFillColor(30, 41, 59); // slate-800
            doc.rect(10, startY, pageWidth - 20, 9, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text(`AR: ${item.ar.arCode}  •  FURO: ${holeCode}`, 14, startY + 6);

            doc.setTextColor(147, 197, 253); // blue-300
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(`Faixa: ${sampleRangeStr} (${loadedPhotos.length} foto${loadedPhotos.length > 1 ? 's' : ''})`, pageWidth - 14, startY + 6, { align: 'right' });

            const availableH = pageHeight - (startY + 11) - 10;
            const slotMaxH = Math.min(125, (availableH - 5) / 2);

            const slots = [
              { slotY: startY + 12, maxH: slotMaxH },
              { slotY: startY + 12 + slotMaxH + 5, maxH: slotMaxH },
            ];

            pagePhotos.forEach((p, idx) => {
              const slot = slots[idx];
              const img = p.imageDetails;
              const maxW = 190;
              const bannerH = 7;
              const maxH = slot.maxH - bannerH - 2;
              const aspectRatio = img.width / img.height;

              let w = maxW;
              let h = maxW / aspectRatio;
              if (h > maxH) {
                h = maxH;
                w = maxH * aspectRatio;
              }

              const x = (pageWidth - w) / 2;
              const y = slot.slotY + bannerH + (maxH - h) / 2;

              // Photo card background & border
              doc.setDrawColor(203, 213, 225);
              doc.setFillColor(248, 250, 252);
              doc.rect((pageWidth - maxW) / 2, slot.slotY, maxW, slot.maxH, 'FD');

              // Photo label banner inside card
              doc.setFillColor(15, 23, 42);
              doc.rect((pageWidth - maxW) / 2, slot.slotY, maxW, bannerH, 'F');

              doc.setTextColor(255, 255, 255);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              const sampleInfo = `Padrão: ${p.sampleCode || 'QA/QC'} (${p.sampleType || 'GERAL'})` +
                ((p as any).oreasProduct ? ` • ${(p as any).oreasProduct}` : '');
              doc.text(sampleInfo, (pageWidth - maxW) / 2 + 3, slot.slotY + 4.8);

              const captureDateStr = p.capturedAt ? formatDateToPtBR(p.capturedAt.split('T')[0]) : '';
              if (captureDateStr) {
                doc.setTextColor(203, 213, 225);
                doc.setFont('helvetica', 'normal');
                doc.text(`Data: ${captureDateStr}`, (pageWidth - maxW) / 2 + maxW - 3, slot.slotY + 4.8, { align: 'right' });
              }

              // Render photo
              doc.addImage(img.base64, img.format, x, y, w, h);
            });

            // Page Footer
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'normal');
            doc.text(
              `Relatório Oficial de Fotos QA/QC • ${item.ar.arCode} • Projeto Gurupi`,
              10,
              pageHeight - 4
            );
            doc.text(
              `Página ${pageCount}`,
              pageWidth - 10,
              pageHeight - 4,
              { align: 'right' }
            );
          }
        }
      }

      // Save document
      doc.save(`Relatorio_QAQC_GMINING_${selectedDate === 'ALL' ? 'Geral' : selectedDate}.pdf`);
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      alert(`Erro ao gerar PDF: ${err?.message || 'Falha ao processar imagens'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] h-fit">
        {/* Top Header Toolbar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                Relatório de Fotos QA/QC por Data de Envio
              </h3>
              <p className="text-[11px] text-slate-400">
                Compilação e agrupamento de registros fotográficos de padrões por AR
              </p>
            </div>
          </div>

          {/* Date Selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Selector Dropdown & Calendar Picker */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-300 font-bold uppercase text-[10px] shrink-0">Data do Envio:</span>

              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-800 text-cyan-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-700 outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">Todas as Datas ({ars.length} ARs)</option>
                {availableDates.map((dateStr) => {
                  const countForDate = ars.filter((a) => normalizeDate(a.shipmentDate) === dateStr).length;
                  return (
                    <option key={dateStr} value={dateStr}>
                      {formatDateToPtBR(dateStr)} ({countForDate} ARs)
                    </option>
                  );
                })}
              </select>

              <input
                type="date"
                value={selectedDate !== 'ALL' && selectedDate !== 'all' ? selectedDate : ''}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="bg-slate-800 text-slate-200 font-mono font-bold text-xs px-2 py-0.5 rounded-lg border border-slate-700 outline-none cursor-pointer"
                title="Ou selecione uma data específica no calendário"
              />
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body View Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950 flex flex-col items-center gap-6 grow min-h-0">
          <div className="w-full max-w-[800px] flex items-center justify-between text-xs text-slate-400 font-mono no-print">
            <span>Compilado Fotográfico do Envio: <strong className="text-white">{formatDateToPtBR(selectedDate)}</strong></span>
            <span>Total de Fotos: <strong className="text-cyan-400">{totalPhotosForDate}</strong></span>
          </div>

          <div
            id="printable-qaqc-photo-album"
            className="w-full max-w-[800px] flex flex-col gap-8 items-center"
          >
            {/* Main Document Header Banner (Present in preview and print) */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4 text-white print:border print:border-slate-800 print:bg-slate-900 print:rounded-none">
              <div>
                <div className="text-sm font-black tracking-tight text-white uppercase font-mono">
                  G MINING VENTURES - PROJETO GURUPI
                </div>
                <div className="text-xs text-slate-300 font-semibold tracking-wide">
                  RELATÓRIO OFICIAL DE FOTOS QA/QC
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="text-amber-400 font-bold font-mono">
                  Data: {selectedDate === 'ALL' || selectedDate === 'all' ? 'Todas as Datas' : formatDateToPtBR(selectedDate)}
                </div>
                <div className="text-slate-300 text-[11px] font-mono">
                  Total ARs: <span className="text-white font-bold">{filteredARs.length}</span> • Fotos Anexadas: <span className="text-cyan-400 font-bold">{totalPhotosForDate}</span>
                </div>
              </div>
            </div>

            {arGroupedData.every((g) => g.photos.length === 0) ? (
              <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-medium">
                Nenhum registro fotográfico de padrão anexado para a data {formatDateToPtBR(selectedDate)}.
              </div>
            ) : (
              arGroupedData.map(({ ar, photos: arPhotos }) => {
                if (arPhotos.length === 0) return null;

                const holeCode = ar.drillHoleCode || holes.find((h) => h.id === ar.drillHoleId)?.code || '-';
                const ranges = getNormalizedSampleRanges(ar.sampleRanges, ar.startSampleCode, ar.endSampleCode);
                const sampleRangeStr = ranges.length > 0
                  ? ranges.map((r) => `${r.firstSampleCode} a ${r.lastSampleCode}`).join(' / ')
                  : (ar.startSampleCode && ar.endSampleCode ? `${ar.startSampleCode} a ${ar.endSampleCode}` : 'Amostras gerais');

                // Chunk photos into pages (2 photos stacked per A4 page sheet)
                const pages = [];
                for (let i = 0; i < arPhotos.length; i += 2) {
                  pages.push(arPhotos.slice(i, i + 2));
                }

                return pages.map((pagePhotos, pageIdx) => (
                  <div
                    key={`${ar.id}-page-${pageIdx}`}
                    className="w-full bg-white text-black p-4 sm:p-6 rounded-xl shadow-2xl border border-slate-200 flex flex-col justify-start items-center gap-4 min-h-[700px] sm:min-h-[900px] print:p-0 print:border-none print:shadow-none print:min-h-0 print:break-after-page"
                    style={{ backgroundColor: '#ffffff', color: '#000000' }}
                  >
                    {/* AR Group Identification Header Bar */}
                    <div className="w-full bg-slate-800 text-white px-4 py-2.5 rounded-lg flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-amber-300">AR: {ar.arCode}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-slate-200">FURO: {holeCode}</span>
                      </div>
                      <div className="text-slate-300 text-[11px]">
                        Faixa de Amostras: <span className="text-cyan-300 font-semibold">{sampleRangeStr}</span>
                      </div>
                    </div>

                    {pagePhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="w-full flex-1 flex flex-col overflow-hidden rounded border border-slate-200 bg-slate-50"
                      >
                        <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-slate-200">
                            Padrão: {photo.sampleCode || 'QA/QC'} ({photo.sampleType || 'GERAL'})
                            {(photo as any).oreasProduct ? ` • ${(photo as any).oreasProduct}` : ''}
                          </span>
                          {photo.capturedAt && (
                            <span className="text-slate-400 text-[10px]">
                              Data: {formatDateToPtBR(photo.capturedAt.split('T')[0])}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-center p-2 bg-white">
                          <img
                            src={photo.dataUrl || photo.photoUrl}
                            alt={photo.sampleCode || 'Foto QAQC'}
                            className="max-w-full max-h-[380px] sm:max-h-[480px] object-contain rounded"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

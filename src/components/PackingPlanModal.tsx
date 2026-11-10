import React, { useState, useEffect, useRef } from 'react';
import { SampleShipmentAR, DrillHole, QAQCSamplePhoto, User } from '../types';
import {
  generatePackingPlan,
  formatDateToPtBR,
  findVolumeForSample,
  getQaqcSamplesForVolume,
} from '../utils/calculator';
import { AppLogo } from './AppLogo';
import { QAQCPhotoGallery } from './QAQCPhotoGallery';
import { X, Printer, Copy, Check, Settings2, Package, Camera, Layers } from 'lucide-react';

interface PackingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  ar: SampleShipmentAR | null;
  hole?: DrillHole | null;
  photos?: QAQCSamplePhoto[];
  activeUser?: User;
  initialTab?: 'plan' | 'photos';
  onUpdateARVolumes?: (arId: string, volumeCount: number, standardSize: number) => Promise<void> | void;
  onUploadPhoto?: (
    arId: string,
    file: File,
    sampleCode?: string,
    sampleType?: string,
    onProgress?: (percent: number, statusText: string) => void
  ) => Promise<void>;
  onDeletePhoto?: (photo: QAQCSamplePhoto) => Promise<void>;
  onCleanupExpiredPhotos?: () => Promise<void>;
  onOpenPdfReportModal?: (date?: string) => void;
  onOpenMobilePhotoModal?: () => void;
}

export const PackingPlanModal: React.FC<PackingPlanModalProps> = ({
  isOpen,
  onClose,
  ar,
  hole,
  photos = [],
  activeUser,
  initialTab = 'plan',
  onUpdateARVolumes,
  onUploadPhoto,
  onDeletePhoto,
  onCleanupExpiredPhotos,
  onOpenPdfReportModal,
  onOpenMobilePhotoModal,
}) => {
  const [standardSize, setStandardSize] = useState<number>(() => {
    return ar?.standardSize && ar.standardSize > 0 ? ar.standardSize : 10;
  });
  const [copied, setCopied] = useState<boolean>(false);
  const [activeViewTab, setActiveViewTab] = useState<'plan' | 'photos'>(initialTab);

  const lastSyncedArIdRef = useRef<string | null>(null);
  const lastSavedSizeRef = useRef<number | null>(null);
  const lastSavedVolumesRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveViewTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Synchronize standardSize ONLY when opening the modal or switching to a different AR
  useEffect(() => {
    if (isOpen && ar) {
      if (lastSyncedArIdRef.current !== ar.id) {
        lastSyncedArIdRef.current = ar.id;
        const initialStd = ar.standardSize && ar.standardSize > 0 ? ar.standardSize : 10;
        setStandardSize(initialStd);
        lastSavedSizeRef.current = initialStd;
        lastSavedVolumesRef.current = ar.volumeCount || null;
      }
    } else if (!isOpen) {
      lastSyncedArIdRef.current = null;
      lastSavedSizeRef.current = null;
      lastSavedVolumesRef.current = null;
    }
  }, [isOpen, ar?.id]);

  const plan = ar
    ? generatePackingPlan(ar.startSampleCode, ar.endSampleCode, standardSize, ar.sampleRanges || hole?.sampleRanges)
    : { isValid: false, totalSamples: 0, totalVolumes: 0, volumes: [], error: '' };

  const handleStandardSizeChange = (newSize: number) => {
    const validSize = Math.max(1, newSize);
    setStandardSize(validSize);
    if (!ar) return;

    const newPlan = generatePackingPlan(
      ar.startSampleCode,
      ar.endSampleCode,
      validSize,
      ar.sampleRanges || hole?.sampleRanges
    );

    if (newPlan.isValid && newPlan.totalVolumes > 0) {
      // Guard: do not re-save if identical to what is already saved
      if (
        lastSavedSizeRef.current === validSize &&
        lastSavedVolumesRef.current === newPlan.totalVolumes
      ) {
        return;
      }
      lastSavedSizeRef.current = validSize;
      lastSavedVolumesRef.current = newPlan.totalVolumes;
      onUpdateARVolumes?.(ar.id, newPlan.totalVolumes, validSize);
    }
  };

  const handleClose = () => {
    if (ar && plan.isValid && plan.totalVolumes > 0) {
      if (
        lastSavedSizeRef.current !== standardSize ||
        lastSavedVolumesRef.current !== plan.totalVolumes
      ) {
        lastSavedSizeRef.current = standardSize;
        lastSavedVolumesRef.current = plan.totalVolumes;
        onUpdateARVolumes?.(ar.id, plan.totalVolumes, standardSize);
      }
    }
    onClose();
  };

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !ar) return null;

  // Group QA/QC samples by type
  const qaqcSamples = ar.qaqcSamples || [];
  
  const oreasList = qaqcSamples.filter(
    (q) => q.type.toUpperCase().includes('OREAS') || q.oreasProduct
  );
  
  const blkList = qaqcSamples.filter(
    (q) =>
      q.type.toUpperCase().includes('BLK') ||
      q.type.toUpperCase().includes('GESSO') ||
      q.type.toUpperCase().includes('BRANCO')
  );

  const dupList = qaqcSamples.filter(
    (q) => q.type.toUpperCase().includes('DUP') || q.type.toUpperCase().includes('DUPLICATA')
  );

  // Calculate max rows needed for QA/QC table
  const maxQaqcRows = Math.max(oreasList.length, blkList.length, dupList.length);

  // Format date DD/MM/YYYY
  const formatDateStr = (dateStr: string) => formatDateToPtBR(dateStr);

  // Copy TSV format to clipboard with volume indication for all QA/QC standards
  const handleCopyTSV = () => {
    if (!plan.isValid) return;

    let text = `${hole?.code || ar.drillHoleCode}\n`;
    text += `G MINING\nPROJETO GURUPI\n${ar.arCode}\n\n`;
    text += `VOLUME\tFROM\tTO\tSEND/VOL\tPADRÕES NO VOLUME\tSAMPLES=\t${plan.totalSamples}\n`;

    const maxRows = Math.max(plan.volumes.length, maxQaqcRows > 0 ? maxQaqcRows + 4 : 4);

    for (let i = 0; i < maxRows; i++) {
      const vol = plan.volumes[i];
      let volCol = `\t\t\t\t\t`;
      if (vol) {
        const vQaqc = getQaqcSamplesForVolume(vol, qaqcSamples, plan.volumes);
        const qItems: string[] = [];
        vQaqc.oreas.forEach((o) => qItems.push(`OREAS ${o.oreasProduct || ''} (${o.code})`.trim()));
        vQaqc.blk.forEach((b) => qItems.push(`BLK (${b.code})`));
        vQaqc.dup.forEach((d) => qItems.push(`DUP (${d.code}${d.duplicateMeter ? ` - ${d.duplicateMeter}` : ''})`));
        const qStr = qItems.join(', ') || '-';
        volCol = `${vol.volumeCode}\t${vol.fromSample}\t${vol.toSample}\t${vol.sendVol}\t${qStr}`;
      }

      let rightCol = '';
      if (i === 0) rightCol = `VOLUMES=\t${plan.totalVolumes}`;
      else if (i === 1) rightCol = `WEIGHT=\t${ar.weightKg && ar.weightKg > 0 ? `${ar.weightKg}` : ''}`;
      else if (i === 2) rightCol = `SEND=\t${formatDateStr(ar.shipmentDate)}`;
      else if (i === 3) rightCol = `OREAS (VOL)\tPADRÃO\tBLK (VOL)\tDUP (VOL) [METRO]`;
      else {
        const qIndex = i - 4;
        if (qIndex < maxQaqcRows) {
          const oreas = oreasList[qIndex];
          const blk = blkList[qIndex];
          const dup = dupList[qIndex];

          const oVol = oreas ? findVolumeForSample(oreas.code, plan.volumes)?.volumeCode || '-' : '';
          const bVol = blk ? findVolumeForSample(blk.code, plan.volumes)?.volumeCode || '-' : '';
          const dVol = dup ? findVolumeForSample(dup.code, plan.volumes)?.volumeCode || '-' : '';

          const oCode = oreas ? `${oreas.code} [${oVol}]` : '';
          const oProd = oreas ? (oreas.oreasProduct || oreas.notes || '-') : '';
          const bStr = blk ? `${blk.code} [${bVol}]` : '';
          const dMeter = dup?.duplicateMeter ? ` [${dup.duplicateMeter}]` : '';
          const dStr = dup ? `${dup.code} [${dVol}]${dMeter}` : '';

          if (oCode || bStr || dStr) {
            rightCol = `${oCode}\t${oProd}\t${bStr}\t${dStr}`;
          }
        }
      }

      text += `${volCol}\t${rightCol}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    document.body.classList.add('print-packing-plan-active');
    const cleanup = () => {
      document.body.classList.remove('print-packing-plan-active');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2500);
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:static print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block">
      {/* Modal Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] h-fit print:static print:border-none print:shadow-none print:bg-transparent print:p-0 print:m-0 print:max-w-full print:rounded-none print:overflow-visible print:block">
        {/* Top Controls Toolbar (Hidden during window.print) */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                Plano de Empacotamento
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {ar.arCode}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Divisão automática de amostras em volumes de envio ao laboratório
              </p>
            </div>
          </div>

          {/* View Tab Selector */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveViewTab('plan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeViewTab === 'plan'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Plano Tabela</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('photos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeViewTab === 'photos'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Fotos QA/QC ({photos.filter((p) => p.arId === ar.id).length})</span>
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {activeViewTab === 'plan' && (
              <>
                {/* Standard Volume Size Setting */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-300 font-medium">Tamanho padrão:</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={standardSize}
                    onChange={(e) => handleStandardSizeChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-cyan-300 text-center outline-none focus:border-cyan-500"
                  />
                  <span className="text-slate-400 text-[10px]">amostras</span>
                  <span className="ml-1 text-[11px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    {plan.totalVolumes} vol. salvos
                  </span>
                </div>

                <button
                  onClick={handleCopyTSV}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Tabela</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
              </>
            )}

            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body View Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950 flex flex-col items-center justify-start grow min-h-0 print:static print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block">
          {activeViewTab === 'photos' && activeUser && onUploadPhoto && onDeletePhoto ? (
            <div className="w-full max-w-4xl">
              <QAQCPhotoGallery
                ar={ar}
                photos={photos}
                activeUser={activeUser}
                onUploadPhoto={onUploadPhoto}
                onDeletePhoto={onDeletePhoto}
                onCleanupExpiredPhotos={onCleanupExpiredPhotos}
                onOpenPdfReportModal={onOpenPdfReportModal}
                onOpenMobilePhotoModal={onOpenMobilePhotoModal}
              />
            </div>
          ) : (
            <>
              {/* Interactive Volume Breakdown Ribbon (Screen only, hidden on print) */}
              {qaqcSamples.length > 0 && plan.isValid && plan.volumes.length > 0 && (
                <div className="w-full max-w-[840px] mb-4 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg no-print">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white">
                        Alocação dos Padrões por Volume ({qaqcSamples.length} QA/QC no AR)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {plan.totalVolumes} {plan.totalVolumes === 1 ? 'Volume' : 'Volumes'} · {plan.totalSamples} Amostras
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {plan.volumes.map((vol) => {
                      const vQaqc = getQaqcSamplesForVolume(vol, qaqcSamples, plan.volumes);
                      const hasItems = vQaqc.all.length > 0;
                      return (
                        <div
                          key={vol.volumeCode}
                          className={`p-2.5 rounded-lg border transition-all ${
                            hasItems
                              ? 'bg-slate-800/80 border-cyan-500/30 shadow-xs'
                              : 'bg-slate-950/40 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-cyan-400" />
                              {vol.volumeCode}
                            </span>
                            <span className="text-slate-400 text-[10.5px]">
                              {vol.fromSample} → {vol.toSample} ({vol.sendVol} am.)
                            </span>
                          </div>

                          {!hasItems ? (
                            <div className="text-[10px] text-slate-500 italic py-0.5">
                              Nenhum padrão QA/QC neste volume
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {vQaqc.oreas.map((o, idx) => (
                                <div
                                  key={o.id || o.code || `oreas-${idx}`}
                                  className="text-[10.5px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between"
                                >
                                  <span className="font-bold">OREAS {o.oreasProduct || o.notes || ''}</span>
                                  <span className="font-mono text-[10px] text-amber-200">{o.code}</span>
                                </div>
                              ))}
                              {vQaqc.blk.map((b, idx) => (
                                <div
                                  key={b.id || b.code || `blk-${idx}`}
                                  className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-between"
                                >
                                  <span className="font-bold">BLK</span>
                                  <span className="font-mono text-[10px] text-slate-300">{b.code}</span>
                                </div>
                              ))}
                              {vQaqc.dup.map((d, idx) => (
                                <div
                                  key={d.id || d.code || `dup-${idx}`}
                                  className="text-[10.5px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-between"
                                >
                                  <span className="font-bold">DUP</span>
                                  <span className="font-mono text-[10px] text-purple-200">{d.code}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Printable Document Sheet Container */}
              <div
                id="printable-packing-plan"
                className="w-full max-w-[840px] bg-white text-black p-4 sm:p-5 rounded-xl shadow-2xl font-sans text-xs border border-slate-300 print:max-w-full print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none"
                style={{ color: '#000000', backgroundColor: '#ffffff' }}
              >
                {/* 1. Document Header (Matching requested style with 4 centered lines + Company Logo) */}
                <div className="border-2 border-black mb-2.5 p-2 bg-white text-black relative flex items-center justify-center min-h-[68px]">
                  {/* Company Logo on Left */}
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <AppLogo size={32} className="shrink-0" />
                    <div className="hidden sm:flex flex-col text-left leading-none font-sans">
                      <span className="text-[11px] font-black tracking-wider text-black uppercase">MINING</span>
                      <span className="text-[11px] font-black tracking-wider text-black uppercase">VENTURES</span>
                    </div>
                  </div>

                  {/* Centered 4-line Block */}
                  <div className="text-center font-sans font-black text-black uppercase leading-tight py-0.5">
                    <div className="text-xs sm:text-sm font-black tracking-wide">
                      {(hole?.code || ar.drillHoleCode).toUpperCase()}
                    </div>
                    <div className="text-xs sm:text-sm font-black tracking-wide">
                      G MINING
                    </div>
                    <div className="text-xs sm:text-sm font-black tracking-wide">
                      PROJETO GURUPI
                    </div>
                    <div className="text-xs sm:text-sm font-black tracking-wide">
                      {ar.arCode}
                    </div>
                  </div>
                </div>

                {/* 2. Main Layout: Volumes Table (Left) + Summary & QA/QC (Right) - ALWAYS 12-COL SIDE-BY-SIDE */}
                <div className="grid grid-cols-12 gap-2.5 items-start">
                  {/* Left Side: Volumes Table (7 columns out of 12) */}
                  <div className="col-span-7">
                    <table className="w-full border-collapse border border-black text-center text-xs bg-white">
                      <thead>
                        <tr className="bg-slate-200 border-b border-black font-black uppercase text-[9px] text-black">
                          <th className="border border-black py-0.5 px-1 w-[15%]">VOLUME</th>
                          <th className="border border-black py-0.5 px-1 w-[16%]">FROM</th>
                          <th className="border border-black py-0.5 px-1 w-[16%]">TO</th>
                          <th className="border border-black py-0.5 px-1 w-[13%]">SEND/VOL</th>
                          <th className="border border-black py-0.5 px-1 w-[40%] bg-slate-100">PADRÕES (QA/QC)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.volumes.map((vol) => {
                          const vQaqc = getQaqcSamplesForVolume(vol, qaqcSamples, plan.volumes);
                          return (
                            <tr key={vol.volumeCode} className="border-b border-black font-mono text-[10px] text-black">
                              <td className="border border-black py-0.5 px-1 font-bold bg-slate-50 text-black">{vol.volumeCode}</td>
                              <td className="border border-black py-0.5 px-1 font-bold text-black">{vol.fromSample}</td>
                              <td className="border border-black py-0.5 px-1 font-bold text-black">{vol.toSample}</td>
                              <td className="border border-black py-0.5 px-1 font-bold text-black">{vol.sendVol}</td>
                              <td className="border border-black py-0.5 px-1 text-left text-[8.5px] font-sans">
                                {vQaqc.all.length === 0 ? (
                                  <span className="text-slate-400 italic font-mono">-</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1 items-center">
                                    {vQaqc.oreas.map((o, idx) => (
                                      <span
                                        key={o.id || o.code || `tbl-oreas-${idx}`}
                                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-bold bg-amber-100 text-amber-950 border border-amber-300"
                                      >
                                        OREAS {o.oreasProduct || ''} ({o.code})
                                      </span>
                                    ))}
                                    {vQaqc.blk.map((b, idx) => (
                                      <span
                                        key={b.id || b.code || `tbl-blk-${idx}`}
                                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-bold bg-slate-100 text-slate-900 border border-slate-300"
                                      >
                                        BLK ({b.code})
                                      </span>
                                    ))}
                                    {vQaqc.dup.map((d, idx) => (
                                      <span
                                        key={d.id || d.code || `tbl-dup-${idx}`}
                                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-bold bg-purple-100 text-purple-950 border border-purple-300"
                                      >
                                        DUP ({d.code}{d.duplicateMeter ? ` - ${d.duplicateMeter.toLowerCase().includes('m') ? d.duplicateMeter : `${d.duplicateMeter}m`}` : ''})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Right Side: Summary Block & QA/QC Samples (5 columns out of 12) */}
                  <div className="col-span-5 flex flex-col gap-2">
                    {/* Summary Table */}
                    <table className="w-full border-collapse border border-black text-xs bg-white">
                      <tbody>
                        <tr className="border-b border-black text-black">
                          <td className="border border-black py-0.5 px-2 font-bold bg-slate-100 uppercase text-[9px] w-1/2 text-black">
                            SAMPLES=
                          </td>
                          <td className="border border-black py-0.5 px-2 font-mono font-bold text-[11px] text-black">
                            {plan.totalSamples}
                          </td>
                        </tr>
                        <tr className="border-b border-black text-black">
                          <td className="border border-black py-0.5 px-2 font-bold bg-slate-100 uppercase text-[9px] text-black">
                            VOLUMES=
                          </td>
                          <td className="border border-black py-0.5 px-2 font-mono font-bold text-[11px] text-black">
                            {plan.totalVolumes}
                          </td>
                        </tr>
                        <tr className="border-b border-black text-black">
                          <td className="border border-black py-0.5 px-2 font-bold bg-slate-100 uppercase text-[9px] text-black">
                            WEIGHT=
                          </td>
                          <td className="border border-black py-0.5 px-2 font-mono font-bold text-[11px] text-black">
                            {ar.weightKg && ar.weightKg > 0 ? ar.weightKg : ''}
                          </td>
                        </tr>
                        <tr className="text-black">
                          <td className="border border-black py-0.5 px-2 font-bold bg-slate-100 uppercase text-[9px] text-black">
                            SEND=
                          </td>
                          <td className="border border-black py-0.5 px-2 font-mono font-bold text-[11px] text-black">
                            {formatDateStr(ar.shipmentDate)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* QA/QC Standards Table with Volume Indication for OREAS, BLK, DUP */}
                    <table className="w-full border-collapse border border-black text-center text-xs bg-white">
                      <thead>
                        <tr className="bg-slate-200 border-b border-black font-black uppercase text-[9px] text-black">
                          <th className="border border-black py-0.5 px-0.5" colSpan={2}>
                            OREAS
                          </th>
                          <th className="border border-black py-0.5 px-0.5">BLK</th>
                          <th className="border border-black py-0.5 px-0.5">DUP</th>
                        </tr>
                        <tr className="bg-slate-100 border-b border-black font-black uppercase text-[7.5px] text-black tracking-tight">
                          <th className="border border-black py-0.5 px-0.5">CÓDIGO (VOL)</th>
                          <th className="border border-black py-0.5 px-0.5">PADRÃO</th>
                          <th className="border border-black py-0.5 px-0.5">CÓDIGO (VOL)</th>
                          <th className="border border-black py-0.5 px-0.5">CÓDIGO (VOL) • METRO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maxQaqcRows === 0 ? (
                          <tr>
                            <td colSpan={4} className="border border-black py-1.5 px-2 text-center text-slate-500 italic text-[9.5px]">
                              Nenhum padrão QA/QC inserido neste AR
                            </td>
                          </tr>
                        ) : (
                          Array.from({ length: maxQaqcRows }).map((_, idx) => {
                            const oreas = oreasList[idx];
                            const blk = blkList[idx];
                            const dup = dupList[idx];

                            const oreasVol = oreas ? findVolumeForSample(oreas.code, plan.volumes) : null;
                            const blkVol = blk ? findVolumeForSample(blk.code, plan.volumes) : null;
                            const dupVol = dup ? findVolumeForSample(dup.code, plan.volumes) : null;

                            return (
                              <tr key={idx} className="border-b border-black font-mono text-[9.5px] text-black">
                                {/* OREAS Code & Volume */}
                                <td className="border border-black py-0.5 px-0.5 font-bold w-1/4 text-black text-center">
                                  {oreas ? (
                                    <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                                      <span className="font-bold text-[9.5px]">{oreas.code}</span>
                                      <span className="text-[7.5px] font-mono font-black text-slate-900 bg-amber-100/90 border border-black/40 px-1 py-0.2 rounded mt-0.5">
                                        {oreasVol ? oreasVol.volumeCode : 'S/ VOL'}
                                      </span>
                                    </div>
                                  ) : ''}
                                </td>
                                {/* OREAS Lot/Product */}
                                <td className="border border-black py-0.5 px-0.5 font-bold text-black w-1/4 text-center">
                                  {oreas ? oreas.oreasProduct || oreas.notes || '-' : ''}
                                </td>
                                {/* BLK Code & Volume */}
                                <td className="border border-black py-0.5 px-0.5 font-bold w-1/4 text-black text-center">
                                  {blk ? (
                                    <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                                      <span className="font-bold text-[9.5px]">{blk.code}</span>
                                      <span className="text-[7.5px] font-mono font-black text-slate-900 bg-slate-100 border border-black/40 px-1 py-0.2 rounded mt-0.5">
                                        {blkVol ? blkVol.volumeCode : 'S/ VOL'}
                                      </span>
                                    </div>
                                  ) : ''}
                                </td>
                                {/* DUP Code, Volume & Meter */}
                                <td className="border border-black py-0.5 px-0.5 font-bold w-1/4 text-black text-center">
                                  {dup ? (
                                    <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                                      <span className="font-bold text-[9.5px]">{dup.code}</span>
                                      {dup.duplicateMeter && (
                                        <span className="text-[7.5px] font-mono font-black text-cyan-950 bg-cyan-100 border border-cyan-400 px-1 py-0.2 rounded mt-0.5">
                                          {dup.duplicateMeter.toLowerCase().includes('m') ? dup.duplicateMeter : `${dup.duplicateMeter}m`}
                                        </span>
                                      )}
                                      <span className="text-[7.5px] font-mono font-black text-slate-900 bg-purple-100/90 border border-black/40 px-1 py-0.2 rounded mt-0.5">
                                        {dupVol ? dupVol.volumeCode : 'S/ VOL'}
                                      </span>
                                    </div>
                                  ) : ''}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

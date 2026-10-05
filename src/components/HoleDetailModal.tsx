import React, { useState, useEffect } from 'react';
import { DrillHole, User, SampleShipmentAR, SampleRange } from '../types';
import { QaqcTableGrid } from './QaqcTableGrid';
import { parseSampleRange, parseSampleRanges, getARVolumeCount, formatDateToPtBR, getNormalizedSampleRanges } from '../utils/calculator';
import {
  X,
  PlusCircle,
  Tag,
  Trash2,
  FileText,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Save,
  Package,
  MapPin,
  Edit2,
  Plus,
  Camera,
} from 'lucide-react';

interface HoleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  hole: DrillHole | null;
  ars: SampleShipmentAR[];
  activeUser: User;
  onUpdateStorageLocation: (holeId: string, location: string) => void;
  onSaveSamplePlan: (holeId: string, firstCode: string, lastCode: string, sampleRanges?: SampleRange[]) => void;
  onOpenCreateARModal: (holeId: string) => void;
  onDeleteHoleRequest?: (hole: DrillHole) => void;
  onOpenPackingPlan?: (ar: SampleShipmentAR, initialTab?: 'plan' | 'photos') => void;
  onEditAR?: (ar: SampleShipmentAR) => void;
  onUpdateHoleInfo?: (holeId: string, newCode: string, newTarget?: string) => void;
}

export const HoleDetailModal: React.FC<HoleDetailModalProps> = ({
  isOpen,
  onClose,
  hole,
  ars,
  activeUser,
  onUpdateStorageLocation,
  onSaveSamplePlan,
  onOpenCreateARModal,
  onDeleteHoleRequest,
  onOpenPackingPlan,
  onEditAR,
  onUpdateHoleInfo,
}) => {
  const [editingStorage, setEditingStorage] = useState(false);
  const [storageInput, setStorageInput] = useState('');

  // Hole Code & Target editing states
  const [editingHoleInfo, setEditingHoleInfo] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [targetInput, setTargetInput] = useState('');

  // Sample plan edit form states
  const [sampleRanges, setSampleRanges] = useState<SampleRange[]>([
    { firstSampleCode: '', lastSampleCode: '' },
  ]);
  const [planSavedMsg, setPlanSavedMsg] = useState(false);
  const [planErrorMsg, setPlanErrorMsg] = useState('');

  useEffect(() => {
    if (hole) {
      setCodeInput(hole.code || '');
      setTargetInput(hole.target || 'GERAL');
      setEditingHoleInfo(false);
      setPlanErrorMsg('');

      if (hole.sampleRanges && hole.sampleRanges.length > 0) {
        setSampleRanges(hole.sampleRanges);
      } else if (hole.firstSampleCode || hole.lastSampleCode) {
        setSampleRanges([
          { firstSampleCode: hole.firstSampleCode || '', lastSampleCode: hole.lastSampleCode || '' },
        ]);
      } else {
        setSampleRanges([{ firstSampleCode: '', lastSampleCode: '' }]);
      }
    }
  }, [hole?.id, hole?.firstSampleCode, hole?.lastSampleCode, JSON.stringify(hole?.sampleRanges), hole?.code, hole?.target]);

  if (!isOpen || !hole) return null;

  // Filter ARs for this hole (both by ID and by Hole Code)
  const holeARs = ars.filter(
    (ar) =>
      ar.drillHoleId === hole.id ||
      (hole.code && ar.drillHoleCode?.trim().toUpperCase() === hole.code.trim().toUpperCase())
  );
  const totalShippedSamples = holeARs.reduce((acc, ar) => acc + (ar.sampleCount || 0), 0);

  // Multi-range sample plan calculation
  const multiCheck = parseSampleRanges(sampleRanges);
  const plannedSamplesCount = multiCheck.isValid ? multiCheck.totalCount : (hole.calculatedSampleCount || 0);
  const pendingSamplesCount = Math.max(0, plannedSamplesCount - totalShippedSamples);

  const handleAddRange = () => {
    setSampleRanges([...sampleRanges, { firstSampleCode: '', lastSampleCode: '' }]);
    setPlanErrorMsg('');
  };

  const handleRemoveRange = (index: number) => {
    if (sampleRanges.length <= 1) return;
    setSampleRanges(sampleRanges.filter((_, i) => i !== index));
    setPlanErrorMsg('');
  };

  const handleUpdateRange = (index: number, field: keyof SampleRange, value: string) => {
    setPlanErrorMsg('');
    setSampleRanges((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value.toUpperCase() } : r))
    );
  };

  const handleSaveStorage = () => {
    onUpdateStorageLocation(hole.id, storageInput.trim());
    setEditingStorage(false);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setPlanErrorMsg('');

    const cleanedRanges = sampleRanges
      .map((r) => ({
        firstSampleCode: r.firstSampleCode.trim().toUpperCase(),
        lastSampleCode: r.lastSampleCode.trim().toUpperCase(),
      }))
      .filter((r) => r.firstSampleCode !== '' || r.lastSampleCode !== '');

    if (cleanedRanges.length === 0) {
      setPlanErrorMsg('Informe ao menos uma faixa de amostras válida.');
      return;
    }

    const check = parseSampleRanges(cleanedRanges);
    if (!check.isValid) {
      setPlanErrorMsg(check.error || 'Formato de faixa inválido. Use letras seguidas de números (ex: D00200 até D00401).');
      return;
    }

    const firstSample = cleanedRanges[0].firstSampleCode;
    const lastSample = cleanedRanges[cleanedRanges.length - 1].lastSampleCode;

    onSaveSamplePlan(hole.id, firstSample, lastSample, cleanedRanges);
    setPlanSavedMsg(true);
    setTimeout(() => setPlanSavedMsg(false), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 border-b border-slate-800">
          <div className="flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-xs font-bold uppercase tracking-wider">
                Furo / Amostragem
              </span>
              {hole.createdByName && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium">
                  Cadastrado por {hole.createdByName}
                </span>
              )}
            </div>

            {!editingHoleInfo ? (
              <div>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-2xl font-black font-mono tracking-tight text-white">
                    {hole.code}
                  </h2>
                  {onUpdateHoleInfo && (
                    <button
                      type="button"
                      onClick={() => {
                        setCodeInput(hole.code);
                        setTargetInput(hole.target || 'GERAL');
                        setEditingHoleInfo(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Editar nome do furo e alvo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-400" /> Alvo: <strong>{hole.target || 'GERAL'}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2 bg-slate-900 p-3 rounded-xl border border-amber-500/40">
                <div className="flex-1 w-full">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Nome / Código do Furo:</label>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 font-mono text-white text-sm font-bold outline-none focus:border-amber-500"
                    placeholder="Ex: GUD-26-051"
                  />
                </div>
                <div className="w-full sm:w-36">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Alvo:</label>
                  <input
                    type="text"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white text-sm font-bold outline-none focus:border-amber-500"
                    placeholder="Ex: GERAL"
                  />
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-center mt-2 sm:mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!codeInput.trim()) return;
                      onUpdateHoleInfo?.(hole.id, codeInput, targetInput);
                      setEditingHoleInfo(false);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingHoleInfo(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onDeleteHoleRequest && (
              <button
                onClick={() => {
                  onClose();
                  onDeleteHoleRequest(hole);
                }}
                className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-300 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Apagar este cadastro"
              >
                <Trash2 className="w-4 h-4" />
                <span>Apagar</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Overview Bar */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Total Amostras no Plano: <strong className="text-amber-300 font-mono text-sm">{plannedSamplesCount}</strong></span>
          </div>

          {/* Storage Location */}
          <div className="w-full md:w-auto flex items-center gap-3 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Localização:</span>
            {!editingStorage ? (
              <button
                onClick={() => {
                  setStorageInput(hole.storageLocation || '');
                  setEditingStorage(true);
                }}
                className="font-semibold text-white hover:text-amber-400 flex items-center gap-1 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                {hole.storageLocation || 'Definir localização (ex: Galpão A)'}
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={storageInput}
                  onChange={(e) => setStorageInput(e.target.value)}
                  placeholder="Galpão/Prateleira"
                  className="px-2 py-1 text-xs border border-slate-700 rounded bg-slate-900 text-white"
                />
                <button
                  onClick={handleSaveStorage}
                  className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded text-[10px] font-bold"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* Plano de Amostragem do Furo */}
          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" /> Plano de Amostragem ({sampleRanges.length} {sampleRanges.length === 1 ? 'faixa' : 'faixas'})
              </span>
              {plannedSamplesCount > 0 && (
                <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                  Total: {plannedSamplesCount} amostras
                </span>
              )}
            </div>

            <form onSubmit={handleSavePlan} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5">
                {sampleRanges.map((range, idx) => {
                  const singleCheck = parseSampleRange(range.firstSampleCode, range.lastSampleCode);
                  const subCount = singleCheck.isValid ? singleCheck.count : 0;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-3 relative"
                    >
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded shrink-0">
                        Faixa {idx + 1}
                      </span>

                      <div className="grid grid-cols-2 gap-2 flex-1 w-full">
                        <input
                          type="text"
                          value={range.firstSampleCode}
                          onChange={(e) => handleUpdateRange(idx, 'firstSampleCode', e.target.value)}
                          placeholder="Primeira ex: S01637"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 font-mono text-white text-xs font-bold outline-none focus:border-amber-500"
                        />
                        <input
                          type="text"
                          value={range.lastSampleCode}
                          onChange={(e) => handleUpdateRange(idx, 'lastSampleCode', e.target.value)}
                          placeholder="Última ex: S01706"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 font-mono text-white text-xs font-bold outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {subCount > 0 && (
                          <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                            {subCount} un
                          </span>
                        )}

                        {sampleRanges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRange(idx)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Remover faixa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {planErrorMsg && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800 text-[11px] text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{planErrorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddRange}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar faixa
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Atualizar Plano</span>
                </button>
              </div>
            </form>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center justify-between">
              <span>
                {multiCheck.isValid ? (
                  <>Soma de todas as faixas: <strong className="text-amber-400">{multiCheck.totalCount} amostras</strong></>
                ) : (
                  <span className="text-slate-400 italic">Preencha faixas válidas (ex: D00200 a D00401)</span>
                )}
              </span>
              {planSavedMsg && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Salvo com sucesso!
                </span>
              )}
            </div>
          </div>

          {/* Remessas de Amostras (ARs do Furo) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Remessas de Amostras (ARGMGP)
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {holeARs.length} AR(s) vinculado(s) • Total em ARs: <strong>{totalShippedSamples} / {plannedSamplesCount}</strong> amostras
                </p>
              </div>

              <button
                onClick={() => onOpenCreateARModal(hole.id)}
                className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Gerar Novo AR</span>
              </button>
            </div>

            {plannedSamplesCount > 0 && (
              <div
                className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between border ${
                  totalShippedSamples === plannedSamplesCount
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : totalShippedSamples > plannedSamplesCount
                    ? 'bg-red-950/40 border-red-800 text-red-300'
                    : 'bg-amber-950/40 border-amber-800 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {totalShippedSamples === plannedSamplesCount ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>
                    {totalShippedSamples === plannedSamplesCount
                      ? `Todas as ${plannedSamplesCount} amostras do plano estão perfeitamente incluídas nas ${holeARs.length} remessa(s) (ARs)!`
                      : totalShippedSamples > plannedSamplesCount
                      ? `Atenção: A soma das remessas (${totalShippedSamples} amostras em ${holeARs.length} ARs) excede o novo plano (${plannedSamplesCount} amostras). Clique em 'Editar' nos ARs abaixo para ajustar.`
                      : `Atenção: Existem ${plannedSamplesCount - totalShippedSamples} amostras planejadas pendentes de envio (Plano: ${plannedSamplesCount} | Remessas: ${totalShippedSamples})`}
                  </span>
                </div>
              </div>
            )}

            {holeARs.length > 0 && (
              <div className="overflow-x-auto mt-1 rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-900">
                      <th className="p-2.5">Código AR</th>
                      <th className="p-2.5">Faixa Amostras</th>
                      <th className="p-2.5 text-center">Amostras</th>
                      <th className="p-2.5 text-center">Volumes</th>
                      <th className="p-2.5 text-center">Peso</th>
                      <th className="p-2.5">Padrões QA/QC</th>
                      <th className="p-2.5">Data Envio</th>
                      <th className="p-2.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-medium">
                    {holeARs.map((ar) => (
                      <tr key={ar.id} className="hover:bg-slate-900/60">
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
                        <td className="p-2.5 font-mono text-slate-400">{ar.shipmentDate ? formatDateToPtBR(ar.shipmentDate) : '-'}</td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {onOpenPackingPlan && (
                              <button
                                onClick={() => onOpenPackingPlan(ar, 'photos')}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-bold rounded inline-flex items-center gap-1 transition-colors"
                                title="Anexar e ver fotos dos padrões QA/QC"
                              >
                                <Camera className="w-3 h-3 text-amber-400" />
                                <span>Fotos</span>
                              </button>
                            )}
                            {onEditAR && (
                              <button
                                onClick={() => onEditAR(ar)}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded inline-flex items-center gap-1 transition-colors"
                                title="Editar esta remessa (AR)"
                              >
                                <Edit2 className="w-3 h-3 text-amber-400" />
                                <span>Editar</span>
                              </button>
                            )}
                            {onOpenPackingPlan && (
                              <button
                                onClick={() => onOpenPackingPlan(ar)}
                                className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[10px] font-bold rounded inline-flex items-center gap-1 transition-colors"
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

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 font-bold text-xs transition-colors"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>
    </div>
  );
};

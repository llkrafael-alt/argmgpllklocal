import React, { useState, useEffect } from 'react';
import { DrillHole, User, QaQcSample, OreasStockEntry, SampleShipmentAR, SampleRange } from '../types';
import { parseSampleRange, parseSampleRanges, getNextArCode } from '../utils/calculator';
import { getAvailableStockForCode, getSampleOreasProduct } from '../utils/oreasStock';
import { QaqcGridInput } from './QaqcGridInput';
import {
  X,
  CheckCircle2,
  UserCheck,
  FileText,
  Truck,
  AlertCircle,
  ShieldCheck,
  Boxes,
  Plus,
  Trash2,
  Scale,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface NewHoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holeData: {
    code: string;
    target?: string;
    firstSampleCode: string;
    lastSampleCode: string;
    sampleRanges?: SampleRange[];
    calculatedSampleCount: number;
    weightKg?: number;
    shipmentDate?: string;
    notes?: string;
    qaqcSamples?: QaQcSample[];
    arCode?: string;
  }) => void;
  activeUser: User;
  oreasStockEntries?: OreasStockEntry[];
  ars?: SampleShipmentAR[];
}

export const NewHoleModal: React.FC<NewHoleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  activeUser,
  oreasStockEntries = [],
  ars = [],
}) => {
  const [code, setCode] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [arCode, setArCode] = useState<string>(() => getNextArCode(ars));
  const [sampleRanges, setSampleRanges] = useState<SampleRange[]>([
    { firstSampleCode: '', lastSampleCode: '' },
  ]);
  const [weightKg, setWeightKg] = useState<string | number>(0);
  const [shipmentDate, setShipmentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [qaqcSamples, setQaqcSamples] = useState<QaQcSample[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [modalSessionId, setModalSessionId] = useState<number>(() => Date.now());

  const resetAllFields = () => {
    setModalSessionId(Date.now());
    setErrorMsg('');
    setCode('');
    setTarget('');
    setArCode(getNextArCode(ars));
    setSampleRanges([{ firstSampleCode: '', lastSampleCode: '' }]);
    setWeightKg(0);
    setShipmentDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setQaqcSamples([]);
  };

  useEffect(() => {
    if (isOpen) {
      resetAllFields();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetAllFields();
    onClose();
  };

  if (!isOpen) return null;

  // Real-time multi-range sample calculation
  const multiCheck = parseSampleRanges(sampleRanges);
  const totalSamples = multiCheck.isValid ? multiCheck.totalCount : 0;
  const numARs = totalSamples > 0 ? Math.ceil(totalSamples / 200) : 0;

  const handleAddRange = () => {
    setSampleRanges([...sampleRanges, { firstSampleCode: '', lastSampleCode: '' }]);
  };

  const handleRemoveRange = (index: number) => {
    if (sampleRanges.length <= 1) return;
    setSampleRanges(sampleRanges.filter((_, i) => i !== index));
  };

  const handleUpdateRange = (index: number, field: keyof SampleRange, value: string) => {
    setSampleRanges((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value.toUpperCase() } : r))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedCode = code.trim().toUpperCase();
    const trimmedTarget = target.trim().toUpperCase() || 'GERAL';

    if (!trimmedCode) {
      setErrorMsg('Informe o nome ou código do furo/amostra (ex: GUD-26-051).');
      return;
    }

    const cleanedRanges = sampleRanges
      .map((r) => ({
        firstSampleCode: r.firstSampleCode.trim().toUpperCase(),
        lastSampleCode: r.lastSampleCode.trim().toUpperCase(),
      }))
      .filter((r) => r.firstSampleCode !== '' || r.lastSampleCode !== '');

    if (cleanedRanges.length === 0) {
      setErrorMsg('Adicione ao menos uma faixa de amostragem válida.');
      return;
    }

    const checkResult = parseSampleRanges(cleanedRanges);
    if (!checkResult.isValid || checkResult.totalCount <= 0) {
      setErrorMsg(checkResult.error || 'Faixas de amostra inválidas. Verifique os códigos informados.');
      return;
    }

    const cleanedQaqc = qaqcSamples.filter((q) => q.code.trim() !== '');
    const numWeight = typeof weightKg === 'string' ? parseFloat(weightKg.replace(',', '.')) : weightKg;

    const firstSampleCode = cleanedRanges[0].firstSampleCode;
    const lastSampleCode = cleanedRanges[cleanedRanges.length - 1].lastSampleCode;

    onSave({
      code: trimmedCode,
      target: trimmedTarget,
      firstSampleCode,
      lastSampleCode,
      sampleRanges: cleanedRanges,
      calculatedSampleCount: checkResult.totalCount,
      weightKg: isNaN(numWeight) || numWeight < 0 ? 0 : Number(numWeight.toFixed(2)),
      shipmentDate,
      notes: notes.trim() || undefined,
      qaqcSamples: cleanedQaqc,
      arCode: arCode.trim().toUpperCase() || undefined,
    });

    resetAllFields();
    onClose();
  };

  const currentDate = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl xl:max-w-6xl w-full shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Cadastrar Amostragem e Padrões QA/QC
              </h3>
              <p className="text-[11px] text-slate-400">
                Configuração completa do plano de amostragem, padrões QA/QC, peso e data de envio
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User badge */}
        <div className="px-6 py-2 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Cadastrado por: <strong className="text-white">{activeUser.name}</strong> ({activeUser.role})
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">{currentDate}</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nome / Código, Alvo & Código da AR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Código do Furo / Amostra *
              </label>
              <input
                type="text"
                placeholder="Ex: GUD-26-051"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono font-bold uppercase outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Alvo (Target) <span className="text-slate-500 font-normal text-[10px]">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: ALVO GUALAXO"
                value={target}
                onChange={(e) => setTarget(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-semibold uppercase outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center justify-between">
                <span>Número / Código da AR *</span>
                <span className="text-amber-400 text-[10px] lowercase font-semibold">Editável</span>
              </label>
              <input
                type="text"
                placeholder="Ex: ARGMGP-366"
                value={arCode}
                onChange={(e) => setArCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/50 bg-amber-950/20 text-amber-200 font-mono font-bold text-sm uppercase outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                required
                title="Código da Autorização de Remessa (AR)"
              />
            </div>
          </div>

          {/* Faixas do Plano de Amostragem */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Faixas do Plano de Amostragem
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {sampleRanges.length} {sampleRanges.length === 1 ? 'faixa' : 'faixas'}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {sampleRanges.map((range, idx) => {
                const singleCheck = parseSampleRange(range.firstSampleCode, range.lastSampleCode);
                const subCount = singleCheck.isValid ? singleCheck.count : 0;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 flex flex-col gap-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                        Faixa {idx + 1}
                      </span>

                      {subCount > 0 && (
                        <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          {subCount} amostras
                        </span>
                      )}

                      {sampleRanges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRange(idx)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors ml-auto"
                          title="Remover esta faixa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Primeira Amostra: *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: S01637"
                          value={range.firstSampleCode}
                          onChange={(e) => handleUpdateRange(idx, 'firstSampleCode', e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 font-mono text-white font-bold outline-none focus:border-amber-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Última Amostra: *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: S01706"
                          value={range.lastSampleCode}
                          onChange={(e) => handleUpdateRange(idx, 'lastSampleCode', e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 font-mono text-white font-bold outline-none focus:border-amber-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-start pt-1">
              <button
                type="button"
                onClick={handleAddRange}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar faixa
              </button>
            </div>

            {/* Auto AR Breakdown Banner */}
            {totalSamples > 0 && multiCheck.isValid && (
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/80 text-xs flex flex-col gap-1.5 font-mono mt-1">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>
                    Total Calculado: {totalSamples} amostras ({sampleRanges.length} {sampleRanges.length === 1 ? 'faixa' : 'faixas'})
                  </span>
                  <span className="text-cyan-400 bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-700">
                    {numARs} {numARs === 1 ? 'Remessa (AR)' : 'Remessas (ARs)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {numARs === 1 ? (
                    <>
                      Ao salvar, será gerado automaticamente <strong className="text-cyan-300 font-mono">1 AR</strong> contendo as {totalSamples} amostras somadas com a configuração inserida.
                    </>
                  ) : (
                    <>
                      Por exceder 200 amostras, serão gerados automaticamente <strong className="text-cyan-300 font-mono">{numARs} ARs</strong> distribuídos de forma equilibrada (~{Math.round(totalSamples / numARs)} amostras por AR).
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* QA/QC Standard Control Samples Section */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-purple-500/30">
            <QaqcGridInput
              key={`new-hole-grid-${modalSessionId}`}
              resetKey={modalSessionId}
              initialSamples={[]}
              onChange={setQaqcSamples}
              oreasStockEntries={oreasStockEntries}
              ars={ars}
            />
          </div>

          {/* Peso do Envio & Data de Envio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Peso Total da Amostragem (kg)</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 45.8"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono font-bold text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Data do Envio</span>
              </label>
              <input
                type="date"
                value={shipmentDate}
                onChange={(e) => setShipmentDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-medium outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Observações do Plano de Amostragem
            </label>
            <input
              type="text"
              placeholder="Ex: Laboratório ALS, Lote Especial"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-medium outline-none focus:border-amber-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar e Gerar AR(s)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

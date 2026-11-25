import React, { useState, useEffect, useMemo } from 'react';
import { HoleType, QaQcSample, OreasStockEntry, SampleShipmentAR, SampleRange, User } from '../types';
import { parseSampleRange, parseSampleRanges, getNextArCode } from '../utils/calculator';
import {
  HOLE_TYPE_CONFIG,
  HOLE_TYPE_ORDER,
  normalizeSampleCode,
  validateHoleNameForType,
  validateSampleRangesForHoleType,
  validateQaqcSamplesForHoleType,
} from '../constants/holeTypes';
import { QaqcGridInput } from './QaqcGridInput';
import {
  X,
  CheckCircle2,
  UserCheck,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Scale,
  Calendar,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface NewHoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holeData: {
    code: string;
    holeType: HoleType;
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
  const [selectedHoleType, setSelectedHoleType] = useState<HoleType | null>(null);
  const [step, setStep] = useState<'select-type' | 'form'>('select-type');

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
    setSelectedHoleType(null);
    setStep('select-type');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = () => {
    resetAllFields();
    onClose();
  };

  // Real-time hole name, sample range & QA/QC validation (derived cleanly, zero loops)
  const holeNameValidation = useMemo(
    () => validateHoleNameForType(code, selectedHoleType),
    [code, selectedHoleType]
  );

  const rangeLetterValidation = useMemo(
    () => validateSampleRangesForHoleType(sampleRanges, selectedHoleType),
    [sampleRanges, selectedHoleType]
  );

  const qaqcLetterValidation = useMemo(
    () => validateQaqcSamplesForHoleType(qaqcSamples, sampleRanges, selectedHoleType),
    [qaqcSamples, sampleRanges, selectedHoleType]
  );

  if (!isOpen) return null;

  const activeTypeConfig = selectedHoleType ? HOLE_TYPE_CONFIG[selectedHoleType] : null;
  const hasRealTimeErrors =
    !holeNameValidation.isValid || !rangeLetterValidation.isValid || !qaqcLetterValidation.isValid;

  // Real-time multi-range sample calculation
  const multiCheck = parseSampleRanges(sampleRanges);
  const totalSamples = multiCheck.isValid ? multiCheck.totalCount : 0;
  const numARs = totalSamples > 0 ? Math.ceil(totalSamples / 200) : 0;

  const handleSelectType = (type: HoleType) => {
    setSelectedHoleType(type);
    setStep('form');
    setErrorMsg('');
  };

  const handleAddRange = () => {
    setSampleRanges((prev) => [...prev, { firstSampleCode: '', lastSampleCode: '' }]);
    setErrorMsg('');
  };

  const handleRemoveRange = (index: number) => {
    if (sampleRanges.length <= 1) return;
    setSampleRanges((prev) => prev.filter((_, i) => i !== index));
    setErrorMsg('');
  };

  const handleUpdateRange = (index: number, field: keyof SampleRange, value: string) => {
    setErrorMsg('');
    setSampleRanges((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value.toUpperCase() } : r))
    );
  };

  const handleBlurRange = (index: number, field: keyof SampleRange, value: string) => {
    const normalized = normalizeSampleCode(value);
    if (normalized !== value) {
      handleUpdateRange(index, field, normalized);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedHoleType) {
      setStep('select-type');
      setErrorMsg('Selecione o tipo de furo antes de salvar.');
      return;
    }

    const trimmedCode = normalizeSampleCode(code);
    const trimmedTarget = normalizeSampleCode(target) || 'GERAL';

    if (!trimmedCode) {
      setErrorMsg('Informe o nome ou código do furo/amostra (ex: GUD-26-082).');
      return;
    }

    const submitNameValidation = validateHoleNameForType(trimmedCode, selectedHoleType);
    if (!submitNameValidation.isValid) {
      setErrorMsg(submitNameValidation.errorMessage || 'Prefixo do nome do furo inválido.');
      return;
    }

    const cleanedRanges = sampleRanges
      .map((r) => ({
        firstSampleCode: normalizeSampleCode(r.firstSampleCode),
        lastSampleCode: normalizeSampleCode(r.lastSampleCode),
      }))
      .filter((r) => r.firstSampleCode !== '' || r.lastSampleCode !== '');

    if (cleanedRanges.length === 0) {
      setErrorMsg('Adicione ao menos uma faixa de amostragem válida.');
      return;
    }

    const incompleteRangeIdx = cleanedRanges.findIndex(
      (r) => !r.firstSampleCode || !r.lastSampleCode
    );
    if (incompleteRangeIdx !== -1) {
      setErrorMsg(
        cleanedRanges.length > 1
          ? `Preencha a primeira e a última amostra na Faixa ${incompleteRangeIdx + 1}.`
          : 'Preencha a primeira e a última amostra da faixa.'
      );
      return;
    }

    // Validação de letra do tipo nas faixas (também captura colagens de planilha)
    const submitRangeValidation = validateSampleRangesForHoleType(cleanedRanges, selectedHoleType);
    if (!submitRangeValidation.isValid) {
      setErrorMsg(submitRangeValidation.messages[0]);
      return;
    }

    const checkResult = parseSampleRanges(cleanedRanges);
    if (!checkResult.isValid || checkResult.totalCount <= 0) {
      setErrorMsg(checkResult.error || 'Faixas de amostra inválidas. Verifique os códigos informados.');
      return;
    }

    const cleanedQaqc = qaqcSamples
      .map((q) => ({ ...q, code: normalizeSampleCode(q.code) }))
      .filter((q) => q.code !== '');

    // Validação de letra dos padrões QA/QC (OREAS, BLK, DUP)
    const submitQaqcValidation = validateQaqcSamplesForHoleType(
      cleanedQaqc,
      cleanedRanges,
      selectedHoleType
    );
    if (!submitQaqcValidation.isValid) {
      setErrorMsg(submitQaqcValidation.messages[0]);
      return;
    }

    const numWeight = typeof weightKg === 'string' ? parseFloat(weightKg.replace(',', '.')) : weightKg;

    const firstSampleCode = cleanedRanges[0].firstSampleCode;
    const lastSampleCode = cleanedRanges[cleanedRanges.length - 1].lastSampleCode;

    onSave({
      code: trimmedCode,
      holeType: selectedHoleType,
      target: trimmedTarget,
      firstSampleCode,
      lastSampleCode,
      sampleRanges: cleanedRanges,
      calculatedSampleCount: checkResult.totalCount,
      weightKg: isNaN(numWeight) || numWeight < 0 ? 0 : Number(numWeight.toFixed(2)),
      shipmentDate,
      notes: notes.trim() || undefined,
      qaqcSamples: cleanedQaqc,
      arCode: normalizeSampleCode(arCode) || undefined,
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

  const expectedQaqcHint =
    qaqcLetterValidation.expectedLetters.length === 1
      ? qaqcLetterValidation.expectedLetters[0]
      : activeTypeConfig?.allowedLetters[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl xl:max-w-6xl w-full shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              {step === 'select-type' ? <Layers className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {step === 'select-type'
                  ? 'Cadastrar Furo / Plano — Tipo de Furo'
                  : 'Cadastrar Amostragem e Padrões QA/QC'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {step === 'select-type'
                  ? 'Etapa 1 de 2: escolha o tipo antes de preencher faixas e padrões QA/QC'
                  : 'Etapa 2 de 2: configuração do plano de amostragem, QA/QC, peso e data de envio'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Fechar"
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

        {/* STEP 1: Escolher o tipo de furo */}
        {(step === 'select-type' || !selectedHoleType) && (
          <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-base sm:text-lg font-black text-white">
                  Qual tipo de furo será criado?
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  O sistema validará automaticamente a letra inicial das amostras e dos padrões QA/QC conforme o tipo escolhido.
                </p>
              </div>
              {selectedHoleType && (
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Manter {HOLE_TYPE_CONFIG[selectedHoleType].label}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {HOLE_TYPE_ORDER.map((typeKey) => {
                const cfg = HOLE_TYPE_CONFIG[typeKey];
                const isSelected = selectedHoleType === typeKey;

                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => handleSelectType(typeKey)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 min-h-[124px] shadow-md ${
                      cfg.cardClass
                    } ${isSelected ? 'ring-2 ring-white/50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-lg font-black text-white block">
                          {cfg.label}
                        </span>
                        <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black ${cfg.badgeClass}`}>
                          Letra: {cfg.letterHint}
                        </span>
                      </div>
                      <ChevronRight className={`w-5 h-5 shrink-0 mt-1 ${cfg.accentTextClass}`} />
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {cfg.description}
                      </p>
                      <span className="text-[11px] font-mono text-slate-400">
                        Ex: {cfg.exampleStart} → {cfg.exampleEnd}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Formulário completo com tipo visível no topo e validação */}
        {selectedHoleType && (
          <form
            onSubmit={handleSubmit}
            className={
              step === 'form'
                ? 'p-6 overflow-y-auto flex-1 flex flex-col gap-5'
                : 'hidden'
            }
          >
            {/* Selected Type Banner + Trocar Tipo */}
            {activeTypeConfig && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tipo escolhido:
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-black ${activeTypeConfig.badgeClass}`}>
                    {activeTypeConfig.label}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    Letra permitida: <strong className="text-white">{activeTypeConfig.letterHint}</strong>
                    {activeTypeConfig.requiredNamePrefix && (
                      <>
                        {' '}• Prefixo do furo:{' '}
                        <strong className="text-white">{activeTypeConfig.requiredNamePrefix}</strong>
                      </>
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('select-type')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Trocar tipo</span>
                </button>
              </div>
            )}

            {/* Submit or real-time validation error summary */}
            {(errorMsg || hasRealTimeErrors) && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs font-semibold flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-red-300 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg || 'Corrija os campos destacados antes de salvar:'}</span>
                </div>
                {hasRealTimeErrors && (
                  <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-red-200 font-medium">
                    {[
                      ...(holeNameValidation.errorMessage ? [holeNameValidation.errorMessage] : []),
                      ...rangeLetterValidation.messages,
                      ...qaqcLetterValidation.messages,
                    ]
                      .filter((msg) => msg !== errorMsg)
                      .map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                  </ul>
                )}
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
                  placeholder={`Ex: ${activeTypeConfig?.exampleHoleName || 'GUD-26-082'}`}
                  value={code}
                  onChange={(e) => {
                    setErrorMsg('');
                    setCode(e.target.value.toUpperCase());
                  }}
                  onBlur={(e) => setCode(normalizeSampleCode(e.target.value))}
                  aria-invalid={!holeNameValidation.isValid}
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono font-bold uppercase outline-none transition-colors ${
                    !holeNameValidation.isValid
                      ? 'border-red-500 bg-red-950/60 text-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400/50'
                      : 'border-slate-700 bg-slate-800 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                  }`}
                  required
                />
                {!holeNameValidation.isValid && holeNameValidation.errorMessage && (
                  <p className="mt-1 text-[11px] text-red-300 font-medium">
                    {holeNameValidation.errorMessage}
                  </p>
                )}
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
                  onBlur={(e) => setTarget(normalizeSampleCode(e.target.value))}
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
                  onBlur={(e) => setArCode(normalizeSampleCode(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/50 bg-amber-950/20 text-amber-200 font-mono font-bold text-sm uppercase outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  required
                  title="Código da Autorização de Remessa (AR)"
                />
              </div>
            </div>

            {/* Faixas do Plano de Amostragem */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Faixas do Plano de Amostragem
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {sampleRanges.length} {sampleRanges.length === 1 ? 'faixa' : 'faixas'} • Padrão:{' '}
                  <strong className="text-slate-200 font-mono">{activeTypeConfig?.letterHint}</strong>
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {sampleRanges.map((range, idx) => {
                  const firstErr = rangeLetterValidation.fieldErrors[`${idx}:first`];
                  const lastErr = rangeLetterValidation.fieldErrors[`${idx}:last`];
                  const singleCheck = parseSampleRange(range.firstSampleCode, range.lastSampleCode);
                  const subCount =
                    !firstErr && !lastErr && singleCheck.isValid ? singleCheck.count : 0;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl bg-slate-900 border flex flex-col gap-2 relative ${
                        firstErr || lastErr ? 'border-red-600/80' : 'border-slate-700/80'
                      }`}
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
                            placeholder={`Ex: ${activeTypeConfig?.exampleStart || 'D00001'}`}
                            value={range.firstSampleCode}
                            onChange={(e) => handleUpdateRange(idx, 'firstSampleCode', e.target.value)}
                            onBlur={(e) => handleBlurRange(idx, 'firstSampleCode', e.target.value)}
                            aria-invalid={Boolean(firstErr)}
                            className={`w-full px-3.5 py-2 rounded-lg border font-mono font-bold outline-none transition-colors ${
                              firstErr
                                ? 'border-red-500 bg-red-950/60 text-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400/50'
                                : 'border-slate-700 bg-slate-800 text-white focus:border-amber-500'
                            }`}
                            required
                          />
                          {firstErr && (
                            <p className="mt-1 text-[11px] text-red-300 font-medium">{firstErr}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Última Amostra: *
                          </label>
                          <input
                            type="text"
                            placeholder={`Ex: ${activeTypeConfig?.exampleEnd || 'D00150'}`}
                            value={range.lastSampleCode}
                            onChange={(e) => handleUpdateRange(idx, 'lastSampleCode', e.target.value)}
                            onBlur={(e) => handleBlurRange(idx, 'lastSampleCode', e.target.value)}
                            aria-invalid={Boolean(lastErr)}
                            className={`w-full px-3.5 py-2 rounded-lg border font-mono font-bold outline-none transition-colors ${
                              lastErr
                                ? 'border-red-500 bg-red-950/60 text-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400/50'
                                : 'border-slate-700 bg-slate-800 text-white focus:border-amber-500'
                            }`}
                            required
                          />
                          {lastErr && (
                            <p className="mt-1 text-[11px] text-red-300 font-medium">{lastErr}</p>
                          )}
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
              {totalSamples > 0 && multiCheck.isValid && !hasRealTimeErrors && (
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/80 text-xs flex flex-col gap-1.5 font-mono mt-1">
                  <div className="flex items-center justify-between text-cyan-300 font-bold">
                    <span>
                      Total Calculado: {totalSamples} amostras ({sampleRanges.length}{' '}
                      {sampleRanges.length === 1 ? 'faixa' : 'faixas'})
                    </span>
                    <span className="text-cyan-400 bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-700">
                      {numARs} {numARs === 1 ? 'Remessa (AR)' : 'Remessas (ARs)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {numARs === 1 ? (
                      <>
                        Ao salvar, será gerado automaticamente{' '}
                        <strong className="text-cyan-300 font-mono">1 AR</strong> contendo as{' '}
                        {totalSamples} amostras somadas com a configuração inserida.
                      </>
                    ) : (
                      <>
                        Por exceder 200 amostras, serão gerados automaticamente{' '}
                        <strong className="text-cyan-300 font-mono">{numARs} ARs</strong> distribuídos
                        de forma equilibrada (~{Math.round(totalSamples / numARs)} amostras por AR).
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
                codeErrorsById={qaqcLetterValidation.errorsById}
                codeErrorListById={qaqcLetterValidation.errorListById}
                codeValidationMessages={qaqcLetterValidation.messages}
                invalidCodeCount={qaqcLetterValidation.invalidCount}
                expectedLetterHint={expectedQaqcHint}
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

            {/* Observações (Motivo do Reenvio quando Reenvio/Reanálise) */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                {selectedHoleType === 'Reenvio'
                  ? 'Observações / Motivo do Reenvio ou Reanálise'
                  : 'Observações do Plano de Amostragem'}
              </label>
              <input
                type="text"
                placeholder={
                  selectedHoleType === 'Reenvio'
                    ? 'Ex: Reanálise de teor elevado, reenvio de polpa ou solicitação do laboratório'
                    : 'Ex: Laboratório ALS, Lote Especial'
                }
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
                disabled={hasRealTimeErrors}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                  hasRealTimeErrors
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar e Gerar AR(s)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

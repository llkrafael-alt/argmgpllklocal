import React, { useState, useEffect } from 'react';
import { DrillHole, SampleShipmentAR, User, QaQcSample, OreasStockEntry, SampleRange } from '../types';
import { parseSampleRange, parseSampleCodeDetails, getNextArCode, generatePackingPlan, getArCodeDisplay } from '../utils/calculator';
import { getAvailableStockForCode, getSampleOreasProduct } from '../utils/oreasStock';
import { QaqcGridInput } from './QaqcGridInput';
import {
  Truck,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  Plus,
  Trash2,
  ShieldCheck,
  Edit2,
  Boxes,
} from 'lucide-react';

interface CreateARModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (arData: Omit<SampleShipmentAR, 'id' | 'createdAt'>, existingArId?: string) => void;
  holes: DrillHole[];
  ars: SampleShipmentAR[];
  oreasStockEntries?: OreasStockEntry[];
  activeUser: User;
  initialHoleId?: string;
  arToEdit?: SampleShipmentAR | null;
}

// Robust resolution of QA/QC samples with intelligent recovery and multi-AR linkage
export function resolveEffectiveQaqc(
  ar: SampleShipmentAR | null | undefined,
  holes: DrillHole[],
  allArs: SampleShipmentAR[]
): {
  effectiveSamples: QaQcSample[];
  source: 'ar_direto' | 'furo_fallback' | 'irmãos_mesmo_furo' | 'nenhum';
  diagnosticInfo: Record<string, any>;
} {
  if (!ar) {
    return {
      effectiveSamples: [],
      source: 'nenhum',
      diagnosticInfo: { modo: 'NOVO_AR' },
    };
  }

  // 1. Direct samples on the AR
  if (Array.isArray(ar.qaqcSamples) && ar.qaqcSamples.length > 0) {
    return {
      effectiveSamples: [...ar.qaqcSamples],
      source: 'ar_direto',
      diagnosticInfo: {
        arId: ar.id,
        arCode: ar.arCode,
        drillHoleId: ar.drillHoleId,
        drillHoleCode: ar.drillHoleCode,
        quantidadeDireta: ar.qaqcSamples.length,
      },
    };
  }

  // 2. Check hole object (in case legacy data had qaqcSamples on hole)
  const holeObj =
    holes.find((h) => h.id === ar.drillHoleId) ||
    holes.find(
      (h) => h.code && ar.drillHoleCode && h.code.trim().toUpperCase() === ar.drillHoleCode.trim().toUpperCase()
    );

  if ((holeObj as any)?.qaqcSamples && (holeObj as any).qaqcSamples.length > 0) {
    return {
      effectiveSamples: [...(holeObj as any).qaqcSamples],
      source: 'furo_fallback',
      diagnosticInfo: {
        arId: ar.id,
        arCode: ar.arCode,
        holeId: holeObj?.id,
        holeCode: holeObj?.code,
        quantidadeDoFuro: (holeObj as any).qaqcSamples.length,
      },
    };
  }

  // 3. Check sibling ARs from the same hole (if AR was split or QAQC was attached to AR 1 of this hole)
  const siblingARs = allArs.filter(
    (a) =>
      a.id !== ar.id &&
      (a.drillHoleId === ar.drillHoleId ||
        (a.drillHoleCode &&
          ar.drillHoleCode &&
          a.drillHoleCode.trim().toUpperCase() === ar.drillHoleCode.trim().toUpperCase()))
  );

  const siblingSamplesWithAr: { sample: QaQcSample; fromArCode: string }[] = [];
  siblingARs.forEach((sib) => {
    (sib.qaqcSamples || []).forEach((s) => {
      siblingSamplesWithAr.push({ sample: s, fromArCode: sib.arCode });
    });
  });

  if (siblingSamplesWithAr.length > 0) {
    const startDetails = parseSampleCodeDetails(ar.startSampleCode);
    const endDetails = parseSampleCodeDetails(ar.endSampleCode);
    if (startDetails?.num !== undefined && endDetails?.num !== undefined) {
      const minNum = Math.min(startDetails.num, endDetails.num);
      const maxNum = Math.max(startDetails.num, endDetails.num);

      const matchedInThisArRange = siblingSamplesWithAr.filter((item) => {
        const sDet = parseSampleCodeDetails(item.sample.code);
        return sDet?.num !== undefined && sDet.num >= minNum && sDet.num <= maxNum;
      });

      if (matchedInThisArRange.length > 0) {
        return {
          effectiveSamples: matchedInThisArRange.map((item) => item.sample),
          source: 'irmãos_mesmo_furo',
          diagnosticInfo: {
            arId: ar.id,
            arCode: ar.arCode,
            faixaDesteAR: `${ar.startSampleCode} a ${ar.endSampleCode}`,
            quantidadeRecuperada: matchedInThisArRange.length,
            origens: matchedInThisArRange.map((i) => `${i.sample.code} (${i.sample.type}) de ${i.fromArCode}`),
          },
        };
      }
    }

    // Fallback: if this is the ONLY sibling or all QAQC was stored on AR 1 and this AR has 0 samples
    if (siblingARs.length === 1 && ar.sampleCount > 0) {
      return {
        effectiveSamples: siblingSamplesWithAr.map((item) => item.sample),
        source: 'irmãos_mesmo_furo',
        diagnosticInfo: {
          arId: ar.id,
          arCode: ar.arCode,
          nota: 'Herança de AR único do mesmo furo',
          quantidadeRecuperada: siblingSamplesWithAr.length,
        },
      };
    }
  }

  return {
    effectiveSamples: [],
    source: 'nenhum',
    diagnosticInfo: {
      arId: ar.id,
      arCode: ar.arCode,
      drillHoleId: ar.drillHoleId,
      totalARsIrmãos: siblingARs.length,
    },
  };
}

export const CreateARModal: React.FC<CreateARModalProps> = ({
  isOpen,
  onClose,
  onSave,
  holes,
  ars,
  oreasStockEntries = [],
  activeUser,
  initialHoleId,
  arToEdit,
}) => {
  const activeHoles = holes.filter((h) => !h.completedAt);
  const selectedHoleObj = holes.find((h) => h.id === (initialHoleId || activeHoles[0]?.id)) || holes[0];

  const initialResolvedQaqc = resolveEffectiveQaqc(arToEdit, holes, ars);

  const [holeId, setHoleId] = useState<string>(() => arToEdit?.drillHoleId || selectedHoleObj?.id || '');
  const [arCode, setArCode] = useState<string>(() => arToEdit?.arCode || (isOpen ? getNextArCode(ars) : ''));
  const [startSampleCode, setStartSampleCode] = useState<string>(() => arToEdit?.startSampleCode || selectedHoleObj?.firstSampleCode || '');
  const [endSampleCode, setEndSampleCode] = useState<string>(() => arToEdit?.endSampleCode || selectedHoleObj?.lastSampleCode || '');
  const [sampleCount, setSampleCount] = useState<number>(() => arToEdit?.sampleCount || selectedHoleObj?.calculatedSampleCount || 0);
  const [isManualCount, setIsManualCount] = useState<boolean>(false);
  const [volumeCount, setVolumeCount] = useState<number>(() => arToEdit?.volumeCount || 5);
  const [weightKg, setWeightKg] = useState<string | number>(() => arToEdit?.weightKg ?? 0);
  const [shipmentDate, setShipmentDate] = useState<string>(() => arToEdit?.shipmentDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>(() => arToEdit?.notes || '');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [modalKey, setModalKey] = useState<number>(() => Date.now());

  // QA/QC control samples list (initialized synchronously on first render!)
  const [qaqcSamples, setQaqcSamples] = useState<QaQcSample[]>(() => initialResolvedQaqc.effectiveSamples);

  const currentHole = holes.find((h) => h.id === holeId) || selectedHoleObj;

  // On opening or editing change, set form fields
  useEffect(() => {
    if (isOpen) {
      setModalKey((prev) => prev + 1);
      if (arToEdit) {
        // Edit Mode with smart QA/QC recovery
        const resolution = resolveEffectiveQaqc(arToEdit, holes, ars);

        // User requested diagnostic log:
        console.log('=== [DIAGNÓSTICO QA/QC - EDIÇÃO DA AR] ===', {
          criterioDeBusca: {
            arId: arToEdit.id,
            arCode: arToEdit.arCode,
            drillHoleId: arToEdit.drillHoleId,
            drillHoleCode: arToEdit.drillHoleCode,
            faixaAmostras: `${arToEdit.startSampleCode} até ${arToEdit.endSampleCode}`,
          },
          fonteDosPadroes: resolution.source,
          totalPadroesEncontrados: resolution.effectiveSamples.length,
          detalhesBusca: resolution.diagnosticInfo,
          padroes: resolution.effectiveSamples,
        });

        setHoleId(arToEdit.drillHoleId);
        setArCode(arToEdit.arCode);
        setStartSampleCode(arToEdit.startSampleCode);
        setEndSampleCode(arToEdit.endSampleCode);
        setSampleCount(arToEdit.sampleCount);
        setIsManualCount(false);
        setVolumeCount(arToEdit.volumeCount);
        setWeightKg(arToEdit.weightKg);
        setShipmentDate(arToEdit.shipmentDate);
        setNotes(arToEdit.notes || '');
        setQaqcSamples(resolution.effectiveSamples);
        setErrorMsg('');
      } else {
        // New Mode
        const targetHoleId = initialHoleId || activeHoles[0]?.id || holes[0]?.id || '';
        setHoleId(targetHoleId);
        const hole = holes.find((h) => h.id === targetHoleId);

        // Auto-suggest next global AR code
        const nextCode = getNextArCode(ars);
        setArCode(nextCode);

        if (hole) {
          setStartSampleCode(hole.firstSampleCode || '');
          setEndSampleCode(hole.lastSampleCode || '');

          if (hole.firstSampleCode && hole.lastSampleCode) {
            const parsed = parseSampleRange(hole.firstSampleCode, hole.lastSampleCode);
            if (parsed.isValid) {
              setSampleCount(Math.min(200, parsed.count));
            } else {
              setSampleCount(hole.calculatedSampleCount || 0);
            }
          } else {
            setSampleCount(0);
          }
        }

        setIsManualCount(false);
        setVolumeCount(5);
        setWeightKg(0);
        setShipmentDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setQaqcSamples([]);
        setErrorMsg('');
      }
    }
  }, [isOpen, initialHoleId, arToEdit?.id]);

  // Handle hole selection change
  const handleHoleChange = (newHoleId: string) => {
    setHoleId(newHoleId);
    const hole = holes.find((h) => h.id === newHoleId);
    if (hole && !arToEdit) {
      setStartSampleCode(hole.firstSampleCode || '');
      setEndSampleCode(hole.lastSampleCode || '');

      if (hole.firstSampleCode && hole.lastSampleCode) {
        const parsed = parseSampleRange(hole.firstSampleCode, hole.lastSampleCode);
        if (parsed.isValid) {
          setSampleCount(Math.min(200, parsed.count));
        } else {
          setSampleCount(hole.calculatedSampleCount || 0);
        }
      } else {
        setSampleCount(0);
      }
      // Reset QA/QC when switching hole for new AR
      setQaqcSamples([]);
      setModalKey((prev) => prev + 1);
    }
  };

  // Recalculate sample count when sample range codes change (if not manually overridden)
  useEffect(() => {
    if (!isManualCount && startSampleCode && endSampleCode) {
      const parsed = parseSampleRange(startSampleCode, endSampleCode);
      if (parsed.isValid) {
        setSampleCount(parsed.count);
      }
    }
  }, [startSampleCode, endSampleCode, isManualCount]);

  if (!isOpen) return null;

  if (!currentHole && !arToEdit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full text-center">
          <p className="text-slate-300 mb-4">
            Nenhum furo cadastrado para registrar envio de amostras (AR).
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const rangeCheck = parseSampleRange(startSampleCode, endSampleCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!arCode.trim()) {
      setErrorMsg('Informe o código da Autorização de Remessa (AR).');
      return;
    }

    if (!startSampleCode.trim() || !endSampleCode.trim()) {
      setErrorMsg('Informe a faixa de amostras (primeiro e último código).');
      return;
    }

    if (sampleCount <= 0) {
      setErrorMsg('A quantidade de amostras do AR deve ser maior que zero.');
      return;
    }

    if (sampleCount > 200) {
      setErrorMsg(
        `Limite de 200 amostras por AR excedido (${sampleCount} amostras). O regulamento exige dividir este furo em 2 ou mais ARs (máx 200 amostras por envio).`
      );
      return;
    }

    // Filter out invalid empty QA/QC rows
    const cleanedQaqc = qaqcSamples.filter((q) => q.code.trim() !== '');

    const numWeight = typeof weightKg === 'string' ? parseFloat(weightKg.replace(',', '.')) : weightKg;

    const cleanStartCode = startSampleCode.trim().toUpperCase();
    const cleanEndCode = endSampleCode.trim().toUpperCase();
    const normalizedRanges: SampleRange[] = [
      {
        firstSampleCode: cleanStartCode,
        lastSampleCode: cleanEndCode,
      },
    ];

    const effectiveStandardSize = arToEdit?.standardSize && arToEdit.standardSize > 0 ? arToEdit.standardSize : 10;

    // Automatically calculate volumes based on sample range packing plan using effective standard size
    const packingPlan = generatePackingPlan(cleanStartCode, cleanEndCode, effectiveStandardSize, normalizedRanges);
    const calculatedVolumes = packingPlan.isValid && packingPlan.totalVolumes > 0
      ? packingPlan.totalVolumes
      : Math.max(1, Math.ceil(sampleCount / effectiveStandardSize));

    let finalArCode = arCode.trim().toUpperCase();
    if (!finalArCode || finalArCode === 'ARGMGP-' || finalArCode === 'ARGMGP' || /^[A-Z]+-?$/i.test(finalArCode)) {
      finalArCode = getNextArCode(ars.filter((a) => a.id !== arToEdit?.id));
    }

    onSave(
      {
        arCode: finalArCode,
        drillHoleId: currentHole.id,
        drillHoleCode: currentHole.code,
        startSampleCode: cleanStartCode,
        endSampleCode: cleanEndCode,
        sampleRanges: normalizedRanges,
        sampleCount,
        volumeCount: calculatedVolumes,
        standardSize: effectiveStandardSize,
        weightKg: isNaN(numWeight) || numWeight < 0 ? 0 : Number(numWeight.toFixed(2)),
        shipmentDate,
        createdById: arToEdit?.createdById || activeUser.id,
        createdByName: arToEdit?.createdByName || activeUser.name,
        notes: notes.trim() || undefined,
        qaqcSamples: cleanedQaqc,
      },
      arToEdit?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl xl:max-w-6xl w-full shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              {arToEdit ? <Edit2 className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {arToEdit ? `Editar Remessa (${arToEdit.arCode})` : 'Gerar Remessa de Amostras (AR)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {arToEdit
                  ? 'Atualize qualquer campo do envio (peso, volumes, amostras de QA/QC)'
                  : 'Registro de envio (Autorização de Remessa) - Etapa 11'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AR Code (Global sequence) & Hole Select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-300">
                Código do AR (Sequencial)
              </label>
              <input
                type="text"
                value={arCode}
                onChange={(e) => setArCode(e.target.value)}
                placeholder="Ex: ARGMGP-300"
                className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 font-mono text-cyan-300 font-bold text-sm outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400">
                Sugerido automaticamente na sequência global.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-300">
                Furo de Sondagem
              </label>
              <select
                value={holeId}
                onChange={(e) => handleHoleChange(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono font-bold text-xs outline-none focus:border-cyan-500"
              >
                {holes.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.code} ({h.target})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sample Range Inputs */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-200">
              Faixa de Amostras Incluída no AR
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Amostra Inicial:
                </label>
                <input
                  type="text"
                  value={startSampleCode}
                  onChange={(e) => setStartSampleCode(e.target.value.toUpperCase())}
                  placeholder="Ex: D01036"
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 font-mono text-white text-xs font-bold outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Amostra Final:
                </label>
                <input
                  type="text"
                  value={endSampleCode}
                  onChange={(e) => setEndSampleCode(e.target.value.toUpperCase())}
                  placeholder="Ex: D01135"
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 font-mono text-white text-xs font-bold outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Calculated Sample Count vs Limit check */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  Qtd de Amostras:
                </span>
                <input
                  type="number"
                  value={sampleCount}
                  onChange={(e) => {
                    setSampleCount(Number(e.target.value));
                    setIsManualCount(true);
                  }}
                  className="w-24 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 font-mono text-cyan-300 font-bold text-sm text-center outline-none"
                />
              </div>

              {sampleCount > 200 ? (
                <span className="text-[11px] text-red-400 font-bold flex items-center gap-1 bg-red-950/60 px-2 py-1 rounded border border-red-800">
                  <AlertTriangle className="w-3.5 h-3.5" /> Excede limite (máx 200)
                </span>
              ) : rangeCheck.isValid ? (
                <span className="text-[11px] text-emerald-400 font-medium">
                  ✓ Calculado automaticamente
                </span>
              ) : null}
            </div>

            {/* Rule Callout */}
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Regra de Amostragem:</strong> Cada AR comporta no máximo <strong>200 amostras</strong>. Se o furo possui mais de 200 amostras (ex: 201), gere 2 ARs separados (ex: 100 + 101 amostras).
              </span>
            </div>
          </div>

          {/* QA/QC Standard Control Samples Section */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/30">
            <QaqcGridInput
              key={`edit-ar-${arToEdit ? arToEdit.id : 'new-ar'}-${modalKey}`}
              resetKey={modalKey}
              initialSamples={qaqcSamples}
              onChange={setQaqcSamples}
              oreasStockEntries={oreasStockEntries}
              ars={ars}
              currentArId={arToEdit?.id}
            />
          </div>

          {/* Weight & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Peso do Envio (kg)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono font-bold text-xs outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Data do Envio
              </label>
              <input
                type="date"
                value={shipmentDate}
                onChange={(e) => setShipmentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs font-medium outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Observações
            </label>
            <input
              type="text"
              placeholder="Ex: Laboratório ALS, Lote 1/2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs outline-none focus:border-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{arToEdit ? 'Salvar Alterações no AR' : 'Confirmar Envio (AR)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

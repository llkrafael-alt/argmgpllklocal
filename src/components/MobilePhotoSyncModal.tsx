import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Smartphone,
  QrCode,
  FolderDown,
  Upload,
  CheckCircle2,
  HardDrive,
  Copy,
  ExternalLink,
  Sparkles,
  X,
  FileImage,
  RefreshCw,
  Tag,
  AlertCircle,
  Layers,
  Check,
} from 'lucide-react';
import { DrillHole, SampleShipmentAR, QAQCSamplePhoto, User } from '../types';
import { createQRCodeDataUrl } from '../utils/qrCode';
import { savePhotosToDiskFolder, FolderSyncState } from '../utils/fileSystemFolderSync';

interface MobilePhotoSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  holes: DrillHole[];
  ars: SampleShipmentAR[];
  photos: QAQCSamplePhoto[];
  activeUser: User;
  folderState: FolderSyncState;
  onUploadPhoto: (
    arId: string,
    file: File,
    sampleCode?: string,
    sampleType?: string,
    onProgress?: (percent: number, statusText: string) => void
  ) => Promise<void>;
  onTriggerToast: (msg: string) => void;
  initialHoleId?: string;
  initialArId?: string;
}

export const MobilePhotoSyncModal: React.FC<MobilePhotoSyncModalProps> = ({
  isOpen,
  onClose,
  holes,
  ars,
  photos,
  activeUser,
  folderState,
  onUploadPhoto,
  onTriggerToast,
  initialHoleId,
  initialArId,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'qrcode' | 'batch' | 'folder'>('camera');

  // Camera Capture state
  const [selectedHoleId, setSelectedHoleId] = useState<string>(initialHoleId || (holes[0]?.id || ''));
  const [selectedArId, setSelectedArId] = useState<string>(initialArId || '');
  const [sampleType, setSampleType] = useState<string>('Padrão OREAS');
  const [sampleCode, setSampleCode] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [lastUploadedPhoto, setLastUploadedPhoto] = useState<QAQCSamplePhoto | null>(null);

  // Batch dropzone state
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  // Disk write state
  const [isWritingToDisk, setIsWritingToDisk] = useState(false);
  const [diskProgressText, setDiskProgressText] = useState('');

  const fileCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const batchInputRef = useRef<HTMLInputElement | null>(null);

  // Update selected AR when hole changes
  useEffect(() => {
    if (selectedHoleId) {
      const holeARs = ars.filter((a) => a.drillHoleId === selectedHoleId);
      if (holeARs.length > 0 && !holeARs.some((a) => a.id === selectedArId)) {
        setSelectedArId(holeARs[0].id);
      } else if (holeARs.length === 0) {
        setSelectedArId('');
      }
    }
  }, [selectedHoleId, ars, selectedArId]);

  // QR Code state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [customHostIp, setCustomHostIp] = useState<string>('');

  // Determine current effective URL (online or local IP)
  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : '';
  const effectiveUrl = customHostIp.trim()
    ? `http://${customHostIp.trim().replace(/^https?:\/\//, '')}:3000`
    : currentAppUrl;

  useEffect(() => {
    let isMounted = true;
    if (effectiveUrl) {
      createQRCodeDataUrl(effectiveUrl, 260).then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [effectiveUrl]);

  // Handle single camera capture
  const handleSingleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Determine target AR
    let targetArId = selectedArId;
    if (!targetArId) {
      const availableAR = ars.find((a) => a.drillHoleId === selectedHoleId) || ars[0];
      if (availableAR) targetArId = availableAR.id;
    }

    if (!targetArId) {
      onTriggerToast('Cadastre uma Remessa (AR) ou selecione um Furo para vincular a foto.');
      return;
    }

    setIsCapturing(true);
    setCaptureProgress(10);
    setStatusText('Processando e otimizando imagem...');

    try {
      await onUploadPhoto(
        targetArId,
        file,
        sampleCode.trim() || undefined,
        sampleType,
        (percent, text) => {
          setCaptureProgress(percent);
          setStatusText(text);
        }
      );

      onTriggerToast(`Foto da amostra ${sampleCode || sampleType} salva com sucesso!`);
      // Reset input
      if (fileCameraInputRef.current) fileCameraInputRef.current.value = '';
      if (fileGalleryInputRef.current) fileGalleryInputRef.current.value = '';
      setSampleCode('');
    } catch (err: any) {
      onTriggerToast('Erro ao salvar foto: ' + (err?.message || 'Falha de conexão'));
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle Batch File selection
  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const list = Array.from(e.target.files);
      setBatchFiles((prev) => [...prev, ...list]);
    }
  };

  // Process Batch Photos
  const handleProcessBatch = async () => {
    if (batchFiles.length === 0) return;
    if (!selectedArId) {
      onTriggerToast('Selecione uma Remessa (AR) para onde as fotos serão vinculadas.');
      return;
    }

    setIsProcessingBatch(true);
    let successCount = 0;

    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i];
      setBatchProgress(Math.round(((i + 1) / batchFiles.length) * 100));

      // Attempt to infer sample code from filename (e.g. AM-04289.jpg -> AM-04289)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const inferredCode = nameWithoutExt.length > 2 ? nameWithoutExt : undefined;
      const inferredType = nameWithoutExt.toLowerCase().includes('branco')
        ? 'Branco Fino'
        : nameWithoutExt.toLowerCase().includes('duplicata')
        ? 'Duplicata'
        : 'Padrão OREAS';

      try {
        await onUploadPhoto(selectedArId, file, inferredCode, inferredType);
        successCount++;
      } catch (err) {
        console.warn('Erro ao processar foto em lote:', file.name, err);
      }
    }

    setIsProcessingBatch(false);
    setBatchFiles([]);
    onTriggerToast(`${successCount} foto(s) importadas e vinculadas com sucesso!`);
  };

  // Save all photos to PC folder
  const handleSaveAllPhotosToDisk = async () => {
    if (!folderState.isLinked) {
      onTriggerToast('Vincule uma pasta do computador primeiro na aba "Pasta PC".');
      return;
    }

    if (photos.length === 0) {
      onTriggerToast('Nenhuma foto cadastrada no sistema para salvar.');
      return;
    }

    setIsWritingToDisk(true);
    try {
      const res = await savePhotosToDiskFolder(photos, (saved, total, name) => {
        setDiskProgressText(`Gravando ${saved + 1}/${total}: ${name}`);
      });
      onTriggerToast(res.message);
    } catch (err: any) {
      onTriggerToast('Erro ao gravar fotos no disco: ' + err?.message);
    } finally {
      setIsWritingToDisk(false);
      setDiskProgressText('');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentHole = holes.find((h) => h.id === selectedHoleId);
  const currentAr = ars.find((a) => a.id === selectedArId);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase font-mono tracking-tight">
                  Captura de Fotos & Envio do Celular
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold font-mono">
                  SINC NO DISCO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tire fotos no celular via Wi-Fi do galpão ou importe do computador para salvar tudo na máquina
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 sm:px-6 overflow-x-auto gap-2 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'camera'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Ponto de Coleta (Câmera)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qrcode')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'qrcode'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Conectar Celular (QR Code)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'batch'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importar em Lote (PC/Cabo)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('folder')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'folder'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Salvar no Disco ({photos.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5">
          {/* TAB 1: PONTO DE COLETA / CÂMERA */}
          {activeTab === 'camera' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Hole Select */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                      Furo de Sondagem
                    </label>
                    <select
                      value={selectedHoleId}
                      onChange={(e) => setSelectedHoleId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 outline-none"
                    >
                      {holes.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.code} ({h.target || 'Geral'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AR Select */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                      Remessa (AR)
                    </label>
                    <select
                      value={selectedArId}
                      onChange={(e) => setSelectedArId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 outline-none"
                    >
                      {ars
                        .filter((a) => a.drillHoleId === selectedHoleId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.arCode} - {a.sampleCount} amostras
                          </option>
                        ))}
                      {ars.filter((a) => a.drillHoleId === selectedHoleId).length === 0 && (
                        <option value="">Sem AR cadastrada para este furo</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Sample Type */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                      Tipo de Foto / QAQC
                    </label>
                    <select
                      value={sampleType}
                      onChange={(e) => setSampleType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500 outline-none"
                    >
                      <option value="Padrão OREAS">Padrão OREAS (CRM)</option>
                      <option value="Branco Fino">Branco Fino / Grosso</option>
                      <option value="Duplicata">Duplicata de Testemunho</option>
                      <option value="Caixa de Testemunho">Caixa de Testemunho / Core</option>
                      <option value="Lacre de Remessa">Lacre de Saco / Remessa</option>
                      <option value="Geral">Visão Geral do Galpão</option>
                    </select>
                  </div>

                  {/* Sample Code input */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                      Código da Amostra (Ex: AM-04289)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 205421 ou AM-04289"
                      value={sampleCode}
                      onChange={(e) => setSampleCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono uppercase focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Camera & Gallery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Native Phone Camera Input (capture="environment") */}
                <input
                  ref={fileCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleSingleCapture}
                />
                <button
                  type="button"
                  disabled={isCapturing}
                  onClick={() => fileCameraInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
                >
                  <Camera className="w-6 h-6 shrink-0" />
                  <div className="text-left">
                    <div>Tirar Foto com a Câmera</div>
                    <div className="text-[10px] font-normal opacity-80">
                      Aciona a câmera traseira do celular instantaneamente
                    </div>
                  </div>
                </button>

                {/* Gallery Upload Input */}
                <input
                  ref={fileGalleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSingleCapture}
                />
                <button
                  type="button"
                  disabled={isCapturing}
                  onClick={() => fileGalleryInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-3 border border-slate-700 shadow-md"
                >
                  <Upload className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div className="text-left">
                    <div>Escolher da Galeria / Arquivos</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Selecionar foto já tirada no dispositivo
                    </div>
                  </div>
                </button>
              </div>

              {/* Progress feedback */}
              {isCapturing && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-emerald-300 font-mono">
                    <span>{statusText || 'Gravando foto...'}</span>
                    <span>{captureProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-300"
                      style={{ width: `${captureProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONECTAR CELULAR / QR CODE NA REDE LOCAL */}
          {activeTab === 'qrcode' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="p-3.5 bg-white rounded-2xl shadow-2xl shrink-0 flex items-center justify-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code de Acesso Móvel"
                      className="w-56 h-56 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs font-mono">
                      Gerando QR Code...
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 text-xs text-slate-300 leading-relaxed flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <span className="font-bold text-white text-sm">
                      Conecte o Celular no Wi-Fi ou Rede
                    </span>
                  </div>
                  <p className="text-slate-400 pl-8">
                    Se for usar na rede local do galpão (offline), digite o IP do computador abaixo. Se estiver usando a versão online compartilhada, basta escanear o código diretamente.
                  </p>

                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <span className="font-bold text-white text-sm">
                      Aponte a Câmera do Celular
                    </span>
                  </div>
                  <p className="text-slate-400 pl-8">
                    Abra o app de câmera do smartphone (ou leitor de QR Code) e mire no código ao lado. O link abrirá o sistema no seu navegador móvel.
                  </p>

                  {/* IP do Computador na Rede Local (Opcional) */}
                  <div className="mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      IP Local do Computador (Para Rede Wi-Fi Offline)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ex: 192.168.1.50 (deixe em branco se usar o link acima)"
                        value={customHostIp}
                        onChange={(e) => setCustomHostIp(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-emerald-300 text-xs font-mono outline-none focus:border-emerald-500"
                      />
                      {customHostIp && (
                        <button
                          type="button"
                          onClick={() => setCustomHostIp('')}
                          className="text-[11px] text-slate-400 hover:text-white px-2 py-1"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Link display & copy */}
                  <div className="mt-1 pt-3 border-t border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={effectiveUrl}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 text-xs font-mono select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(effectiveUrl);
                        onTriggerToast('Endereço copiado para a área de transferência!');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORTADOR EM LOTE (CABO USB / PENDRIVE / PASTA DO PC) */}
          {activeTab === 'batch' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      Arrastar e Soltar Fotos em Lote
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Copie fotos do celular via cabo USB para o computador e solte-as aqui. O app detecta o código da amostra no nome do arquivo (ex: <code className="text-emerald-400 font-mono">AM-04289.jpg</code>).
                    </p>
                  </div>
                </div>

                {/* Dropzone container */}
                <div
                  onClick={() => batchInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-900/50 flex flex-col items-center justify-center gap-2"
                >
                  <FileImage className="w-8 h-8 text-emerald-400" />
                  <p className="text-xs font-bold text-white">
                    Clique para selecionar ou arraste múltiplas fotos aqui
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Formatos suportados: JPG, PNG, WEBP (várias fotos simultâneas)
                  </p>
                  <input
                    ref={batchInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleBatchFileSelect}
                  />
                </div>

                {/* Selected batch files preview */}
                {batchFiles.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">
                        {batchFiles.length} foto(s) selecionadas para envio:
                      </span>
                      <button
                        type="button"
                        onClick={() => setBatchFiles([])}
                        className="text-red-400 hover:text-red-300 text-[11px]"
                      >
                        Limpar seleção
                      </button>
                    </div>

                    <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
                      {batchFiles.map((f, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700"
                        >
                          {f.name} ({(f.size / 1024).toFixed(0)} KB)
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={isProcessingBatch}
                      onClick={handleProcessBatch}
                      className="mt-2 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {isProcessingBatch
                          ? `Importando lote (${batchProgress}%)...`
                          : `Importar ${batchFiles.length} Fotos para a Remessa`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: GRAVAR FOTOS NA PASTA DO COMPUTADOR */}
          {activeTab === 'folder' && (
            <div className="flex flex-col gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border-2 border-emerald-500/30 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <FolderDown className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase text-white font-mono">
                        Gravação das Fotos no Disco do PC
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Todas as fotos cadastradas são salvas dentro da subpasta{' '}
                        <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">
                          fotos_qaqc/
                        </code>{' '}
                        na pasta do seu computador com nomes organizados por código de amostra e furo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-400">Total de Fotos no Sistema:</div>
                    <div className="text-xl font-mono font-black text-emerald-400">
                      {photos.length} fotos armazenadas
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isWritingToDisk || photos.length === 0}
                    onClick={handleSaveAllPhotosToDisk}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20 whitespace-nowrap"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>{isWritingToDisk ? 'Gravando no disco...' : 'Salvar Todas as Fotos na Pasta (.JPG)'}</span>
                  </button>
                </div>

                {diskProgressText && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300 animate-pulse">
                    {diskProgressText}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Fotos sincronizadas no banco local e graváveis no disco do PC
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};

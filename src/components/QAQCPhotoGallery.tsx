import React, { useState, useRef } from 'react';
import { SampleShipmentAR, QAQCSamplePhoto, User } from '../types';
import {
  Camera,
  Upload,
  Trash2,
  Download,
  Maximize2,
  X,
  Clock,
  User as UserIcon,
  Tag,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { formatDateToPtBR, isPhotoMatchingAR } from '../utils/calculator';

interface QAQCPhotoGalleryProps {
  ar: SampleShipmentAR;
  photos: QAQCSamplePhoto[];
  activeUser: User;
  onUploadPhoto: (
    arId: string,
    file: File,
    sampleCode?: string,
    sampleType?: string,
    onProgress?: (percent: number, statusText: string) => void
  ) => Promise<void>;
  onDeletePhoto: (photo: QAQCSamplePhoto) => Promise<void>;
  onCleanupExpiredPhotos?: () => Promise<void>;
  onOpenPdfReportModal?: (date?: string) => void;
  onOpenMobilePhotoModal?: () => void;
  compact?: boolean;
}

export const QAQCPhotoGallery: React.FC<QAQCPhotoGalleryProps> = ({
  ar,
  photos,
  activeUser,
  onUploadPhoto,
  onDeletePhoto,
  onCleanupExpiredPhotos,
  onOpenPdfReportModal,
  onOpenMobilePhotoModal,
  compact = false,
}) => {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedSampleTag, setSelectedSampleTag] = useState<string>('Geral');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);

  const [lightboxPhoto, setLightboxPhoto] = useState<QAQCSamplePhoto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter photos for this specific AR
  const arPhotos = photos.filter((p) => isPhotoMatchingAR(p, ar));

  // List of possible sample tags from AR's qaqcSamples
  const qaqcSamples = ar.qaqcSamples || [];
  const tagOptions = [
    { label: 'Visão Geral da AR', code: 'Geral', type: 'Geral' },
    ...qaqcSamples.map((q) => ({
      label: `${q.type}: ${q.code} ${q.oreasProduct ? `(${q.oreasProduct})` : ''}`.trim(),
      code: q.code || q.type,
      type: q.type,
    })),
  ];

  const uploadSingleFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(5);
    setUploadStatusText('Preparando imagem no navegador...');
    setLastSelectedFile(file);

    try {
      const selectedOption = tagOptions.find((t) => t.code === selectedSampleTag) || tagOptions[0];
      await onUploadPhoto(
        ar.id,
        file,
        selectedOption.code,
        selectedOption.type,
        (percent, statusText) => {
          setUploadProgress(percent);
          setUploadStatusText(statusText);
        }
      );
      setUploadError(null);
      setLastSelectedFile(null);
    } catch (err: any) {
      console.error('Erro no envio de foto:', err);
      setUploadError(
        err?.message || 'Falha ao salvar a foto. Verifique a conexão com a internet e tente novamente.'
      );
    } finally {
      setIsUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadSingleFile(files[0]);
  };

  const handleDelete = async (photo: QAQCSamplePhoto) => {
    if (window.confirm(`Deseja realmente excluir esta foto (${photo.sampleCode || 'Sem tag'})?`)) {
      setDeletingId(photo.id);
      try {
        await onDeletePhoto(photo);
        if (lightboxPhoto?.id === photo.id) {
          setLightboxPhoto(null);
        }
      } catch (err) {
        console.error('Erro ao excluir foto:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return 'Alta resolução';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  const getDaysRemaining = (capturedAt: string) => {
    const captured = new Date(capturedAt).getTime();
    const now = Date.now();
    const diffMs = now - captured;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const remaining = 1095 - diffDays;
    return Math.max(0, remaining);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              Fotos de Padrões QA/QC
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                {arPhotos.length} foto(s)
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Registro fotográfico em alta qualidade pré-envio ao laboratório (Retenção: 3 anos)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenMobilePhotoModal && (
            <button
              type="button"
              onClick={onOpenMobilePhotoModal}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-700/60 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Abrir Ponto de Coleta Móvel com QR Code para celular e gravação na máquina"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Enviar do Celular (QR Code)</span>
            </button>
          )}

          {onCleanupExpiredPhotos && (
            <button
              onClick={onCleanupExpiredPhotos}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Excluir do banco de dados fotos com mais de 3 anos (1.095 dias)"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>Limpar +3 anos</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload & Tag selection control bar */}
      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Select Tag for the photo */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Tag className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Identificar amostra:</span>
          <select
            value={selectedSampleTag}
            onChange={(e) => setSelectedSampleTag(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white outline-none focus:border-cyan-500 cursor-pointer w-full sm:w-auto max-w-[260px] truncate"
          >
            {tagOptions.map((opt, idx) => (
              <option key={idx} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons for Camera or Gallery */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Hidden inputs */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            ref={galleryInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            disabled={isUploading}
            onClick={() => cameraInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Camera className="w-4 h-4" />
            <span>Tirar Foto (Câmera)</span>
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => galleryInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Galeria</span>
          </button>

          {onOpenPdfReportModal && (
            <button
              type="button"
              onClick={() => onOpenPdfReportModal(ar.shipmentDate ? ar.shipmentDate.split('T')[0] : undefined)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              title="Gerar e baixar relatório fotográfico oficial em PDF com todas as imagens dos padrões"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Baixar PDF das Fotos</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Progress State */}
      {isUploading && (
        <div className="p-3.5 bg-slate-950/90 border border-cyan-800/80 rounded-xl flex flex-col gap-2 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              {uploadStatusText || 'Enviando foto...'}
            </span>
            <span className="font-mono text-cyan-200">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/80">
            <div
              className="bg-gradient-to-r from-cyan-500 via-teal-400 to-amber-400 h-full transition-all duration-300 ease-out rounded-full shadow-sm"
              style={{ width: `${Math.max(5, uploadProgress)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 text-right">
            Upload direto ao banco de dados sem passar por servidores intermediários
          </p>
        </div>
      )}

      {/* Upload Error Banner & Retry */}
      {uploadError && !isUploading && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/70 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">Falha no envio da foto</p>
              <p className="text-[11px] text-rose-300/80">{uploadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (lastSelectedFile) {
                uploadSingleFile(lastSelectedFile);
              } else {
                cameraInputRef.current?.click();
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-rose-500/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      )}

      {/* Photos Grid */}
      {arPhotos.length === 0 ? (
        <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-500">
          <ImageIcon className="w-8 h-8 text-slate-600 stroke-[1.5]" />
          <p className="text-xs font-medium">Nenhuma foto anexada a esta remessa ({ar.arCode}).</p>
          <p className="text-[11px] text-slate-600">
            Utilize os botões acima para fotografar e registrar etiquetas dos padrões OREAS, BLK e DUP.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {arPhotos.map((photo) => {
            const daysLeft = getDaysRemaining(photo.capturedAt);
            const dateStr = photo.capturedAt
              ? `${formatDateToPtBR(photo.capturedAt.split('T')[0])} ${new Date(photo.capturedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : 'N/A';

            return (
              <div
                key={photo.id}
                className="group relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-cyan-500/60 transition-all shadow-md flex flex-col"
              >
                {/* Thumbnail image container */}
                <div
                  className="relative aspect-4/3 bg-slate-900 cursor-pointer overflow-hidden flex items-center justify-center"
                  onClick={() => setLightboxPhoto(photo)}
                >
                  <img
                    src={photo.photoUrl}
                    alt={photo.sampleCode || 'Padrão QAQC'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Overlay badge on thumbnail */}
                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-700/80 text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1 max-w-[80%] truncate">
                    <Tag className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{photo.sampleCode || 'Geral'}</span>
                  </div>

                  {/* Zoom hint icon */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Maximize2 className="w-5 h-5 drop-shadow" />
                  </div>
                </div>

                {/* Info Footer */}
                <div className="p-2.5 flex flex-col gap-1 text-[11px] bg-slate-900/90">
                  <div className="flex items-center justify-between text-slate-300 font-semibold truncate">
                    <span className="truncate flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-slate-500 shrink-0" />
                      {photo.capturedByName || 'Operador'}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono font-bold shrink-0">
                      {formatFileSize(photo.fileSizeBytes)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                      {dateStr}
                    </span>
                  </div>

                  {/* Days remaining badge & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 mt-0.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        daysLeft < 30
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                      title={`Expira em ${daysLeft} dias (retenção total de 3 anos)`}
                    >
                      Expira em {daysLeft > 365 ? `${(daysLeft / 365).toFixed(1)}a` : `${daysLeft}d`}
                    </span>

                    <div className="flex items-center gap-1">
                      <a
                        href={photo.photoUrl}
                        download={`QAQC_${ar.arCode}_${photo.sampleCode || 'foto'}.jpg`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Baixar foto original"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => handleDelete(photo)}
                        disabled={deletingId === photo.id}
                        className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors"
                        title="Excluir foto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Fullscreen Modal */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 no-print">
          {/* Top Bar */}
          <div className="w-full max-w-5xl flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs font-mono">
                {lightboxPhoto.sampleCode || 'Padrão QAQC'}
              </span>
              <span className="text-sm font-bold text-slate-200">
                AR: {lightboxPhoto.arCode} • Furo: {lightboxPhoto.drillHoleCode || ar.drillHoleCode}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={lightboxPhoto.photoUrl}
                download={`QAQC_${ar.arCode}_${lightboxPhoto.sampleCode || 'foto'}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Baixar Original ({formatFileSize(lightboxPhoto.fileSizeBytes)})</span>
              </a>

              <button
                onClick={() => handleDelete(lightboxPhoto)}
                className="px-3 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Foto</span>
              </button>

              <button
                onClick={() => setLightboxPhoto(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Display */}
          <div className="my-auto max-w-5xl max-h-[75vh] overflow-hidden flex items-center justify-center p-2">
            <img
              src={lightboxPhoto.photoUrl}
              alt={lightboxPhoto.sampleCode || 'Foto QAQC'}
              className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl border border-slate-800"
            />
          </div>

          {/* Footer Details */}
          <div className="w-full max-w-5xl text-center text-xs text-slate-400 font-mono bg-slate-900/90 py-2.5 px-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span>
              Registrada por: <strong className="text-white">{lightboxPhoto.capturedByName || 'Operador'}</strong>
            </span>
            <span>
              Data/Hora:{' '}
              <strong className="text-white">
                {lightboxPhoto.capturedAt
                  ? `${formatDateToPtBR(lightboxPhoto.capturedAt.split('T')[0])} ${new Date(lightboxPhoto.capturedAt).toLocaleTimeString('pt-BR')}`
                  : 'N/A'}
              </strong>
            </span>
            <span>
              Retenção:{' '}
              <strong className="text-amber-400">
                {getDaysRemaining(lightboxPhoto.capturedAt)} dias restantes (~{((getDaysRemaining(lightboxPhoto.capturedAt) / 365)).toFixed(1)} anos)
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

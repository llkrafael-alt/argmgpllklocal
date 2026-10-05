import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  HardDrive,
  FileJson,
  ShieldCheck,
  X,
  Layers,
  Truck,
  Camera,
  Package,
  Activity,
  Users,
  AlertTriangle,
  Trash2,
  Folder,
  FolderCheck,
  FolderSync,
  Save,
  RefreshCw,
  FolderX,
  Info,
} from 'lucide-react';
import {
  exportLocalBackupJson,
  importLocalBackupJson,
  resetDatabaseToDemoData,
  clearAllHolesAndShipmentsLocal,
} from '../services/firebase';
import {
  selectAndLinkFolder,
  saveCurrentDatabaseToFolder,
  loadDatabaseFromLinkedFolder,
  unlinkLocalFolder,
  subscribeFolderSync,
  FolderSyncState,
} from '../utils/fileSystemFolderSync';
import { DrillHole, SampleShipmentAR, QAQCSamplePhoto, OreasStockEntry, ProductionLog, User } from '../types';

interface LocalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  holes: DrillHole[];
  ars: SampleShipmentAR[];
  photos: QAQCSamplePhoto[];
  oreasStockEntries: OreasStockEntry[];
  logs: ProductionLog[];
  users: User[];
  onTriggerToast: (msg: string) => void;
}

export const LocalDataModal: React.FC<LocalDataModalProps> = ({
  isOpen,
  onClose,
  holes,
  ars,
  photos,
  oreasStockEntries,
  logs,
  users,
  onTriggerToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [folderState, setFolderState] = useState<FolderSyncState>({
    isSupported: typeof window !== 'undefined' && 'showDirectoryPicker' in window,
    isLinked: false,
    folderName: null,
    lastSavedAt: null,
    lastLoadedAt: null,
    isAutoSaveActive: true,
    error: null,
    isWriting: false,
  });
  const [isFolderOperating, setIsFolderOperating] = useState(false);

  useEffect(() => {
    const unsub = subscribeFolderSync((state) => {
      setFolderState(state);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  // Folder actions
  const handleSelectFolder = async () => {
    setIsFolderOperating(true);
    try {
      const res = await selectAndLinkFolder(
        () => exportLocalBackupJson(),
        async (json) => {
          const importRes = await importLocalBackupJson(json);
          return importRes.success;
        }
      );
      onTriggerToast(res.message);
    } catch (err: any) {
      onTriggerToast('Erro ao selecionar pasta.');
    } finally {
      setIsFolderOperating(false);
    }
  };

  const handleManualSaveToFolder = async () => {
    setIsFolderOperating(true);
    try {
      const json = exportLocalBackupJson();
      const res = await saveCurrentDatabaseToFolder(json);
      onTriggerToast(res.message);
    } catch (err: any) {
      onTriggerToast('Erro ao salvar na pasta.');
    } finally {
      setIsFolderOperating(false);
    }
  };

  const handleManualLoadFromFolder = async () => {
    if (
      !window.confirm(
        'Deseja recarregar a base a partir do arquivo ARGMGP_DATABASE.json contido na pasta do computador? Quaisquer dados em tela serão atualizados com o conteúdo da pasta.'
      )
    ) {
      return;
    }

    setIsFolderOperating(true);
    try {
      const res = await loadDatabaseFromLinkedFolder(async (json) => {
        const importRes = await importLocalBackupJson(json);
        return importRes.success;
      });
      onTriggerToast(res.message);
    } catch (err: any) {
      onTriggerToast('Erro ao ler dados da pasta.');
    } finally {
      setIsFolderOperating(false);
    }
  };

  const handleUnlinkFolder = async () => {
    if (window.confirm('Deseja desvincular a pasta do computador? O app continuará salvando no navegador local.')) {
      await unlinkLocalFolder();
      onTriggerToast('Pasta do computador desvinculada.');
    }
  };

  const handleExportBackup = () => {
    try {
      const json = exportLocalBackupJson();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.href = url;
      link.download = `ARGMGP_Backup_Local_${nowStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onTriggerToast('Backup completo (JSON) exportado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao exportar backup:', err);
      onTriggerToast('Falha ao exportar backup local.');
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    setIsImporting(true);
    setImportStatus('Lendo arquivo de backup...');

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const result = await importLocalBackupJson(text);
        if (result.success) {
          onTriggerToast(result.message);
          setImportStatus(result.message);
        } else {
          onTriggerToast(result.message);
          setImportStatus(`Erro: ${result.message}`);
        }
      } catch (err: any) {
        onTriggerToast('Erro ao importar arquivo de backup.');
        setImportStatus(`Falha: ${err?.message || 'Arquivo inválido'}`);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setIsImporting(false);
      onTriggerToast('Erro ao ler o arquivo selecionado.');
    };

    reader.readAsText(file);
  };

  const handleClearAllHoles = async () => {
    if (
      window.confirm(
        'CONFIRMAÇÃO: Deseja realmente excluir TODOS os furos, remessas (AR), fotos e logs de atividades? O banco ficará 100% limpo para novos cadastros.'
      )
    ) {
      await clearAllHolesAndShipmentsLocal();
      onTriggerToast('Todos os furos, remessas e logs foram excluídos com sucesso! Banco limpo.');
      onClose();
    }
  };

  const handleResetData = async () => {
    if (
      window.confirm(
        'ATENÇÃO: Deseja realmente restaurar todos os dados locais para os registros iniciais de demonstração?'
      )
    ) {
      await resetDatabaseToDemoData();
      onTriggerToast('Banco local restaurado para o padrão de demonstração.');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase font-mono tracking-tight">
                  Armazenamento em Pasta do PC & Backups
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold font-mono">
                  MULTIUSUÁRIO LOCAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Compartilhamento em pasta física do computador entre usuários e turnos
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

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* PC Folder Storage Section (MAIN FEATURE) */}
          <div className="p-5 rounded-2xl bg-slate-950 border-2 border-emerald-500/30 flex flex-col gap-4 shadow-lg shadow-emerald-950/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <FolderCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black uppercase text-white font-mono tracking-tight">
                      Pasta Compartilhada no Computador (Disco PC)
                    </h4>
                    {folderState.isLinked && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        VINCULADA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Vincule uma pasta física no seu computador (ex: <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">C:\Sondagem_Galpao</code> ou pasta na rede local). O sistema salva automaticamente o arquivo <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">ARGMGP_DATABASE.json</code> e cópias diárias de backup dentro dela.
                  </p>
                </div>
              </div>
            </div>

            {/* Folder Status Card */}
            {folderState.isLinked ? (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-white">
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-slate-400">Pasta no PC:</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                      {folderState.folderName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Auto-Gravação Ativa
                    </span>
                    {folderState.isWriting && (
                      <span className="text-amber-400 font-mono animate-pulse">Gravando...</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 font-mono">
                  {folderState.lastSavedAt && (
                    <span>
                      Última gravação:{' '}
                      <strong className="text-slate-200">
                        {new Date(folderState.lastSavedAt).toLocaleTimeString('pt-BR')}
                      </strong>
                    </span>
                  )}
                  {folderState.lastLoadedAt && (
                    <span>
                      Última sincronização:{' '}
                      <strong className="text-slate-200">
                        {new Date(folderState.lastLoadedAt).toLocaleTimeString('pt-BR')}
                      </strong>
                    </span>
                  )}
                  <span className="text-slate-500">Subpasta: /backups_automaticos/</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-400">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Nenhuma pasta vinculada no momento. Ao vincular, todos os usuários que usam este computador ou abrirem o app terão seus furos sincronizados automaticamente nesta pasta.
                </span>
              </div>
            )}

            {/* Folder Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isFolderOperating}
                onClick={handleSelectFolder}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20"
              >
                <Folder className="w-4 h-4" />
                <span>{folderState.isLinked ? 'Alterar Pasta no PC' : 'Selecionar Pasta no Computador'}</span>
              </button>

              {folderState.isLinked && (
                <>
                  <button
                    type="button"
                    disabled={isFolderOperating || folderState.isWriting}
                    onClick={handleManualSaveToFolder}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-700"
                    title="Gravar imediatamente os dados atuais na pasta do computador"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gravar Agora na Pasta</span>
                  </button>

                  <button
                    type="button"
                    disabled={isFolderOperating}
                    onClick={handleManualLoadFromFolder}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-700"
                    title="Ler e carregar os dados contidos no arquivo da pasta"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sincronizar / Ler da Pasta</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUnlinkFolder}
                    className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs transition-all flex items-center gap-1 border border-red-500/30"
                    title="Desvincular a pasta do computador"
                  >
                    <FolderX className="w-3.5 h-3.5" />
                    <span>Desvincular</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Counts Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-amber-400" /> Registros no Banco Local
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" /> Furos / Planos:
                </span>
                <span className="font-mono font-bold text-white text-sm">{holes.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-cyan-400" /> Remessas (AR):
                </span>
                <span className="font-mono font-bold text-white text-sm">{ars.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-purple-400" /> Fotos QA/QC:
                </span>
                <span className="font-mono font-bold text-white text-sm">{photos.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-400" /> Lotes OREAS:
                </span>
                <span className="font-mono font-bold text-white text-sm">{oreasStockEntries.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" /> Atividades/Logs:
                </span>
                <span className="font-mono font-bold text-white text-sm">{logs.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-rose-400" /> Usuários/Equipe:
                </span>
                <span className="font-mono font-bold text-white text-sm">{users.length}</span>
              </div>
            </div>
          </div>

          {/* Export & Import Actions */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-amber-400" /> Exportação e Importação Manual (.JSON)
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Gere arquivos de backup avulsos para transferir entre outros computadores via pendrive ou e-mail.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex-1 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Backup (.JSON)</span>
              </button>

              <input
                type="file"
                accept=".json,application/json"
                ref={fileInputRef}
                onChange={handleFileSelected}
                className="hidden"
              />

              <button
                type="button"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>{isImporting ? 'Importando...' : 'Restaurar Arquivo (.JSON)'}</span>
              </button>
            </div>

            {importStatus && (
              <p className="text-xs text-amber-400 font-mono text-center">{importStatus}</p>
            )}
          </div>

          {/* Clear All Holes & Data Clean Slate */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-amber-300">
              <Trash2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">Limpar Todos os Furos e Remessas (Deixar Limpo)</p>
                <p className="text-amber-400/80 text-[11px]">
                  Exclui permanentemente todos os furos cadastrados, remessas AR e histórico, deixando a base totalmente zerada e limpa para novos furos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearAllHoles}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Tudo (Zerado)</span>
            </button>
          </div>

          {/* Reset Demo Data Action */}
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">Restaurar Dados Padrão de Demonstração</p>
                <p className="text-rose-400/80 text-[11px]">
                  Limpa os dados atuais e reinicia o banco local com os furos, remessas e estoque padrão de demonstração.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetData}
              className="px-3.5 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 border border-rose-800/80"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Sincronização Local Direta no Disco • Multi-Perfil
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};


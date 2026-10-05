import React from 'react';
import { User } from '../types';
import { AppThemeId, THEME_OPTIONS } from '../types/themes';
import { AppLogo } from './AppLogo';
import {
  Users,
  LayoutDashboard,
  Box,
  UserCheck,
  RotateCcw,
  LogOut,
  Truck,
  Sun,
  Moon,
  Edit3,
  HardDrive,
  Folder,
  FolderCheck,
  Palette,
  Camera,
} from 'lucide-react';

interface HeaderProps {
  activeUser: User;
  onOpenAuthModal: () => void;
  onLogout?: () => void;
  onOpenUserModal: () => void;
  onEditProfile?: () => void;
  onOpenNewHoleModal: () => void;
  onOpenLocalDataModal?: () => void;
  onOpenMobilePhotoModal?: () => void;
  onOpenThemeModal?: () => void;
  isFolderLinked?: boolean;
  folderName?: string | null;
  activeTab: 'dashboard' | 'shipments' | 'team';
  setActiveTab: (tab: 'dashboard' | 'shipments' | 'team') => void;
  onResetDemoData: () => void;
  holesCount: number;
  arsCount?: number;
  theme?: AppThemeId;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeUser,
  onOpenAuthModal,
  onLogout,
  onOpenUserModal,
  onEditProfile,
  onOpenNewHoleModal,
  onOpenLocalDataModal,
  onOpenMobilePhotoModal,
  onOpenThemeModal,
  isFolderLinked = false,
  folderName = null,
  activeTab,
  setActiveTab,
  onResetDemoData,
  holesCount,
  arsCount = 0,
  theme = 'dark',
  onToggleTheme,
}) => {
  const currentThemeObj = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];
  return (
    <header className="no-print bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <AppLogo className="w-11 h-11 transition-transform hover:scale-105" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white font-mono uppercase">
                  ARGMGP
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  REMESSAS & QA/QC
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  100% LOCAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestão de Remessas, Estoque OREAS e Planos de Empacotamento
              </p>
            </div>
          </div>

          {/* Active User Pill & Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mobile Photo Sync Button */}
            {onOpenMobilePhotoModal && (
              <button
                type="button"
                onClick={onOpenMobilePhotoModal}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                title="Tirar fotos no celular via QR Code / Wi-Fi do galpão ou importar em lote para o PC"
              >
                <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Fotos & Celular</span>
              </button>
            )}

            {/* Local Data & PC Folder Sync Button */}
            {onOpenLocalDataModal && (
              <button
                type="button"
                onClick={onOpenLocalDataModal}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm border ${
                  isFolderLinked
                    ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border-slate-700'
                }`}
                title={
                  isFolderLinked
                    ? `Pasta no PC Vinculada: ${folderName} (Auto-gravação ativa). Clique para gerenciar.`
                    : 'Vincular uma pasta física do computador ou gerenciar backups'
                }
              >
                {isFolderLinked ? (
                  <>
                    <FolderCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="hidden sm:inline font-mono font-bold truncate max-w-[130px]">
                      {folderName}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden sm:inline" />
                  </>
                ) : (
                  <>
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">Pasta PC & Dados</span>
                  </>
                )}
              </button>
            )}

            {/* Login / Auth Account Button & Logout */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl p-1">
              <button
                onClick={onOpenAuthModal}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-700/90 text-xs font-semibold flex items-center gap-2 transition-all group"
                title="Clique para alternar operador ou ver detalhes da conta"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <UserCheck className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <div className="text-left leading-tight">
                  <div className="text-[9px] text-slate-400 font-medium">Operador:</div>
                  <div className="text-white font-bold text-xs">
                    {activeUser.name}
                  </div>
                </div>
              </button>

              {/* Edit Profile / Change Name Button */}
              {onEditProfile && (
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-700/80 transition-colors"
                  title={`Editar nome / perfil de ${activeUser.name}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Logout / Sair Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors text-xs font-bold flex items-center gap-1"
                  title="Sair do sistema e voltar para a tela de login"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
            </div>

            {/* Theme Switcher & Gallery Button */}
            {onOpenThemeModal ? (
              <button
                type="button"
                onClick={onOpenThemeModal}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-sm group"
                title="Abrir Galeria de Temas Visuais (7 opções)"
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border shadow-sm"
                  style={{
                    backgroundColor: currentThemeObj.previewAccent,
                    borderColor: '#ffffff',
                  }}
                />
                <Palette className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline font-mono font-bold">
                  {currentThemeObj.name.split(' ')[0]}
                </span>
              </button>
            ) : onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                title="Alternar Tema"
              >
                <Palette className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Temas</span>
              </button>
            )}

            {/* Quick Actions */}
            <button
              onClick={onOpenNewHoleModal}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Box className="w-4 h-4" />
              <span>+ Cadastrar Furo / Plano</span>
            </button>

            {/* Reset Demo Button */}
            <button
              onClick={onResetDemoData}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs transition-colors"
              title="Restaurar dados de demonstração iniciais"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pt-2 pb-0 scrollbar-none snap-x">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-xs flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all whitespace-nowrap min-h-[44px] shrink-0 snap-start ${
              activeTab === 'dashboard'
                ? 'border-amber-500 text-amber-400 bg-slate-800/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>
              <span className="inline sm:hidden">Furos & Planos</span>
              <span className="hidden sm:inline">Furos & Planos de Amostragem</span>
            </span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-amber-300 font-mono">
              {holesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('shipments')}
            className={`px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-xs flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all whitespace-nowrap min-h-[44px] shrink-0 snap-start ${
              activeTab === 'shipments'
                ? 'border-amber-500 text-amber-400 bg-slate-800/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>
              <span className="inline sm:hidden">Remessas & QA/QC</span>
              <span className="hidden sm:inline">Remessas (ARs) & QA/QC</span>
            </span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-amber-300 font-mono">
              {arsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-xs flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all whitespace-nowrap min-h-[44px] shrink-0 snap-start ${
              activeTab === 'team'
                ? 'border-amber-500 text-amber-400 bg-slate-800/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>
              <span className="inline sm:hidden">Equipe</span>
              <span className="hidden sm:inline">Atividade da Equipe</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

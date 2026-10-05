import React from 'react';
import { Palette, Check, Sparkles, X } from 'lucide-react';
import { AppThemeId, THEME_OPTIONS } from '../types/themes';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppThemeId;
  onSelectTheme: (theme: AppThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase font-mono tracking-tight">
                  Galeria de Temas Visuais
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  7 OPÇÕES
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Escolha o estilo de cores que melhor se adapta ao seu ambiente de trabalho ou iluminação
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

        {/* Content: Theme Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {THEME_OPTIONS.map((theme) => {
              const isSelected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelectTheme(theme.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3 relative group overflow-hidden ${
                    isSelected
                      ? 'border-amber-400 bg-slate-950 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/30'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950/90'
                  }`}
                >
                  {/* Visual Color Palette Strip */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-xl border flex items-center justify-center shadow-inner"
                        style={{
                          backgroundColor: theme.previewBg,
                          borderColor: theme.previewAccent,
                        }}
                      >
                        <div
                          className="w-3 h-3 rounded-full shadow"
                          style={{ backgroundColor: theme.previewAccent }}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          {theme.name}
                        </h4>
                        <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                          {theme.tag}
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono group-hover:text-slate-300">
                        {theme.category}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {theme.description}
                  </p>

                  {/* Mini Preview Bar */}
                  <div
                    className="h-2 rounded-full w-full overflow-hidden flex"
                    style={{ backgroundColor: theme.previewBg }}
                  >
                    <div
                      className="h-full w-1/3"
                      style={{ backgroundColor: theme.previewAccent }}
                    />
                    <div
                      className="h-full w-2/3 opacity-40"
                      style={{ backgroundColor: theme.previewText }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>O tema escolhido é salvo automaticamente no seu perfil.</span>
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

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Lock, Trash2, AlertTriangle, KeyRound } from 'lucide-react';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onConfirmDelete: (userId: string) => Promise<void> | void;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onConfirmDelete,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Por favor, informe a senha de confirmação.');
      return;
    }

    if (password !== 'gmin01') {
      setError('Senha incorreta! Digite a senha administrativa ("gmin01").');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirmDelete(user.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir usuário no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-red-950/40 border-b border-red-900/40">
          <div className="flex items-center gap-2.5 text-red-400">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Excluir Usuário</h3>
              <p className="text-[11px] text-red-300">Confirmação administrativa requerida</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-base shrink-0">
              {user.name.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">{user.name}</h4>
              <p className="text-xs text-slate-400">{user.role}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 flex items-start gap-2.5 text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Esta ação removerá o usuário do banco de dados compartilhado. Para confirmar, digite a senha administrativa.
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Senha de Confirmação</span>
            </label>
            <input
              type="password"
              placeholder="Digite a senha..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm font-medium text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

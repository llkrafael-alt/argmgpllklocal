import React, { useState } from 'react';
import { User, isMasterUser } from '../types';
import { AppLogo } from './AppLogo';
import {
  X,
  LogIn,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Key,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onLoginSuccess: (user: User) => void;
  onUpdateUser?: (user: User) => void;
  isMandatory?: boolean;
}

export const GEOLOGY_ROLES = [
  {
    id: 'Geólogo',
    title: 'Geólogo',
    desc: 'Mapeamento, descrição litológica e orientação técnica',
    icon: '💎',
  },
  {
    id: 'Auxiliar de Geologia',
    title: 'Auxiliar de Geologia',
    desc: 'Suporte direto ao geólogo, manipulação de testemunhos e ensaios',
    icon: '🔬',
  },
  {
    id: 'Assistente de Geologia',
    title: 'Assistente de Geologia',
    desc: 'Acompanhamento de rotina, conferências e controle de fluxo',
    icon: '📋',
  },
  {
    id: 'Técnico de Geologia',
    title: 'Técnico de Geologia',
    desc: 'Apontamento técnico, densidades e medições de rotina',
    icon: '⛏️',
  },
  {
    id: 'Operador de Serra',
    title: 'Operador de Serra',
    desc: 'Corte e preparação longitudinal de testemunhos de rocha',
    icon: '🪚',
  },
  {
    id: 'Amostrador',
    title: 'Amostrador',
    desc: 'Quarteamento, quarteio, ensacamento e codificação de amostras',
    icon: '🧪',
  },
  {
    id: 'Coordenador de Galpão',
    title: 'Coordenador de Galpão',
    desc: 'Gestão operacional, logística interna e inventário de caixas',
    icon: '🏗️',
  },
  {
    id: 'Auxiliar de Campo',
    title: 'Auxiliar de Campo',
    desc: 'Recebimento de caixas de sondagem e movimentação de paletes',
    icon: '🚜',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  onLoginSuccess,
  onUpdateUser,
  isMandatory = false,
}) => {
  // Login form state
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // First access / must change password state
  const [pendingPasswordUser, setPendingPasswordUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  if (!isOpen) return null;

  // Handle standard login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const query = loginInput.trim().toLowerCase();
    if (!query) {
      setErrorMsg('Informe seu login ou e-mail.');
      return;
    }

    if (!loginPassword) {
      setErrorMsg('Informe sua senha.');
      return;
    }

    // Find user by login or email or name
    let user = users.find(
      (u) =>
        (u.login && u.login.toLowerCase() === query) ||
        (u.email && u.email.toLowerCase() === query) ||
        (u.name && u.name.toLowerCase() === query)
    );

    // Fallback for Master User if not found in state list yet
    if (!user && (query === 'llk.rafael' || query === 'llk.rafael@gmail.com' || query === 'llk2.rafael@gmail.com')) {
      const existingMaster = users.find((u) => isMasterUser(u));
      if (existingMaster) {
        user = existingMaster;
      } else {
        user = {
          id: 'usr_master_rafael',
          name: 'Rafael Leite',
          login: 'llk.rafael',
          email: 'llk.rafael@gmail.com',
          password: 'yasmin2015',
          role: 'Coordenador de Galpão',
          isMaster: true,
          badgeColor: 'bg-amber-500',
          createdAt: '2026-01-01T00:00:00.000Z',
        };
      }
    }

    if (!user) {
      setErrorMsg('Usuário ou e-mail não encontrado no sistema. O cadastro é exclusivo do Administrador Master.');
      return;
    }

    // Check password if set
    const isMasterCredential = (user.isMaster || user.login === 'llk.rafael') && (loginPassword === 'yasmin2015' || loginPassword === '123');
    if (user.password && user.password !== loginPassword && !isMasterCredential) {
      setErrorMsg('Senha incorreta. Tente novamente ou solicite redefinição ao Administrador.');
      return;
    }

    // Check if first login / must change password
    if (user.mustChangePassword) {
      setPendingPasswordUser(user);
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      return;
    }

    onLoginSuccess(user);
    onClose();
  };

  // First Access Password submit
  const handleFirstAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPasswordInput || newPasswordInput.length < 3) {
      setErrorMsg('A nova senha deve possuir no mínimo 3 caracteres.');
      return;
    }

    if (newPasswordInput === pendingPasswordUser?.password) {
      setErrorMsg('A nova senha não pode ser idêntica à senha provisória anterior.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setErrorMsg('A confirmação da nova senha não confere. Digite novamente.');
      return;
    }

    if (pendingPasswordUser) {
      const updatedUser: User = {
        ...pendingPasswordUser,
        password: newPasswordInput,
        mustChangePassword: false,
      };

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      setPendingPasswordUser(null);
      onLoginSuccess(updatedUser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo className="w-10 h-10" />
            <div>
              <h3 className="font-black text-lg text-white font-mono uppercase tracking-tight">
                {pendingPasswordUser
                  ? 'Primeiro Acesso — Troca de Senha'
                  : isMandatory
                  ? 'Acesso Restrito ao Galpão'
                  : 'Acesso ao Galpão'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {pendingPasswordUser
                  ? 'Cadastre sua nova senha de acesso'
                  : 'Identificação de Usuário Autorizado'}
              </p>
            </div>
          </div>

          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FIRST ACCESS PASSWORD FORM */}
          {pendingPasswordUser ? (
            <form onSubmit={handleFirstAccessSubmit} className="flex flex-col gap-4">
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
                <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-white">
                    Olá, {pendingPasswordUser.name}!
                  </span>
                  <span>
                    Este é o seu primeiro acesso ao sistema. Por motivos de segurança, você precisa cadastrar uma nova senha pessoal antes de prosseguir.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Nova Senha Pessoal *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="Digite sua nova senha"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <CheckCircle2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Key className="w-4 h-4" />
                  <span>Salvar Nova Senha e Entrar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPendingPasswordUser(null);
                    setErrorMsg('');
                  }}
                  className="w-full py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  Voltar ao Login
                </button>
              </div>
            </form>
          ) : (
            /* STANDARD LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Login ou E-mail
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Ex: joao.silva ou usuario@empresa.com"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="Sua senha"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar no Galpão</span>
              </button>

              <p className="text-[11px] text-slate-500 text-center mt-2 flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Cadastros novos e acessos são gerenciados pelo Administrador Master.</span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

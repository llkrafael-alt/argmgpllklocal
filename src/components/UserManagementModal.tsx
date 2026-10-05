import React, { useState, useEffect } from 'react';
import { User, isMasterUser } from '../types';
import { X, UserPlus, Check, Users, Trash2, ShieldCheck, Edit3, Lock, AlertTriangle, KeyRound } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  activeUser: User;
  onSelectActiveUser: (user: User) => void;
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onUpdateUser?: (user: User) => void;
  onDeleteUserRequest?: (user: User) => void;
  initialEditingUserId?: string | null;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  activeUser,
  onSelectActiveUser,
  onAddUser,
  onUpdateUser,
  onDeleteUserRequest,
  initialEditingUserId,
}) => {
  const isMaster = isMasterUser(activeUser);

  // Form state for creating user
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Geólogo');
  const [newIsMaster, setNewIsMaster] = useState(false);
  const [newMustChangePassword, setNewMustChangePassword] = useState(true);
  const [formError, setFormError] = useState('');

  // Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogin, setEditLogin] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editIsMaster, setEditIsMaster] = useState(false);
  const [editMustChangePassword, setEditMustChangePassword] = useState(false);
  const [editPassword, setEditPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialEditingUserId) {
        const target = users.find((u) => u.id === initialEditingUserId);
        if (target) {
          startEditing(target);
          return;
        }
      }
      setFormError('');
    } else {
      setEditingUserId(null);
      setShowAddForm(false);
    }
  }, [isOpen, initialEditingUserId, users]);

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newName.trim()) {
      setFormError('Informe o nome do colaborador.');
      return;
    }
    if (!newLogin.trim()) {
      setFormError('Informe o login do colaborador.');
      return;
    }
    if (!newPassword || newPassword.length < 3) {
      setFormError('A senha deve ter pelo menos 3 caracteres.');
      return;
    }

    const loginClean = newLogin.trim().toLowerCase();
    const existing = users.find(
      (u) =>
        (u.login && u.login.toLowerCase() === loginClean) ||
        (u.email && newEmail && u.email.toLowerCase() === newEmail.trim().toLowerCase())
    );

    if (existing) {
      setFormError('Já existe um usuário com este login ou e-mail.');
      return;
    }

    onAddUser({
      name: newName.trim(),
      login: loginClean,
      email: newEmail.trim() || `${loginClean}@geologia.com`,
      password: newPassword,
      role: newRole,
      isMaster: newIsMaster,
      mustChangePassword: newMustChangePassword,
      badgeColor: newIsMaster ? 'bg-amber-500' : 'bg-slate-700',
    });

    // Reset
    setNewName('');
    setNewLogin('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('Geólogo');
    setNewIsMaster(false);
    setNewMustChangePassword(true);
    setShowAddForm(false);
  };

  const startEditing = (u: User) => {
    setEditingUserId(u.id);
    setEditName(u.name || '');
    setEditLogin(u.login || '');
    setEditEmail(u.email || '');
    setEditRole(u.role || 'Geólogo');
    setEditIsMaster(u.isMaster === true || isMasterUser(u));
    setEditMustChangePassword(u.mustChangePassword ?? false);
    setEditPassword(u.password || '');
    setFormError('');
    setShowAddForm(false);
  };

  const handleSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingUserId || !onUpdateUser) return;

    const original = users.find((u) => u.id === editingUserId);
    if (!original) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setFormError('O nome do usuário não pode ficar em branco.');
      return;
    }

    const updated: User = {
      ...original,
      name: trimmedName,
      login: editLogin.trim().toLowerCase() || original.login,
      email: editEmail.trim() || original.email,
      role: editRole.trim() || original.role,
      isMaster: editIsMaster,
      mustChangePassword: editMustChangePassword,
      password: editPassword || original.password,
    };

    onUpdateUser(updated);
    setEditingUserId(null);
    setFormError('');
  };

  const isEditingSelf = editingUserId === activeUser.id;
  const canAccess = isMaster || isEditingSelf;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                {editingUserId ? 'Editar Perfil do Usuário' : 'Gestão Central de Usuários'}
                <span className="text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                  {isMaster ? 'Master' : 'Perfil'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {editingUserId
                  ? 'Atualize seu nome, credenciais e configurações de acesso'
                  : 'Controle de Acesso & Contas de Colaboradores'}
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

        <div className="p-6 flex flex-col gap-5">
          {!canAccess ? (
            /* ACCESS DENIED FOR NON-MASTER */
            <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-900/50 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-white text-base">
                  Acesso Restrito ao Administrador Master
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-md">
                  Apenas o Administrador Master possui privilégios para cadastrar ou gerenciar outros usuários do sistema.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white font-bold text-xs"
              >
                Voltar
              </button>
            </div>
          ) : (
            /* MASTER USER DASHBOARD & MANAGEMENT OR DEDICATED EDIT FORM */
            <>
              {/* Form error if any */}
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* DEDICATED EDIT FORM VIEW */}
              {editingUserId ? (
                <form onSubmit={handleSaveEdit} className="p-4 rounded-2xl border-2 border-amber-500/60 bg-slate-950 flex flex-col gap-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="font-bold text-sm text-amber-400 flex items-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      Alterar Dados & Nome de Usuário
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-amber-300 block font-bold mb-1">
                        Nome Completo do Usuário *
                      </label>
                      <input
                        type="text"
                        autoFocus
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Ex: Rafael Leite"
                        className="w-full px-3 py-2 rounded-xl border border-amber-500/60 bg-slate-900 text-sm text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Este nome aparecerá nos cabeçalhos, relatórios PDF de QA/QC, histórico de remessas e assinaturas.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block font-bold mb-1">
                        Login de Acesso
                      </label>
                      <input
                        type="text"
                        value={editLogin}
                        onChange={(e) => setEditLogin(e.target.value)}
                        placeholder="Ex: llk.rafael"
                        className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-mono text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block font-bold mb-1">
                        E-mail de Contato
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="usuario@geologia.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block font-bold mb-1">
                        Cargo Operacional
                      </label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white"
                      >
                        <option value="Geólogo">Geólogo</option>
                        <option value="Auxiliar de Geologia">Auxiliar de Geologia</option>
                        <option value="Assistente de Geologia">Assistente de Geologia</option>
                        <option value="Técnico de Geologia">Técnico de Geologia</option>
                        <option value="Operador de Serra">Operador de Serra</option>
                        <option value="Amostrador">Amostrador</option>
                        <option value="Coordenador de Galpão">Coordenador de Galpão</option>
                        <option value="Auxiliar de Campo">Auxiliar de Campo</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-amber-400 block font-bold mb-1 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        Redefinir Senha
                      </label>
                      <input
                        type="text"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Deixe em branco para manter a atual"
                        className="w-full px-3 py-2 rounded-xl border border-amber-500/50 bg-slate-900 text-xs font-mono text-amber-200"
                      />
                    </div>

                    {/* PERMISSION CHECKBOXES (only if master) */}
                    {isMaster && (
                      <div className="sm:col-span-2 pt-2 border-t border-slate-800 flex flex-col gap-2">
                        <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editIsMaster}
                            onChange={(e) => setEditIsMaster(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-xs text-white block">
                              Permissão de Administrador Master
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Concede acesso total para gerenciar usuários, senhas e configurações.
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editMustChangePassword}
                            onChange={(e) => setEditMustChangePassword(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-xs text-white block">
                              Exigir Troca de Senha no Próximo Acesso
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Força o usuário a escolher uma nova senha ao fazer o login.
                            </span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-amber-500/20"
                    >
                      <Check className="w-4 h-4" />
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              ) : null}

              {!editingUserId && (
                <>
                  {/* Active User Switcher Summary */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-sm">
                        {activeUser.name?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Operador Atual do Sistema
                        </p>
                        <h4 className="font-bold text-xs text-white flex items-center gap-2">
                          {activeUser.name}
                          <span className="text-[10px] text-amber-400 font-mono">
                            (@{activeUser.login || 'master'})
                          </span>
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => startEditing(activeUser)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar Meu Nome
                    </button>
                  </div>

                  {/* Add user button/form toggle */}
                  {!showAddForm ? (
                    isMaster && (
                      <button
                        onClick={() => {
                          setShowAddForm(true);
                          setFormError('');
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/10"
                      >
                        <UserPlus className="w-4 h-4" />
                        Cadastrar Novo Usuário
                      </button>
                    )
                  ) : (
                    /* CREATE USER FORM */
                    <form
                      onSubmit={handleCreateUser}
                      className="p-4 rounded-2xl border border-slate-700 bg-slate-950 flex flex-col gap-3.5 shadow-lg"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-xs text-white flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4 text-amber-400" />
                          Novo Colaborador
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] text-slate-300 block font-bold mb-1">
                            Nome Completo *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: João Pereira"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-850 text-xs text-white focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-300 block font-bold mb-1">
                            Login de Acesso *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: joao.pereira"
                            value={newLogin}
                            onChange={(e) => setNewLogin(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-850 text-xs font-mono text-white focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-300 block font-bold mb-1">
                            E-mail (opcional)
                          </label>
                          <input
                            type="email"
                            placeholder="joao@geologia.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-850 text-xs text-white focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-300 block font-bold mb-1">
                            Senha Provisória *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Mínimo 3 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-850 text-xs font-mono text-amber-300 focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-300 block font-bold mb-1">
                            Função / Cargo
                          </label>
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-850 text-xs text-white focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="Geólogo">Geólogo</option>
                            <option value="Auxiliar de Geologia">Auxiliar de Geologia</option>
                            <option value="Assistente de Geologia">Assistente de Geologia</option>
                            <option value="Técnico de Geologia">Técnico de Geologia</option>
                            <option value="Operador de Serra">Operador de Serra</option>
                            <option value="Amostrador">Amostrador</option>
                            <option value="Coordenador de Galpão">Coordenador de Galpão</option>
                            <option value="Auxiliar de Campo">Auxiliar de Campo</option>
                          </select>
                        </div>

                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-2 p-2 rounded-lg border border-amber-500/30 bg-amber-950/20 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newIsMaster}
                              onChange={(e) => setNewIsMaster(e.target.checked)}
                              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-xs text-white block">
                                Administrador Master
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                        >
                          Salvar Novo Usuário
                        </button>
                      </div>
                    </form>
                  )}

                  {/* LIST OF ALL REGISTERED USERS */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
                      <span>Usuários Cadastrados ({users.length})</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Clique para alternar operador
                      </span>
                    </h4>

                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                      {users.map((u) => {
                        const isSelected = u.id === activeUser.id;
                        const isMasterAcc = isMasterUser(u);

                        return (
                          <div
                            key={u.id}
                            onClick={() => onSelectActiveUser(u)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'border-amber-500 bg-amber-950/20 ring-1 ring-amber-500/40'
                                : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full ${isMasterAcc ? 'bg-amber-500' : 'bg-slate-700'} text-slate-950 font-black flex items-center justify-center text-sm shadow-sm shrink-0`}>
                                {u.name?.charAt(0) || 'U'}
                              </div>

                              <div>
                                <h5 className="font-bold text-xs text-white flex items-center gap-1.5">
                                  {u.name}
                                  {isMasterAcc && (
                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 uppercase">
                                      Master
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-700 text-amber-400">
                                      Ativo
                                    </span>
                                  )}
                                </h5>
                                <p className="text-[11px] text-slate-400">
                                  {u.role} • <span className="font-mono text-slate-500">@{u.login || 'sem-login'}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => startEditing(u)}
                                title="Editar dados / Nome / Senha"
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400 bg-slate-800 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/40 transition-colors flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>

                              {!isMasterAcc && onDeleteUserRequest && isMaster && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteUserRequest(u)}
                                  title="Excluir Usuário"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={onClose}
                      className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                    >
                      Concluído
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

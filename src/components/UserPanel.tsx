import React, { useState, useMemo } from 'react';
import { User, ProductionLog, DrillHole, SampleShipmentAR, QAQCSamplePhoto, OreasStockEntry, isMasterUser } from '../types';
import { getStageById } from '../constants/stages';
import {
  Users,
  Activity,
  Clock,
  Trash2,
  Edit3,
  ShieldCheck,
  Calendar,
  FileText,
  Truck,
  Camera,
  Layers,
  Package,
  CheckCircle2,
  Filter,
  HardDrive,
} from 'lucide-react';

interface UserPanelProps {
  users: User[];
  logs: ProductionLog[];
  holes: DrillHole[];
  ars?: SampleShipmentAR[];
  photos?: QAQCSamplePhoto[];
  oreasStockEntries?: OreasStockEntry[];
  activeUser: User;
  onSelectActiveUser?: (user: User) => void;
  onDeleteUserRequest?: (user: User) => void;
  onOpenUserModal: () => void;
  onEditUser?: (user: User) => void;
  onOpenLocalDataModal?: () => void;
}

export interface UnifiedActivity {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  category: 'FURO' | 'REMESSA' | 'FOTO_QAQC' | 'ESTOQUE' | 'ETAPA' | 'AMOSTRAGEM' | 'OUTROS';
  title: string;
  referenceCode?: string;
  details: string;
  date: string;
  createdAt: string;
  meterage?: string;
}

export const UserPanel: React.FC<UserPanelProps> = ({
  users,
  logs = [],
  holes = [],
  ars = [],
  photos = [],
  oreasStockEntries = [],
  activeUser,
  onDeleteUserRequest,
  onOpenUserModal,
  onEditUser,
  onOpenLocalDataModal,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const isMaster = isMasterUser(activeUser);

  // Synthesize and aggregate all user activities across the platform
  const allActivities: UnifiedActivity[] = useMemo(() => {
    const list: UnifiedActivity[] = [];
    const seenActivityKeys = new Set<string>();

    // 1. Explicit logs from database
    logs.forEach((log) => {
      let cat: UnifiedActivity['category'] = 'ETAPA';
      let title = 'Apontamento de Galpão';

      if (log.actionType === 'HOLE_CREATED') {
        cat = 'FURO';
        title = log.actionTitle || 'Cadastro de Furo';
      } else if (log.actionType === 'HOLE_UPDATED') {
        cat = 'FURO';
        title = log.actionTitle || 'Atualização de Furo';
      } else if (log.actionType === 'AR_CREATED' || log.actionType === 'AR_UPDATED') {
        cat = 'REMESSA';
        title = log.actionTitle || 'Remessa de Envio (AR)';
      } else if (log.actionType === 'PHOTO_UPLOADED') {
        cat = 'FOTO_QAQC';
        title = log.actionTitle || 'Foto de Padrão QA/QC';
      } else if (log.actionType === 'OREAS_STOCK') {
        cat = 'ESTOQUE';
        title = log.actionTitle || 'Movimentação Estoque OREAS';
      } else if (log.actionType === 'SAMPLE_PLAN_UPDATED') {
        cat = 'AMOSTRAGEM';
        title = log.actionTitle || 'Plano de Amostragem';
      } else if (log.stageId) {
        const stage = getStageById(log.stageId);
        cat = 'ETAPA';
        title = `Etapa ${stage.id}: ${stage.shortName}`;
      }

      const hole = holes.find((h) => h.id === log.drillHoleId);
      const refCode = hole?.code || log.drillHoleId || undefined;

      const meterText =
        log.startMeter !== undefined && log.endMeter !== undefined && log.startMeter !== log.endMeter
          ? `${log.startMeter}m - ${log.endMeter}m (+${Math.abs(log.endMeter - log.startMeter)}m)`
          : undefined;

      const key = `log_${log.id}`;
      seenActivityKeys.add(key);

      list.push({
        id: log.id,
        userId: log.userId,
        userName: log.userName || 'Operador',
        userRole: log.userRole,
        category: cat,
        title,
        referenceCode: refCode,
        details: log.notes || (meterText ? `Trecho: ${meterText}` : 'Registro operacional realizado no sistema.'),
        date: log.date || (log.createdAt ? log.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        createdAt: log.createdAt || log.date || new Date().toISOString(),
        meterage: meterText,
      });
    });

    // 2. Derive hole creation activities
    holes.forEach((hole) => {
      if (hole.createdByUserId || hole.createdByName) {
        const key = `hole_created_${hole.id}`;
        if (!seenActivityKeys.has(key)) {
          seenActivityKeys.add(key);
          list.push({
            id: key,
            userId: hole.createdByUserId || 'usr_unknown',
            userName: hole.createdByName || 'Operador',
            category: 'FURO',
            title: `Cadastro do Furo ${hole.code}`,
            referenceCode: hole.code,
            details: `Alvo: ${hole.target || 'GERAL'} • Planejamento de ${hole.calculatedSampleCount || 0} amostras.`,
            date: hole.createdAt ? hole.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
            createdAt: hole.createdAt || new Date().toISOString(),
          });
        }
      }
    });

    // 3. Derive AR shipment creation/actions
    ars.forEach((ar) => {
      if (ar.createdById || ar.createdByName) {
        const key = `ar_created_${ar.id}`;
        if (!seenActivityKeys.has(key)) {
          seenActivityKeys.add(key);
          list.push({
            id: key,
            userId: ar.createdById || 'usr_unknown',
            userName: ar.createdByName || 'Operador',
            category: 'REMESSA',
            title: `Geração de Remessa ${ar.arCode}`,
            referenceCode: ar.drillHoleCode || ar.arCode,
            details: `Remessa com ${ar.sampleCount || 0} amostras • ${ar.qaqcSamples?.length || 0} QA/QC inseridos • Peso: ${ar.weightKg || 0}kg.`,
            date: ar.createdAt ? ar.createdAt.split('T')[0] : (ar.shipmentDate || new Date().toISOString().split('T')[0]),
            createdAt: ar.createdAt || new Date().toISOString(),
          });
        }
      }
    });

    // 4. Derive QA/QC photo uploads
    photos.forEach((photo) => {
      if (photo.capturedByUserId || photo.capturedByName) {
        const key = `photo_${photo.id}`;
        if (!seenActivityKeys.has(key)) {
          seenActivityKeys.add(key);
          list.push({
            id: key,
            userId: photo.capturedByUserId || 'usr_unknown',
            userName: photo.capturedByName || 'Operador',
            category: 'FOTO_QAQC',
            title: `Anexo de Foto QA/QC (${photo.sampleCode || 'Padrão'})`,
            referenceCode: photo.arCode || photo.drillHoleCode,
            details: `Registro fotográfico de ${photo.sampleType || 'Padrão'} da remessa ${photo.arCode || 'AR'}.`,
            date: photo.capturedAt ? photo.capturedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            createdAt: photo.capturedAt || new Date().toISOString(),
          });
        }
      }
    });

    // 5. Derive OREAS CRM stock additions
    oreasStockEntries.forEach((entry) => {
      if (entry.createdById || entry.createdByName) {
        const key = `oreas_${entry.id}`;
        if (!seenActivityKeys.has(key)) {
          seenActivityKeys.add(key);
          list.push({
            id: key,
            userId: entry.createdById || 'usr_unknown',
            userName: entry.createdByName || 'Operador',
            category: 'ESTOQUE',
            title: `Entrada CRM OREAS ${entry.code}`,
            referenceCode: `OREAS ${entry.code}`,
            details: `+${entry.quantity} un adicionadas ao estoque (${entry.lotOrNotes || 'Sem observações'}).`,
            date: entry.date || (entry.createdAt ? entry.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
            createdAt: entry.createdAt || new Date().toISOString(),
          });
        }
      }
    });

    // Sort newest first
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [logs, holes, ars, photos, oreasStockEntries]);

  // Helper to find latest activity and stats for a specific user
  const getUserActivityData = (user: User) => {
    const userNormalized = user.name.trim().toLowerCase();
    const userActivities = allActivities.filter((act) => {
      return (
        act.userId === user.id ||
        (act.userName && act.userName.trim().toLowerCase() === userNormalized)
      );
    });

    return {
      count: userActivities.length,
      latestActivity: userActivities.length > 0 ? userActivities[0] : null,
      activities: userActivities,
    };
  };

  // Filter activities for table view with period and category filtering
  const now = new Date().getTime();
  const filteredActivities = useMemo(() => {
    return allActivities.filter((act) => {
      // User filter
      if (selectedUserId !== 'ALL') {
        const targetUser = users.find((u) => u.id === selectedUserId);
        const matchId = act.userId === selectedUserId;
        const matchName = targetUser && act.userName.trim().toLowerCase() === targetUser.name.trim().toLowerCase();
        if (!matchId && !matchName) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && act.category !== selectedCategory) {
        return false;
      }

      // Period filter
      if (selectedPeriod !== 'ALL') {
        const days = parseInt(selectedPeriod, 10);
        const actTime = new Date(act.createdAt || act.date).getTime();
        if (!isNaN(actTime)) {
          const diffDays = (now - actTime) / (1000 * 60 * 60 * 24);
          if (diffDays > days) return false;
        }
      }

      return true;
    });
  }, [allActivities, selectedUserId, selectedCategory, selectedPeriod, users, now]);

  const getCategoryBadge = (category: UnifiedActivity['category']) => {
    switch (category) {
      case 'FURO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
            <FileText className="w-3 h-3" /> Furo
          </span>
        );
      case 'REMESSA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
            <Truck className="w-3 h-3" /> Remessa AR
          </span>
        );
      case 'FOTO_QAQC':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
            <Camera className="w-3 h-3" /> Foto QA/QC
          </span>
        );
      case 'ESTOQUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
            <Package className="w-3 h-3" /> Estoque CRM
          </span>
        );
      case 'AMOSTRAGEM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
            <Layers className="w-3 h-3" /> Amostragem
          </span>
        );
      case 'ETAPA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
            <Activity className="w-3 h-3" /> Galpão
          </span>
        );
    }
  };

  const formatActivityDateTime = (isoOrDateString: string) => {
    try {
      const d = new Date(isoOrDateString);
      if (isNaN(d.getTime())) return isoOrDateString;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoOrDateString;
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Users className="w-4 h-4" /> Gestão de Equipe & Atividades
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Atividades e Produtividade da Equipe
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Acompanhamento em tempo real de furos cadastrados, remessas geradas, fotos de QA/QC e apontamentos de cada operador.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenLocalDataModal && (
            <button
              type="button"
              onClick={onOpenLocalDataModal}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700 shadow-md transition-all flex items-center gap-2"
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Dados Locais & Backup</span>
            </button>
          )}

          {isMaster && (
            <button
              onClick={onOpenUserModal}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Gestão de Usuários (Master)</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const { count, latestActivity } = getUserActivityData(user);
          const isActive = user.id === activeUser.id;

          return (
            <div
              key={user.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                isActive
                  ? 'bg-slate-900 border-amber-500/50 shadow-sm'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {/* User Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-base shadow-sm shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                      {user.name}
                      {isActive && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                          Sua Conta
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {user.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/80 text-[10px] font-mono font-bold">
                    {count} {count === 1 ? 'ação' : 'ações'}
                  </span>
                  {(isMaster || isActive) && onEditUser && (
                    <button
                      type="button"
                      onClick={() => onEditUser(user)}
                      title={`Editar dados de ${user.name}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {isMaster && !isMasterUser(user) && onDeleteUserRequest && (
                    <button
                      type="button"
                      onClick={() => onDeleteUserRequest(user)}
                      title="Deletar Usuário"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Latest Activity Display */}
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-400" /> Última Atividade
                  </span>
                  {latestActivity && getCategoryBadge(latestActivity.category)}
                </div>

                {latestActivity ? (
                  <div className="flex flex-col gap-1">
                    <p className="font-bold text-white leading-snug">
                      {latestActivity.title}
                    </p>
                    <p className="text-slate-300 text-[11px] line-clamp-2">
                      {latestActivity.details}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatActivityDateTime(latestActivity.createdAt || latestActivity.date)}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs py-1">
                    Nenhuma atividade registrada por este usuário ainda.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unified Production & Activity History Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col gap-4">
        {/* Retention Info Banner */}
        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-amber-200/90 gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Registro & Auditoria Operacional:</strong> Todo o histórico de ações e apontamentos fica registrado em tempo real e preservado com retenção completa para auditoria.
            </span>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 whitespace-nowrap">
            HISTÓRICO PERMANENTE
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Histórico Geral de Atividades ({filteredActivities.length} registros)
          </h3>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Operator Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Operador:</span>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 font-semibold text-slate-200 outline-none focus:border-amber-500 text-xs"
              >
                <option value="ALL">Toda a Equipe ({allActivities.length})</option>
                {users.map((u) => {
                  const uCount = allActivities.filter(
                    (a) => a.userId === u.id || a.userName.trim().toLowerCase() === u.name.trim().toLowerCase()
                  ).length;
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} ({uCount})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Tipo:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 font-semibold text-slate-200 outline-none focus:border-amber-500 text-xs"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="FURO">Furos Cadastrados</option>
                <option value="REMESSA">Remessas (AR)</option>
                <option value="FOTO_QAQC">Fotos QA/QC</option>
                <option value="ESTOQUE">Estoque OREAS</option>
                <option value="AMOSTRAGEM">Planos de Amostragem</option>
                <option value="ETAPA">Apontamentos de Galpão</option>
              </select>
            </div>

            {/* Period Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Período:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 font-semibold text-slate-200 outline-none focus:border-amber-500 text-xs"
              >
                <option value="ALL">Todo o Histórico</option>
                <option value="365">Últimos 12 Meses</option>
                <option value="180">Últimos 180 Dias</option>
                <option value="90">Últimos 90 Dias</option>
                <option value="30">Últimos 30 Dias</option>
                <option value="7">Últimos 7 Dias</option>
              </select>
            </div>
          </div>
        </div>

        {/* History Table */}
        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
            <Activity className="w-8 h-8 text-slate-600" />
            <p className="text-xs text-slate-400 italic">
              Nenhuma atividade encontrada para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Operador</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Ação Realizada</th>
                  <th className="py-2.5 px-3">Referência</th>
                  <th className="py-2.5 px-3">Detalhes / Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-800/40 font-medium transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                      {formatActivityDateTime(act.createdAt || act.date)}
                    </td>
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                      {act.userName}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getCategoryBadge(act.category)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-200 whitespace-nowrap">
                      {act.title}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                      {act.referenceCode || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-300 text-[11px] max-w-md">
                      {act.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { OreasStockEntry, SampleShipmentAR, User } from '../types';
import { calculateOreasBalances, OreasStockSummaryItem } from '../utils/oreasStock';
import {
  Boxes,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
  History,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Truck,
  ShieldCheck,
} from 'lucide-react';

interface OreasStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  oreasStockEntries: OreasStockEntry[];
  ars: SampleShipmentAR[];
  activeUser: User;
  onSaveEntry: (entry: OreasStockEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onDeleteCode: (code: string) => void;
}

export const OreasStockModal: React.FC<OreasStockModalProps> = ({
  isOpen,
  onClose,
  oreasStockEntries,
  ars,
  activeUser,
  onSaveEntry,
  onDeleteEntry,
  onDeleteCode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [codeToDelete, setCodeToDelete] = useState<OreasStockSummaryItem | null>(null);

  // New Entry Form State
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [lotOrNotes, setLotOrNotes] = useState('');
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const summaries = calculateOreasBalances(oreasStockEntries, ars);

  // Filtered list
  const filteredSummaries = summaries.filter((item) =>
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // KPIs
  const totalCodes = summaries.length;
  const totalCurrentStock = summaries.reduce((acc, item) => acc + item.currentStock, 0);
  const lowStockCount = summaries.filter((item) => item.status === 'low').length;
  const outOfStockCount = summaries.filter((item) => item.status === 'out_of_stock').length;

  const criticalItems = summaries.filter(
    (item) => item.status === 'out_of_stock' || item.status === 'low'
  );

  const existingCodes = Array.from(new Set(summaries.map((s) => s.code)));

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setFormError('Informe o nome do produto OREAS (ex: 250c, 626).');
      return;
    }

    if (quantity <= 0) {
      setFormError('A quantidade recebida deve ser maior que zero.');
      return;
    }

    const newEntry: OreasStockEntry = {
      id: `os_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: trimmedCode,
      quantity,
      date: date || new Date().toISOString().split('T')[0],
      lotOrNotes: lotOrNotes.trim() || undefined,
      createdById: activeUser.id,
      createdByName: activeUser.name,
      createdAt: new Date().toISOString(),
    };

    onSaveEntry(newEntry);

    // Reset form
    setCode('');
    setQuantity(10);
    setLotOrNotes('');
    setIsAddingEntry(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <span>Estoque de Amostras Padrão OREAS</span>
                <span className="text-xs bg-purple-950 text-purple-300 border border-purple-800/80 font-mono px-2 py-0.5 rounded-full font-semibold">
                  QA/QC Galpão
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Gerenciamento de saldo, entradas de reabastecimento e baixas automáticas por AR
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

        {/* Modal Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto flex-1">
          {/* KPI Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-400">Padrões Cadastrados</span>
              <span className="text-xl font-black font-mono text-white mt-1">{totalCodes} códigos</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-400">Saldo Total Em Estoque</span>
              <span className="text-xl font-black font-mono text-emerald-400 mt-1">{totalCurrentStock} un.</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-400">Estoque Baixo (1-5)</span>
              <span className={`text-xl font-black font-mono mt-1 ${lowStockCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {lowStockCount} códigos
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-400">Zerado ou Negativo</span>
              <span className={`text-xl font-black font-mono mt-1 ${outOfStockCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {outOfStockCount} códigos
              </span>
            </div>
          </div>

          {/* Critical Stock Alert Banner */}
          {criticalItems.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Alertas de Estoque de OREAS Crítico / Baixo ({criticalItems.length})</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {criticalItems.map((item) => (
                  <span
                    key={item.code}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-bold flex items-center gap-1.5 ${
                      item.status === 'out_of_stock'
                        ? 'bg-red-950/80 text-red-300 border-red-800/80'
                        : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                    }`}
                  >
                    <span>{item.code}:</span>
                    <strong>{item.currentStock} un</strong>
                    <span className="text-[10px] uppercase font-normal opacity-80">
                      ({item.status === 'out_of_stock' ? 'Zerado/Insuficiente' : 'Estoque Baixo'})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Entry Form Toggle / Add Entry Box */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-purple-500/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  Cadastrar Entrada / Reabastecimento de OREAS
                </span>
              </div>

              {!isAddingEntry && (
                <button
                  onClick={() => setIsAddingEntry(true)}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-purple-900/30"
                >
                  <Plus className="w-4 h-4" /> Nova Entrada de Estoque
                </button>
              )}
            </div>

            {isAddingEntry && (
              <form onSubmit={handleAddSubmit} className="mt-2 pt-3 border-t border-slate-800/80 flex flex-col gap-3">
                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Code Select/Type */}
                  <div className="flex flex-col gap-1 sm:col-span-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Produto OREAS *
                    </label>
                    <input
                      type="text"
                      list="oreas-codes-list"
                      placeholder="Ex: 250c, 626"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 font-mono text-purple-300 font-bold text-xs outline-none focus:border-purple-500"
                    />
                    <datalist id="oreas-codes-list">
                      {existingCodes.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  {/* Quantity */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Qtd Recebida (un) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 font-mono text-white text-xs font-bold outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Entry Date */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Data de Entrada
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Lot / Observation */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Lote / Obs Livre
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: NF 1042, Galpão A"
                      value={lotOrNotes}
                      onChange={(e) => setLotOrNotes(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingEntry(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs font-semibold hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Entrada
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Search & List Table */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Saldos Por Produto OREAS ({filteredSummaries.length})
              </span>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por produto (ex: 250c, 626)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {filteredSummaries.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/50 rounded-xl border border-slate-800">
                Nenhum produto OREAS cadastrado ou encontrado. Clique em "+ Nova Entrada de Estoque" para registrar a primeira entrada.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredSummaries.map((item) => {
                  const isExpanded = expandedCode === item.code;

                  return (
                    <div
                      key={item.code}
                      className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden transition-all"
                    >
                      {/* Main Summary Row */}
                      <div
                        onClick={() => setExpandedCode(isExpanded ? null : item.code)}
                        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 font-mono font-black text-purple-300 text-xs flex items-center justify-center shrink-0 px-1 truncate">
                            {item.code}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-white">{item.code}</span>
                              {item.status === 'out_of_stock' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950/90 text-red-300 border border-red-800 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Zerado / Insuficiente
                                </span>
                              )}
                              {item.status === 'low' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-800 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Estoque Baixo
                                </span>
                              )}
                              {item.status === 'normal' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> OK
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {item.entries.length} entrada(s) de estoque • Usado em {item.usages.length} remessa(s) AR
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                              Saldo Atual
                            </span>
                            <span className={`font-mono font-black text-base ${
                              item.currentStock <= 0
                                ? 'text-red-400'
                                : item.currentStock <= 5
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}>
                              {item.currentStock} un.
                            </span>
                          </div>

                          <div className="hidden sm:flex text-xs text-slate-400 gap-3 border-l border-slate-800 pl-3">
                            <div>
                              <span className="text-[10px] text-slate-500 block">Entradas</span>
                              <span className="font-mono font-semibold text-slate-300">{item.totalReceived}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">Saídas (ARs)</span>
                              <span className="font-mono font-semibold text-slate-300">{item.totalUsed}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 border-l border-slate-800/80 pl-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCodeToDelete(item);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/60 border border-transparent hover:border-red-800/50 transition-colors"
                              title={`Excluir produto ${item.code} do estoque`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <button className="p-1.5 rounded text-slate-400 hover:text-white">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded History Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-900/40 flex flex-col gap-4 text-xs">
                          {/* Stock Entries Table */}
                          <div>
                            <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                              <PackagePlus className="w-3.5 h-3.5 text-purple-400" />
                              Histórico de Entradas de Estoque ({item.entries.length})
                            </span>
                            {item.entries.length === 0 ? (
                              <p className="text-slate-500 italic text-[11px]">Nenhuma entrada registrada para este código.</p>
                            ) : (
                              <div className="overflow-x-auto rounded-lg border border-slate-800">
                                <table className="w-full text-left border-collapse text-slate-300">
                                  <thead>
                                    <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                                      <th className="py-2 px-3">Data</th>
                                      <th className="py-2 px-3">Qtd Recebida</th>
                                      <th className="py-2 px-3">Lote / Obs</th>
                                      <th className="py-2 px-3">Cadastrado Por</th>
                                      <th className="py-2 px-3 text-right">Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                                    {item.entries.map((entry) => (
                                      <tr key={entry.id} className="hover:bg-slate-800/30">
                                        <td className="py-2 px-3 font-mono text-slate-300">{entry.date}</td>
                                        <td className="py-2 px-3 font-mono font-bold text-emerald-400">+{entry.quantity} un</td>
                                        <td className="py-2 px-3 text-slate-300">{entry.lotOrNotes || '-'}</td>
                                        <td className="py-2 px-3 text-slate-400">{entry.createdByName || '-'}</td>
                                        <td className="py-2 px-3 text-right">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (confirm(`Remover esta entrada de ${entry.quantity}un do OREAS ${entry.code}?`)) {
                                                onDeleteEntry(entry.id);
                                              }
                                            }}
                                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800"
                                            title="Excluir entrada"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* Usage in ARs Table */}
                          <div>
                            <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-cyan-400" />
                              Saídas / Utilização em Remessas (ARs) ({item.usages.length})
                            </span>
                            {item.usages.length === 0 ? (
                              <p className="text-slate-500 italic text-[11px]">Nenhum uso em AR registrado ainda.</p>
                            ) : (
                              <div className="overflow-x-auto rounded-lg border border-slate-800">
                                <table className="w-full text-left border-collapse text-slate-300">
                                  <thead>
                                    <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                                      <th className="py-2 px-3">Data AR</th>
                                      <th className="py-2 px-3">Código AR</th>
                                      <th className="py-2 px-3">Furo</th>
                                      <th className="py-2 px-3">Cód. Amostra</th>
                                      <th className="py-2 px-3">Qtd Utilizada</th>
                                      <th className="py-2 px-3">Utilizado Por</th>
                                      <th className="py-2 px-3">Obs / Lote</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                                    {item.usages.map((u, idx) => (
                                      <tr key={`${u.arId}_${idx}`} className="hover:bg-slate-800/30">
                                        <td className="py-2 px-3 font-mono text-slate-300">{u.shipmentDate}</td>
                                        <td className="py-2 px-3 font-mono font-bold text-cyan-300">{u.arCode}</td>
                                        <td className="py-2 px-3 font-mono text-slate-300">{u.drillHoleCode}</td>
                                        <td className="py-2 px-3 font-mono text-purple-300">{u.sampleCode || '-'}</td>
                                        <td className="py-2 px-3 font-mono font-bold text-amber-400">-{u.quantityUsed} un</td>
                                        <td className="py-2 px-3 text-slate-300 font-medium">{u.userName || '-'}</td>
                                        <td className="py-2 px-3 text-slate-400">{u.notes || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <p className="text-[11px] text-slate-400">
            ℹ️ As baixas de estoque ocorrem automaticamente ao registrar ou editar amostras OREAS nas ARs.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Delete Code Confirmation Overlay Modal */}
      {codeToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Excluir Produto do Estoque</h4>
                <p className="text-xs text-slate-400 font-mono">
                  Código: <strong className="text-purple-300">{codeToDelete.code}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir o código <strong className="text-white">{codeToDelete.code}</strong> do controle de estoque?
              Esta ação removerá o produto e todo o seu histórico de <strong>{codeToDelete.entries.length} entrada(s) de reabastecimento</strong> associadas.
            </p>

            {/* Warning if currentStock != 0 */}
            {codeToDelete.currentStock !== 0 && (
              <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-200 text-xs flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Atenção: Saldo em Estoque Não Zerado</span>
                </div>
                <p className="text-[11px] text-amber-100/90 leading-normal">
                  Este produto ainda possui <strong>{codeToDelete.currentStock} unidade(s)</strong> registradas em estoque ({codeToDelete.totalReceived} recebidas, {codeToDelete.totalUsed} utilizadas em ARs). Deseja excluir mesmo assim?
                </p>
              </div>
            )}

            {/* Preserved Usage Info Note */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              ℹ️ <strong>Histórico de Uso Preservado:</strong> Os registros das remessas (ARs) passadas em que o código <span className="font-mono text-slate-300">{codeToDelete.code}</span> foi utilizado <strong>não serão afetados</strong> nem excluídos.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCodeToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCode(codeToDelete.code);
                  setCodeToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-red-950/50"
              >
                <Trash2 className="w-4 h-4" /> Sim, Excluir Produto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

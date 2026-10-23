import React, { useState, useEffect, useCallback } from 'react';
import { User, DrillHole, SampleShipmentAR, OreasStockEntry, QaQcSample, SampleRange, QAQCSamplePhoto, ProductionLog } from './types';
import { loadActiveUserId, saveActiveUserId } from './utils/storage';
import {
  subscribeUsers,
  subscribeHoles,
  subscribeARs,
  subscribeOreasStock,
  subscribeQAQCPhotos,
  subscribeLogs,
  getLocalCachedUsers,
  getLocalCachedHoles,
  getLocalCachedLogs,
  getLocalCachedARs,
  getLocalCachedOreasStock,
  getLocalCachedPhotos,
  INITIAL_USERS,
  INITIAL_HOLES,
  INITIAL_LOGS,
  INITIAL_ARS,
  saveUserToDb,
  deleteUserFromDb,
  saveHoleToDb,
  deleteHoleFromDb,
  saveARToDb,
  deleteARFromDb,
  saveOreasStockEntryToDb,
  deleteOreasStockEntryFromDb,
  deleteOreasCodeFromDb,
  uploadQAQCSamplePhoto,
  deleteQAQCSamplePhotoFromDb,
  deleteExpiredQAQCPhotosFromDb,
  saveLogToDb,
  resetDatabaseToDemoData,
  importLocalBackupJson,
} from './services/firebase';
import {
  initFileSystemFolderSync,
  subscribeFolderSync,
  FolderSyncState,
} from './utils/fileSystemFolderSync';
import { parseSampleRange, parseSampleRanges, generateARsForSampleRange, generatePackingPlan } from './utils/calculator';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { UserPanel } from './components/UserPanel';
import { ShipmentsView } from './components/ShipmentsView';
import { NewHoleModal } from './components/NewHoleModal';
import { CreateARModal } from './components/CreateARModal';
import { OreasStockModal } from './components/OreasStockModal';
import { UserManagementModal } from './components/UserManagementModal';
import { AuthModal } from './components/AuthModal';
import { HoleDetailModal } from './components/HoleDetailModal';
import { DeleteHoleModal } from './components/DeleteHoleModal';
import { DeleteUserModal } from './components/DeleteUserModal';
import { PackingPlanModal } from './components/PackingPlanModal';
import { QAQCPdfReportModal } from './components/QAQCPdfReportModal';
import { LocalDataModal } from './components/LocalDataModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { MobilePhotoSyncModal } from './components/MobilePhotoSyncModal';
import { AppThemeId, THEME_OPTIONS } from './types/themes';
import { CheckCircle2, Loader2, Sun, Moon } from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState<User[]>(() => {
    const cached = getLocalCachedUsers();
    return cached.length > 0 ? cached : INITIAL_USERS;
  });
  const [holes, setHoles] = useState<DrillHole[]>(() => {
    const cached = getLocalCachedHoles();
    return cached.length > 0 ? cached : INITIAL_HOLES;
  });
  const [ars, setARs] = useState<SampleShipmentAR[]>(() => {
    const cached = getLocalCachedARs();
    return cached.length > 0 ? cached : INITIAL_ARS;
  });
  const [oreasStockEntries, setOreasStockEntries] = useState<OreasStockEntry[]>(() => {
    return getLocalCachedOreasStock();
  });
  const [qaqcPhotos, setQaqcPhotos] = useState<QAQCSamplePhoto[]>(() => {
    return getLocalCachedPhotos();
  });
  const [logs, setLogs] = useState<ProductionLog[]>(() => {
    const cached = getLocalCachedLogs();
    return cached.length > 0 ? cached : INITIAL_LOGS;
  });
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return getLocalCachedUsers().length === 0 && getLocalCachedHoles().length === 0;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('argmgp_authenticated') === 'true';
  });

  // Theme state supporting 7 specialized themes
  const [theme, setTheme] = useState<AppThemeId>(() => {
    return (localStorage.getItem('argmgp_theme') as AppThemeId) || 'dark';
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('argmgp_theme', theme);
    // Remove all previous theme classes
    const themeClasses = [
      'theme-dark',
      'theme-light',
      'theme-emerald',
      'theme-cyberpunk',
      'theme-warm-earth',
      'theme-dracula-night',
      'theme-mono-clean',
    ];
    themeClasses.forEach((cls) => document.documentElement.classList.remove(cls));

    // Add current theme class
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  const handleSelectTheme = (selectedTheme: AppThemeId) => {
    setTheme(selectedTheme);
    const themeObj = THEME_OPTIONS.find((t) => t.id === selectedTheme);
    triggerToast(`Tema visual alterado para: ${themeObj?.name || selectedTheme}`);
  };

  const handleToggleTheme = () => {
    setIsThemeModalOpen(true);
  };

  // Modals
  const [isCreateARModalOpen, setIsCreateARModalOpen] = useState(false);
  const [arInitialHoleId, setArInitialHoleId] = useState<string | undefined>();
  const [arToEdit, setArToEdit] = useState<SampleShipmentAR | null>(null);

  const [isOreasStockModalOpen, setIsOreasStockModalOpen] = useState(false);
  const [packingPlanAR, setPackingPlanAR] = useState<SampleShipmentAR | null>(null);
  const [packingPlanInitialTab, setPackingPlanInitialTab] = useState<'plan' | 'photos'>('plan');

  const [isNewHoleModalOpen, setIsNewHoleModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserIdForModal, setEditingUserIdForModal] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLocalDataModalOpen, setIsLocalDataModalOpen] = useState(false);
  const [isMobilePhotoModalOpen, setIsMobilePhotoModalOpen] = useState(false);
  const [mobilePhotoHoleId, setMobilePhotoHoleId] = useState<string | undefined>();
  const [mobilePhotoArId, setMobilePhotoArId] = useState<string | undefined>();
  const [isPdfReportModalOpen, setIsPdfReportModalOpen] = useState(false);
  const [pdfReportDefaultDate, setPdfReportDefaultDate] = useState<string | undefined>(undefined);
  const [detailHoleId, setDetailHoleId] = useState<string | null>(null);
  const detailHole = holes.find((h) => h.id === detailHoleId) || null;
  const [holeToDelete, setHoleToDelete] = useState<DrillHole | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Folder Storage & Machine Sync State
  const [folderSyncState, setFolderSyncState] = useState<FolderSyncState>({
    isSupported: typeof window !== 'undefined' && 'showDirectoryPicker' in window,
    isLinked: false,
    folderName: null,
    lastSavedAt: null,
    lastLoadedAt: null,
    isAutoSaveActive: true,
    error: null,
    isWriting: false,
  });

  // Tab view
  const [activeTab, setActiveTab] = useState<'dashboard' | 'shipments' | 'team'>('dashboard');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Security & URL Hygiene
  useEffect(() => {
    if (window.location.search || window.location.hash) {
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, document.title, cleanUrl);
      } catch (e) {
        console.error('Erro ao limpar parâmetros da URL:', e);
      }
    }
  }, []);

  // Realtime synchronization with shared local database & PC folder
  useEffect(() => {
    const loadedActiveId = loadActiveUserId();
    setActiveUserId(loadedActiveId);

    // Initialize Folder Sync
    initFileSystemFolderSync(async (json) => {
      await importLocalBackupJson(json);
    });

    const unsubFolder = subscribeFolderSync((state) => {
      setFolderSyncState(state);
    });

    const unsubUsers = subscribeUsers((loadedUsers) => {
      setUsers(loadedUsers);
      setIsLoading(false);
    });

    const unsubHoles = subscribeHoles((loadedHoles) => {
      setHoles(loadedHoles);
    });

    const unsubARs = subscribeARs((loadedARs) => {
      setARs(loadedARs);
    });

    const unsubStock = subscribeOreasStock((loadedStock) => {
      setOreasStockEntries(loadedStock);
    });

    const unsubPhotos = subscribeQAQCPhotos((loadedPhotos) => {
      setQaqcPhotos(loadedPhotos);
    });

    const unsubLogs = subscribeLogs((loadedLogs) => {
      setLogs(loadedLogs);
    });

    return () => {
      unsubFolder();
      unsubUsers();
      unsubHoles();
      unsubARs();
      unsubStock();
      unsubPhotos();
      unsubLogs();
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const activeUser = users.find((u) => u.id === activeUserId) || users[0] || {
    id: 'usr_guest',
    name: 'Operador',
    role: 'Geólogo',
    createdAt: new Date().toISOString(),
  };

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setActiveUserId(user.id);
    saveActiveUserId(user.id);
    setIsAuthenticated(true);
    sessionStorage.setItem('argmgp_authenticated', 'true');
    triggerToast(`Acesso liberado! Bem-vindo(a), ${user.name} (${user.role}).`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('argmgp_authenticated');
    saveActiveUserId('');
    setActiveUserId('');
    triggerToast('Sessão encerrada com sucesso. Faça login para continuar.');
  };

  // User Handlers
  const handleSelectActiveUser = (user: User) => {
    setActiveUserId(user.id);
    saveActiveUserId(user.id);
    triggerToast(`Operador ativo alterado para: ${user.name}`);
  };

  const handleAddUser = async (newUserData: Omit<User, 'id' | 'createdAt'>) => {
    try {
      const newUser: User = {
        ...newUserData,
        id: `usr_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      // Optimistic update
      setUsers((prev) => [...prev, newUser]);
      await saveUserToDb(newUser);
      triggerToast(`Membro ${newUser.name} cadastrado com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao cadastrar usuário:', err);
      triggerToast(`Membro cadastrado no cache local.`);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      // 1. Optimistic update immediately so UI never reverts
      setUsers((prev) => {
        const index = prev.findIndex((u) => u.id === updatedUser.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedUser;
          return next;
        }
        return [...prev, updatedUser];
      });

      // If active user is updated, keep active user ID synced
      if (activeUserId === updatedUser.id || (!activeUserId && (updatedUser.id === 'usr_master_rafael' || updatedUser.isMaster))) {
        setActiveUserId(updatedUser.id);
        saveActiveUserId(updatedUser.id);
      }

      // 2. Persist to storage and Firestore
      await saveUserToDb(updatedUser);
      triggerToast(`Nome e dados de "${updatedUser.name}" atualizados com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err);
      triggerToast(`Usuário atualizado no dispositivo.`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const targetUser = users.find((u) => u.id === userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      await deleteUserFromDb(userId);
      triggerToast(`Usuário ${targetUser?.name || ''} excluído com sucesso!`);
      if (activeUserId === userId) {
        const remainingUsers = users.filter((u) => u.id !== userId);
        if (remainingUsers.length > 0) {
          setActiveUserId(remainingUsers[0].id);
          saveActiveUserId(remainingUsers[0].id);
        } else {
          setActiveUserId('');
          saveActiveUserId('');
        }
      }
    } catch (err: any) {
      console.error('Erro ao excluir usuário:', err);
      triggerToast(`Erro ao excluir usuário.`);
    }
  };

  // Activity logger helper
  const logUserActivity = async (
    actionType: ProductionLog['actionType'],
    actionTitle: string,
    drillHoleId: string = '',
    notes?: string
  ) => {
    try {
      const newLog: ProductionLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        drillHoleId,
        userId: activeUser.id,
        userName: activeUser.name,
        userRole: activeUser.role,
        actionType,
        actionTitle,
        date: new Date().toISOString().split('T')[0],
        notes,
        createdAt: new Date().toISOString(),
      };
      await saveLogToDb(newLog);
    } catch (e) {
      console.warn('Falha ao registrar log de atividade:', e);
    }
  };

  // Hole / Sample Registration with Automatic AR Generation
  const handleCreateHole = async (holeData: {
    code: string;
    target?: string;
    firstSampleCode: string;
    lastSampleCode: string;
    sampleRanges?: SampleRange[];
    calculatedSampleCount: number;
    weightKg?: number;
    shipmentDate?: string;
    notes?: string;
    qaqcSamples?: QaQcSample[];
    arCode?: string;
  }) => {
    try {
      const newHoleId = `hole_${Date.now()}`;
      const newHole: DrillHole = {
        id: newHoleId,
        code: holeData.code,
        target: holeData.target || 'GERAL',
        firstSampleCode: holeData.firstSampleCode,
        lastSampleCode: holeData.lastSampleCode,
        sampleRanges: holeData.sampleRanges,
        calculatedSampleCount: holeData.calculatedSampleCount,
        createdByUserId: activeUser.id,
        createdByName: activeUser.name,
        createdAt: new Date().toISOString(),
        startMeter: 0,
        endMeter: 0,
        totalMeters: 0,
        totalCases: 0,
        isLegacyKorePending: false,
      };

      // Save Hole first
      await saveHoleToDb(newHole);

      // Generate Automatic AR(s) based on sample count
      const autoARs = generateARsForSampleRange(
        { id: newHoleId, code: holeData.code },
        holeData.firstSampleCode,
        holeData.lastSampleCode,
        ars,
        activeUser,
        {
          customArCode: holeData.arCode,
          weightKg: holeData.weightKg,
          shipmentDate: holeData.shipmentDate,
          notes: holeData.notes,
          qaqcSamples: holeData.qaqcSamples,
        },
        holeData.sampleRanges
      );

      // Save each generated AR to database
      for (const ar of autoARs) {
        const newAR: SampleShipmentAR = {
          ...ar,
          id: `ar_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          createdAt: new Date().toISOString(),
        };
        await saveARToDb(newAR);
      }

      // Log hole creation activity
      await logUserActivity(
        'HOLE_CREATED',
        `Cadastro do Furo ${newHole.code}`,
        newHole.id,
        `Alvo: ${newHole.target || 'GERAL'} • ${newHole.calculatedSampleCount || 0} amostras planejadas • ${autoARs.length} AR(s) gerada(s).`
      );

      triggerToast(
        `Furo ${newHole.code} cadastrado! Criado(s) ${autoARs.length} AR(s) com os padrões e dados de envio.`
      );
    } catch (err: any) {
      console.error('Erro ao cadastrar furo:', err);
      triggerToast(`Erro ao salvar no banco: ${err?.message || 'Falha na conexão'}`);
    }
  };

  const handleDeleteHole = async (holeId: string) => {
    try {
      const targetHole = holes.find((h) => h.id === holeId);
      const associatedArIds = ars.filter((ar) => ar.drillHoleId === holeId).map((a) => a.id);

      await deleteHoleFromDb(holeId, [], associatedArIds);

      if (detailHoleId === holeId) {
        setDetailHoleId(null);
      }

      triggerToast(`Cadastro ${targetHole?.code || ''} e seus ARs foram excluídos.`);
    } catch (err: any) {
      console.error('Erro ao excluir furo:', err);
      triggerToast(`Erro ao excluir no banco: ${err?.message || 'Falha na conexão'}`);
    }
  };

  // AR Handlers
  const handleOpenCreateARModal = (holeId?: string) => {
    setArToEdit(null);
    setArInitialHoleId(holeId);
    setIsCreateARModalOpen(true);
  };

  const handleOpenEditARModal = (ar: SampleShipmentAR) => {
    setArToEdit(ar);
    setIsCreateARModalOpen(true);
  };

  const handleSaveAR = async (
    arData: Omit<SampleShipmentAR, 'id' | 'createdAt'>,
    existingArId?: string
  ) => {
    try {
      const cleanStart = arData.startSampleCode.trim().toUpperCase();
      const cleanEnd = arData.endSampleCode.trim().toUpperCase();
      const normalizedRanges: SampleRange[] =
        arData.sampleRanges && arData.sampleRanges.length > 0
          ? arData.sampleRanges.map((r) => ({
              firstSampleCode: r.firstSampleCode.trim().toUpperCase(),
              lastSampleCode: r.lastSampleCode.trim().toUpperCase(),
            }))
          : [{ firstSampleCode: cleanStart, lastSampleCode: cleanEnd }];

      const existingAr = existingArId ? ars.find((a) => a.id === existingArId) : undefined;
      const effectiveStandardSize = arData.standardSize || existingAr?.standardSize || 10;

      const packingPlan = generatePackingPlan(cleanStart, cleanEnd, effectiveStandardSize, normalizedRanges);
      const calculatedVolumes =
        packingPlan.isValid && packingPlan.totalVolumes > 0
          ? packingPlan.totalVolumes
          : arData.volumeCount || Math.max(1, Math.ceil(arData.sampleCount / effectiveStandardSize));

      if (existingArId) {
        if (existingAr) {
          const updatedAr: SampleShipmentAR = {
            ...existingAr,
            ...arData,
            startSampleCode: cleanStart,
            endSampleCode: cleanEnd,
            sampleRanges: normalizedRanges,
            volumeCount: calculatedVolumes,
            standardSize: effectiveStandardSize,
          };

          // Optimistic local state update
          setARs((prev) => prev.map((a) => (a.id === existingArId ? updatedAr : a)));
          await saveARToDb(updatedAr);

          // Find target hole and if this is the only AR for this hole, synchronize the hole's sample plan too
          const targetHole = holes.find(
            (h) =>
              h.id === updatedAr.drillHoleId ||
              (h.code && h.code.trim().toUpperCase() === updatedAr.drillHoleCode.trim().toUpperCase())
          );

          if (targetHole) {
            const holeARs = ars.filter(
              (a) =>
                a.drillHoleId === targetHole.id ||
                (a.drillHoleCode && a.drillHoleCode.trim().toUpperCase() === targetHole.code.trim().toUpperCase())
            );

            if (holeARs.length <= 1) {
              const updatedHole: DrillHole = {
                ...targetHole,
                firstSampleCode: cleanStart,
                lastSampleCode: cleanEnd,
                sampleRanges: normalizedRanges,
                calculatedSampleCount: updatedAr.sampleCount,
              };
              setHoles((prev) => prev.map((h) => (h.id === targetHole.id ? updatedHole : h)));
              await saveHoleToDb(updatedHole);
            }
          }

          await logUserActivity(
            'AR_UPDATED',
            `Atualização da Remessa ${arData.arCode}`,
            arData.drillHoleId,
            `Remessa ${arData.arCode} atualizada • ${arData.sampleCount || 0} amostras • Faixa ${cleanStart} a ${cleanEnd}.`
          );

          triggerToast(`Remessa ${arData.arCode} atualizada com sucesso! (${arData.sampleCount} amostras)`);
        }
      } else {
        const newAR: SampleShipmentAR = {
          ...arData,
          startSampleCode: cleanStart,
          endSampleCode: cleanEnd,
          sampleRanges: normalizedRanges,
          volumeCount: calculatedVolumes,
          standardSize: effectiveStandardSize,
          id: `ar_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        setARs((prev) => [newAR, ...prev]);
        await saveARToDb(newAR);

        await logUserActivity(
          'AR_CREATED',
          `Criação da Remessa ${newAR.arCode}`,
          newAR.drillHoleId,
          `Remessa ${newAR.arCode} criada • ${newAR.sampleCount || 0} amostras • Furo ${newAR.drillHoleCode}.`
        );

        triggerToast(`Remessa ${newAR.arCode} criada com sucesso!`);
      }
      setArToEdit(null);
    } catch (err: any) {
      console.error('Erro ao salvar remessa (AR):', err);
      triggerToast(`Erro ao salvar remessa no banco: ${err?.message || 'Falha na conexão'}`);
    }
  };

  // Real-time synchronization of packing plan volume count and standard size back to AR
  const handleUpdateARPackingPlan = useCallback(
    async (arId: string, volumeCount: number, standardSize: number) => {
      try {
        setARs((prevARs) => {
          const targetAR = prevARs.find((a) => a.id === arId);
          if (!targetAR) return prevARs;
          // Guard: if values are already identical, do not trigger state change
          if (targetAR.volumeCount === volumeCount && targetAR.standardSize === standardSize) {
            return prevARs;
          }

          const updatedAR: SampleShipmentAR = {
            ...targetAR,
            volumeCount,
            standardSize,
          };

          // Synchronize modal state if open
          setPackingPlanAR((current) => (current && current.id === arId ? updatedAR : current));

          // Persist to database asynchronously
          saveARToDb(updatedAR).catch((e) =>
            console.error('Erro ao atualizar volumes do plano de empacotamento no banco:', e)
          );

          return prevARs.map((a) => (a.id === arId ? updatedAR : a));
        });
      } catch (err) {
        console.error('Erro ao atualizar volumes do plano de empacotamento na AR:', err);
      }
    },
    []
  );

  // Direct inline update of AR weight
  const handleUpdateARWeight = useCallback(
    async (arId: string, weightKg: number) => {
      try {
        let arCode = '';
        setARs((prevARs) => {
          const targetAR = prevARs.find((a) => a.id === arId);
          if (!targetAR) return prevARs;
          arCode = targetAR.arCode;
          if (targetAR.weightKg === weightKg) {
            return prevARs;
          }

          const updatedAR: SampleShipmentAR = {
            ...targetAR,
            weightKg,
          };

          // Synchronize modal state if open
          setPackingPlanAR((current) => (current && current.id === arId ? updatedAR : current));

          // Persist to database asynchronously
          saveARToDb(updatedAR).catch((e) =>
            console.error('Erro ao atualizar peso da AR no banco:', e)
          );

          return prevARs.map((a) => (a.id === arId ? updatedAR : a));
        });

        triggerToast(`Peso da AR ${arCode || ''} atualizado para ${weightKg} kg!`);
      } catch (err) {
        console.error('Erro ao atualizar peso da AR:', err);
        triggerToast('Erro ao atualizar peso da AR.');
      }
    },
    [triggerToast]
  );

  const handleDeleteAR = async (arId: string) => {
    try {
      const targetAR = ars.find((a) => a.id === arId);
      await deleteARFromDb(arId);

      if (targetAR) {
        await logUserActivity(
          'AR_DELETED',
          `Exclusão da Remessa ${targetAR.arCode}`,
          targetAR.drillHoleId,
          `Remessa ${targetAR.arCode} foi excluída do sistema.`
        );
      }

      triggerToast(`Remessa ${targetAR?.arCode || ''} excluída com sucesso.`);
    } catch (err: any) {
      console.error('Erro ao excluir remessa:', err);
      triggerToast(`Erro ao excluir no banco: ${err?.message || 'Falha na conexão'}`);
    }
  };

  // OREAS Stock Handlers
  const handleSaveOreasStockEntry = async (entry: OreasStockEntry) => {
    try {
      await saveOreasStockEntryToDb(entry);

      await logUserActivity(
        'OREAS_STOCK',
        `Entrada Estoque OREAS ${entry.code}`,
        '',
        `Adicionadas +${entry.quantity} un ao estoque (${entry.lotOrNotes || 'Sem observações'}).`
      );

      triggerToast(`Entrada de estoque de OREAS ${entry.code} (+${entry.quantity}un) registrada com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao salvar entrada de estoque de OREAS:', err);
      triggerToast(`Erro ao salvar no banco: ${err?.message || 'Falha na conexão'}`);
    }
  };

  const handleDeleteOreasStockEntry = async (entryId: string) => {
    try {
      await deleteOreasStockEntryFromDb(entryId);
      triggerToast('Entrada de estoque de OREAS removida com sucesso.');
    } catch (err: any) {
      console.error('Erro ao remover entrada de estoque:', err);
      triggerToast(`Erro ao excluir no banco: ${err?.message || 'Falha na conexão'}`);
    }
  };

  const handleDeleteOreasCode = async (code: string) => {
    try {
      const count = await deleteOreasCodeFromDb(code, oreasStockEntries);
      triggerToast(`Produto/Código "${code}" e ${count} entrada(s) de estoque removidos com sucesso.`);
    } catch (err: any) {
      console.error('Erro ao remover código do estoque:', err);
      triggerToast(`Erro ao excluir no banco: ${err?.message || 'Falha na conexão'}`);
    }
  };

  const handleSaveSamplePlan = async (
    holeId: string,
    firstCode: string,
    lastCode: string,
    sampleRanges?: SampleRange[]
  ) => {
    try {
      const cleanFirst = firstCode.trim().toUpperCase();
      const cleanLast = lastCode.trim().toUpperCase();

      const normalizedRanges: SampleRange[] =
        sampleRanges && sampleRanges.length > 0
          ? sampleRanges.map((r) => ({
              firstSampleCode: r.firstSampleCode.trim().toUpperCase(),
              lastSampleCode: r.lastSampleCode.trim().toUpperCase(),
            }))
          : [{ firstSampleCode: cleanFirst, lastSampleCode: cleanLast }];

      const parsedMulti = parseSampleRanges(normalizedRanges, cleanFirst, cleanLast);
      const count = parsedMulti.isValid ? parsedMulti.totalCount : 0;

      const targetHole = holes.find((h) => h.id === holeId);
      if (!targetHole) return;

      const updatedHole: DrillHole = {
        ...targetHole,
        firstSampleCode: cleanFirst,
        lastSampleCode: cleanLast,
        sampleRanges: normalizedRanges,
        calculatedSampleCount: count,
      };

      // Optimistic local state update for instant UI feedback
      setHoles((prev) => prev.map((h) => (h.id === holeId ? updatedHole : h)));

      // Save hole to Firestore
      await saveHoleToDb(updatedHole);

      // Check linked ARs for this hole (both by ID and by hole code)
      const linkedARs = ars.filter(
        (ar) =>
          ar.drillHoleId === holeId ||
          (targetHole.code && ar.drillHoleCode?.trim().toUpperCase() === targetHole.code.trim().toUpperCase())
      );

      if (linkedARs.length === 1) {
        // Automatically sync the single AR with the new range, sample count, and volume count
        const singleAR = linkedARs[0];
        const newPacking = generatePackingPlan(cleanFirst, cleanLast, 10, normalizedRanges);
        const newVolumes =
          newPacking.isValid && newPacking.totalVolumes > 0
            ? newPacking.totalVolumes
            : Math.max(1, Math.ceil(count / 10));

        const updatedAR: SampleShipmentAR = {
          ...singleAR,
          drillHoleId: holeId,
          drillHoleCode: targetHole.code,
          startSampleCode: cleanFirst,
          endSampleCode: cleanLast,
          sampleRanges: normalizedRanges,
          sampleCount: count,
          volumeCount: newVolumes,
        };

        setARs((prev) => prev.map((a) => (a.id === singleAR.id ? updatedAR : a)));
        await saveARToDb(updatedAR);

        await logUserActivity(
          'SAMPLE_PLAN_UPDATED',
          `Plano de Amostragem e Remessa ${singleAR.arCode} do Furo ${targetHole.code}`,
          targetHole.id,
          `Faixa atualizada para ${cleanFirst} até ${cleanLast} (${count} amostras). Remessa ${singleAR.arCode} sincronizada automaticamente.`
        );

        triggerToast(
          `Plano do Furo e Remessa ${singleAR.arCode} atualizados com sucesso! (${count} amostras)`
        );
      } else if (linkedARs.length > 1) {
        // Hole has multiple ARs - keep individual AR data intact and notify user to review each AR
        await logUserActivity(
          'SAMPLE_PLAN_UPDATED',
          `Plano de Amostragem do Furo ${targetHole.code}`,
          targetHole.id,
          `Faixa atualizada para ${cleanFirst} até ${cleanLast} (${count} amostras). Atenção: ${linkedARs.length} remessas existentes requerem conferência manual.`
        );

        triggerToast(
          `Plano do furo atualizado (${count} amostras)! Como este furo possui ${linkedARs.length} remessas (ARs), revise as faixas de cada AR para bater com a nova faixa total.`
        );
      } else {
        await logUserActivity(
          'SAMPLE_PLAN_UPDATED',
          `Plano de Amostragem do Furo ${targetHole.code}`,
          targetHole.id,
          `Intervalo ${cleanFirst} até ${cleanLast} (${count} amostras calculadas).`
        );

        triggerToast(`Plano de Amostragem atualizado com sucesso! (${count} amostras calculadas)`);
      }
    } catch (err: any) {
      console.error('Erro ao salvar plano de amostragem:', err);
      triggerToast(`Erro ao salvar no banco: ${err?.message || 'Falha na conexão'}`);
    }
  };

  const handleUpdateStorageLocation = async (holeId: string, location: string) => {
    try {
      const targetHole = holes.find((h) => h.id === holeId);
      if (targetHole) {
        const updatedHole: DrillHole = { ...targetHole, storageLocation: location };
        setHoles((prev) => prev.map((h) => (h.id === holeId ? updatedHole : h)));
        await saveHoleToDb(updatedHole);

        await logUserActivity(
          'HOLE_UPDATED',
          `Localização do Furo ${targetHole.code}`,
          targetHole.id,
          `Localização de armazenamento definida: ${location}`
        );
      }
      triggerToast('Localização atualizada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar localização:', err);
      triggerToast(`Erro ao salvar localização: ${err?.message || 'Falha na conexão'}`);
    }
  };

  const handleUpdateHoleInfo = async (holeId: string, newCode: string, newTarget?: string) => {
    try {
      const targetHole = holes.find((h) => h.id === holeId);
      if (!targetHole) return;

      const trimmedCode = newCode.trim().toUpperCase();
      const trimmedTarget = (newTarget || 'GERAL').trim().toUpperCase();

      if (!trimmedCode) {
        triggerToast('O nome/código do furo não pode ser vazio.');
        return;
      }

      const updatedHole: DrillHole = {
        ...targetHole,
        code: trimmedCode,
        target: trimmedTarget,
      };

      setHoles((prev) => prev.map((h) => (h.id === holeId ? updatedHole : h)));
      await saveHoleToDb(updatedHole);

      // Also update drillHoleCode in all linked ARs
      const relatedARs = ars.filter((ar) => ar.drillHoleId === holeId);
      if (relatedARs.length > 0) {
        setARs((prev) =>
          prev.map((a) => (a.drillHoleId === holeId ? { ...a, drillHoleCode: trimmedCode } : a))
        );
      }
      for (const ar of relatedARs) {
        if (ar.drillHoleCode !== trimmedCode) {
          await saveARToDb({
            ...ar,
            drillHoleCode: trimmedCode,
          });
        }
      }

      await logUserActivity(
        'HOLE_UPDATED',
        `Edição do Furo ${trimmedCode}`,
        holeId,
        `Código: ${trimmedCode} • Alvo: ${trimmedTarget}`
      );

      triggerToast('Nome do furo e alvo atualizados com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar informações do furo:', err);
      triggerToast(`Erro ao atualizar no banco: ${err?.message || 'Falha na conexão'}`);
    }
  };

  const handleOpenHoleDetailByCode = (holeCode: string) => {
    const target = holes.find((h) => h.code.toLowerCase() === holeCode.toLowerCase());
    if (target) {
      setDetailHoleId(target.id);
    }
  };

  // Photo handlers for QA/QC standards
  const handleUploadPhoto = async (
    arId: string,
    file: File,
    sampleCode?: string,
    sampleType?: string,
    onProgress?: (percent: number, statusText: string) => void
  ) => {
    try {
      const ar = ars.find((a) => a.id === arId);
      await uploadQAQCSamplePhoto(
        {
          arId,
          arCode: ar?.arCode || 'ARGMGP-000',
          drillHoleCode: ar?.drillHoleCode || 'HOLE-000',
          sampleCode,
          sampleType,
          capturedAt: new Date().toISOString(),
          capturedByUserId: activeUser.id,
          capturedByName: activeUser.name,
        },
        file,
        onProgress
      );

      await logUserActivity(
        'PHOTO_UPLOADED',
        `Foto QA/QC (${sampleCode || 'Padrão'})`,
        ar?.drillHoleId || '',
        `Foto inserida para ${sampleType || 'Padrão'} ${sampleCode || ''} na remessa ${ar?.arCode || 'AR'}.`
      );

      triggerToast(`Foto da amostra ${sampleCode || 'padrão'} salva em alta definição!`);
    } catch (err: any) {
      console.error('Erro ao enviar foto:', err);
      triggerToast(err?.message || 'Erro ao salvar foto da amostra.');
      throw err;
    }
  };

  const handleDeletePhoto = async (photo: QAQCSamplePhoto) => {
    try {
      await deleteQAQCSamplePhotoFromDb(photo);
      triggerToast(`Foto (${photo.sampleCode || 'padrão'}) removida.`);
    } catch (err) {
      console.error('Erro ao remover foto:', err);
      triggerToast('Erro ao remover foto.');
    }
  };

  const handleCleanupExpiredPhotos = async () => {
    try {
      const count = await deleteExpiredQAQCPhotosFromDb(qaqcPhotos, 1095);
      if (count > 0) {
        triggerToast(`Limpeza concluída: ${count} foto(s) com mais de 3 anos (1.095 dias) removidas.`);
      } else {
        triggerToast('Nenhuma foto expirada (>3 anos / 1.095 dias) encontrada.');
      }
    } catch (err) {
      console.error('Erro na limpeza:', err);
      triggerToast('Erro ao executar limpeza de fotos.');
    }
  };

  const handleOpenPdfReportModal = (date?: string) => {
    setPdfReportDefaultDate(date);
    setIsPdfReportModalOpen(true);
  };

  const handleOpenPackingPlan = (ar: SampleShipmentAR, initialTab: 'plan' | 'photos' = 'plan') => {
    setPackingPlanAR(ar);
    setPackingPlanInitialTab(initialTab);
  };

  const handleResetData = async () => {
    if (
      window.confirm(
        'Tem certeza que deseja restaurar os dados de demonstração no banco de dados compartilhado?'
      )
    ) {
      await resetDatabaseToDemoData();
      triggerToast('Dados restaurados para o padrão de demonstração.');
    }
  };

  // Initial loading indicator
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <h2 className="text-sm font-bold font-mono uppercase text-slate-300">
            Conectando ao Banco ARGMGP (Firebase Firestore)...
          </h2>
          <p className="text-xs text-slate-500">
            Carregando dados de remessas e estoque de padrões em tempo real.
          </p>
        </div>
      </div>
    );
  }

  // Render Mandatory Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-amber-500 flex items-center justify-center text-slate-950 shadow-md font-black">
              <span className="text-xl">📦</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white font-mono uppercase">
                ARGMGP - GESTÃO DE REMESSAS & QA/QC
              </h1>
              <p className="text-xs text-amber-400 font-medium">
                Controle de Remessas, Estoque OREAS e Planos de Empacotamento
              </p>
            </div>
          </div>

          {/* Theme Toggle Button on Login Screen */}
          <button
            onClick={handleToggleTheme}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title={theme === 'dark' ? 'Alternar para Tema Branco Gelo (Claro)' : 'Alternar para Tema Escuro Titânio'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Branco Gelo</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Escuro Titânio</span>
              </>
            )}
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <AuthModal
            isOpen={true}
            isMandatory={true}
            onClose={() => {}}
            users={users}
            onLoginSuccess={handleLoginSuccess}
            onUpdateUser={handleUpdateUser}
          />
        </div>

        <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900">
          ARGMGP • Sistema Dedicado de Gestão de Remessas e Padrões de QA/QC
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-2.5 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        activeUser={activeUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenUserModal={() => {
          setEditingUserIdForModal(null);
          setIsUserModalOpen(true);
        }}
        onEditProfile={() => {
          setEditingUserIdForModal(activeUser.id);
          setIsUserModalOpen(true);
        }}
        onOpenNewHoleModal={() => setIsNewHoleModalOpen(true)}
        onOpenLocalDataModal={() => setIsLocalDataModalOpen(true)}
        onOpenMobilePhotoModal={() => {
          setMobilePhotoHoleId(holes[0]?.id);
          setMobilePhotoArId(ars[0]?.id);
          setIsMobilePhotoModalOpen(true);
        }}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        isFolderLinked={folderSyncState.isLinked}
        folderName={folderSyncState.folderName}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetDemoData={handleResetData}
        holesCount={holes.length}
        arsCount={ars.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Body View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            holes={holes}
            ars={ars}
            activeUser={activeUser}
            oreasStockEntries={oreasStockEntries}
            logs={logs}
            onOpenHoleDetail={(h) => setDetailHoleId(h.id)}
            onOpenNewHoleModal={() => setIsNewHoleModalOpen(true)}
            onDeleteHoleRequest={(h) => setHoleToDelete(h)}
            onOpenPackingPlan={(ar) => setPackingPlanAR(ar)}
            onOpenCreateARModal={(holeId) => handleOpenCreateARModal(holeId)}
            onEditAR={handleOpenEditARModal}
            onUpdateHoleInfo={handleUpdateHoleInfo}
          />
        )}

        {activeTab === 'shipments' && (
          <ShipmentsView
            ars={ars}
            holes={holes}
            oreasStockEntries={oreasStockEntries}
            photos={qaqcPhotos}
            onOpenCreateARModal={() => handleOpenCreateARModal()}
            onOpenOreasStockModal={() => setIsOreasStockModalOpen(true)}
            onOpenPdfReportModal={handleOpenPdfReportModal}
            onEditAR={handleOpenEditARModal}
            onUpdateARWeight={handleUpdateARWeight}
            onDeleteAR={handleDeleteAR}
            onOpenHoleDetailByCode={handleOpenHoleDetailByCode}
            onOpenPackingPlan={handleOpenPackingPlan}
          />
        )}

        {activeTab === 'team' && (
          <UserPanel
            users={users}
            logs={logs}
            holes={holes}
            ars={ars}
            photos={qaqcPhotos}
            oreasStockEntries={oreasStockEntries}
            activeUser={activeUser}
            onSelectActiveUser={handleSelectActiveUser}
            onDeleteUserRequest={(u) => setUserToDelete(u)}
            onOpenUserModal={() => {
              setEditingUserIdForModal(null);
              setIsUserModalOpen(true);
            }}
            onEditUser={(u) => {
              setEditingUserIdForModal(u.id);
              setIsUserModalOpen(true);
            }}
            onOpenLocalDataModal={() => setIsLocalDataModalOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      {isCreateARModalOpen && (
        <CreateARModal
          key={arToEdit ? `edit-ar-${arToEdit.id}` : `new-ar-${arInitialHoleId || 'default'}`}
          isOpen={isCreateARModalOpen}
          onClose={() => {
            setIsCreateARModalOpen(false);
            setArToEdit(null);
          }}
          onSave={handleSaveAR}
          holes={holes}
          ars={ars}
          oreasStockEntries={oreasStockEntries}
          activeUser={activeUser}
          initialHoleId={arInitialHoleId}
          arToEdit={arToEdit}
        />
      )}

      <OreasStockModal
        isOpen={isOreasStockModalOpen}
        onClose={() => setIsOreasStockModalOpen(false)}
        oreasStockEntries={oreasStockEntries}
        ars={ars}
        activeUser={activeUser}
        onSaveEntry={handleSaveOreasStockEntry}
        onDeleteEntry={handleDeleteOreasStockEntry}
        onDeleteCode={handleDeleteOreasCode}
      />

      {isNewHoleModalOpen && (
        <NewHoleModal
          key="new-hole-fresh-modal"
          isOpen={isNewHoleModalOpen}
          onClose={() => setIsNewHoleModalOpen(false)}
          onSave={handleCreateHole}
          activeUser={activeUser}
          oreasStockEntries={oreasStockEntries}
          ars={ars}
        />
      )}

      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUserIdForModal(null);
        }}
        users={users}
        activeUser={activeUser}
        initialEditingUserId={editingUserIdForModal}
        onSelectActiveUser={handleSelectActiveUser}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUserRequest={(u) => setUserToDelete(u)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        users={users}
        onLoginSuccess={handleLoginSuccess}
        onUpdateUser={handleUpdateUser}
      />

      <HoleDetailModal
        isOpen={!!detailHole}
        onClose={() => setDetailHoleId(null)}
        hole={detailHole}
        ars={ars}
        activeUser={activeUser}
        onUpdateStorageLocation={handleUpdateStorageLocation}
        onSaveSamplePlan={handleSaveSamplePlan}
        onOpenCreateARModal={(hId) => handleOpenCreateARModal(hId)}
        onDeleteHoleRequest={(h) => {
          setDetailHoleId(null);
          setHoleToDelete(h);
        }}
        onOpenPackingPlan={handleOpenPackingPlan}
        onEditAR={handleOpenEditARModal}
        onUpdateHoleInfo={handleUpdateHoleInfo}
      />

      <PackingPlanModal
        isOpen={!!packingPlanAR}
        onClose={() => setPackingPlanAR(null)}
        ar={packingPlanAR}
        hole={holes.find((h) => h.id === packingPlanAR?.drillHoleId)}
        photos={qaqcPhotos}
        activeUser={activeUser}
        initialTab={packingPlanInitialTab}
        onUpdateARVolumes={handleUpdateARPackingPlan}
        onUploadPhoto={handleUploadPhoto}
        onDeletePhoto={handleDeletePhoto}
        onCleanupExpiredPhotos={handleCleanupExpiredPhotos}
        onOpenPdfReportModal={handleOpenPdfReportModal}
        onOpenMobilePhotoModal={() => {
          if (packingPlanAR) {
            setMobilePhotoHoleId(packingPlanAR.drillHoleId);
            setMobilePhotoArId(packingPlanAR.id);
          }
          setIsMobilePhotoModalOpen(true);
        }}
      />

      <QAQCPdfReportModal
        isOpen={isPdfReportModalOpen}
        onClose={() => setIsPdfReportModalOpen(false)}
        ars={ars}
        holes={holes}
        photos={qaqcPhotos}
        defaultDate={pdfReportDefaultDate}
      />

      <MobilePhotoSyncModal
        isOpen={isMobilePhotoModalOpen}
        onClose={() => setIsMobilePhotoModalOpen(false)}
        holes={holes}
        ars={ars}
        photos={qaqcPhotos}
        activeUser={activeUser}
        folderState={folderSyncState}
        onUploadPhoto={handleUploadPhoto}
        onTriggerToast={triggerToast}
        initialHoleId={mobilePhotoHoleId}
        initialArId={mobilePhotoArId}
      />

      <LocalDataModal
        isOpen={isLocalDataModalOpen}
        onClose={() => setIsLocalDataModalOpen(false)}
        holes={holes}
        ars={ars}
        photos={qaqcPhotos}
        oreasStockEntries={oreasStockEntries}
        logs={logs}
        users={users}
        onTriggerToast={triggerToast}
      />

      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={theme}
        onSelectTheme={handleSelectTheme}
      />

      <DeleteHoleModal
        isOpen={!!holeToDelete}
        onClose={() => setHoleToDelete(null)}
        hole={holeToDelete}
        logs={logs}
        onConfirmDelete={handleDeleteHole}
      />

      <DeleteUserModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        user={userToDelete}
        onConfirmDelete={handleDeleteUser}
      />
    </div>
  );
}

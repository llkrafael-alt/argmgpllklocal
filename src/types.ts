export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 101 | 102;

export interface StageInfo {
  id: StageId;
  order: number;
  name: string;
  shortName: string;
  description: string;
  isSpecialKore?: boolean;
}

export interface User {
  id: string;
  name: string;
  role: string; // e.g., "Geólogo", "Auxiliar de Geologia", etc.
  isMaster?: boolean; // Nível de Permissão Administrador Master
  email?: string;
  login?: string;
  password?: string;
  badgeColor?: string;
  avatarUrl?: string;
  isGoogleAuth?: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
}

export function isMasterUser(user?: User | null): boolean {
  if (!user) return false;
  if (user.isMaster === true) return true;
  if (user.id === 'usr_master_rafael') return true;
  const login = (user.login || '').toLowerCase().trim();
  const email = (user.email || '').toLowerCase().trim();
  const role = (user.role || '').toLowerCase().trim();
  return (
    login === 'llk.rafael' ||
    login.startsWith('llk') ||
    email === 'llk.rafael@gmail.com' ||
    email === 'llk2.rafael@gmail.com' ||
    email.startsWith('llk') ||
    role.includes('master') ||
    role.includes('administrador') ||
    role.includes('coordenador')
  );
}

export interface SampleRange {
  firstSampleCode: string;
  lastSampleCode: string;
}

export interface DrillHole {
  id: string;
  code: string; // e.g., "GUD-26-051"
  holeType?: 'Diamantado' | 'RC' | 'Solo' | 'Trincheira'; // Drilling method: Diamantado (Diamond), RC, Solo (Soil) or Trincheira (Trench)
  startMeter: number; // e.g., 0
  endMeter: number; // e.g., 200
  totalMeters: number; // endMeter - startMeter
  target: string; // e.g., "Alvo Target Sul", "Vale Verde"
  totalCases: number; // Number of boxes (cases)
  isLegacyKorePending: boolean; // Flag for special Stage 13
  createdByUserId: string;
  createdByName?: string;
  createdAt: string; // ISO string
  storageLocation?: string; // e.g. "Galpão A - Prateleira 12B"
  completedAt?: string | null;

  // Stage 8: Sample Plan (Plano de Amostragem)
  firstSampleCode?: string; // e.g., "D01036"
  lastSampleCode?: string;  // e.g., "D01236"
  sampleRanges?: SampleRange[]; // Múltiplas faixas de amostragem
  calculatedSampleCount?: number; // e.g., 201
}

export interface QaQcSample {
  id: string;
  type: string;  // e.g., "OREAS", "BLK", "Gesso", "DUP", "Outro"
  code: string;  // Código de amostragem no envio (e.g., "TST00010", "R11530")
  oreasProduct?: string; // Nome/Produto do OREAS (e.g., "250c", "626", "251c")
  notes?: string; // Observação / Lote
  quantity?: number; // Qtd utilizada neste envio/AR (default 1)
}

export interface OreasStockEntry {
  id: string;
  code: string;        // e.g. "R11530"
  quantity: number;    // Qtd recebida (ex: 20)
  date: string;        // YYYY-MM-DD (Data de entrada)
  lotOrNotes?: string; // e.g. "250c", "Lote 2026-A"
  createdById?: string;
  createdByName?: string;
  createdAt: string;   // ISO string
}

export interface SampleShipmentAR {
  id: string;
  arCode: string;          // e.g. "ARGMGP-300"
  drillHoleId: string;     // e.g. "hole_1"
  drillHoleCode: string;   // e.g. "GUD-26-051"
  startSampleCode: string; // e.g. "D01036"
  endSampleCode: string;   // e.g. "D01135"
  sampleRanges?: SampleRange[]; // Múltiplas faixas do envio/AR
  sampleCount: number;     // e.g. 100 (Max 200)
  volumeCount: number;     // e.g. 5
  standardSize?: number;   // Tamanho padrão de amostras por volume (default 10)
  weightKg: number;        // e.g. 220.5
  shipmentDate: string;    // YYYY-MM-DD
  createdById: string;
  createdByName?: string;
  createdAt: string;       // ISO string
  notes?: string;
  qaqcSamples?: QaQcSample[];
}

export interface QAQCSamplePhoto {
  id: string;
  arId: string;
  arCode: string;
  drillHoleCode?: string;
  shipmentDate?: string;    // YYYY-MM-DD
  sampleCode?: string;      // e.g. "OREAS 250c", "BLK R11520" or "Geral"
  sampleType?: string;      // "OREAS", "BLK", "DUP", "Geral"
  photoUrl: string;         // Cloud URL, Blob URL or Data URL
  dataUrl?: string;         // Base64 Data URL for offline/PDF rendering (lossless original)
  originalBlob?: Blob;      // Raw original file Blob (exact bit-a-bit copy, ~15MB)
  thumbnailUrl?: string;    // Lightweight thumbnail used strictly for UI rendering performance
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  capturedAt: string;       // ISO string timestamp
  capturedByUserId?: string;
  capturedByName?: string;
}

export interface ProductionLog {
  id: string;
  drillHoleId: string;
  stageId?: StageId;
  startMeter?: number; // From meter
  endMeter?: number;   // To meter
  userId: string;
  userName?: string;
  userRole?: string;
  actionType?: 'STAGE_LOG' | 'HOLE_CREATED' | 'HOLE_UPDATED' | 'AR_CREATED' | 'AR_UPDATED' | 'AR_DELETED' | 'PHOTO_UPLOADED' | 'SAMPLE_PLAN_UPDATED' | 'OREAS_STOCK';
  actionTitle?: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string; // ISO string
}

export interface Interval {
  start: number;
  end: number;
  userId: string;
  userName: string;
  date: string;
  logId: string;
}

export interface OverlapInfo {
  hasOverlap: boolean;
  overlappedRange?: { start: number; end: number };
  overlappingLogs?: {
    userName: string;
    range: string;
    date: string;
  }[];
}

export interface StageProgress {
  stageId: StageId;
  coveredMeters: number;
  totalMeters: number;
  percentage: number;
  isComplete: boolean;
  mergedIntervals: { start: number; end: number }[];
  logsCount: number;
}

export interface HoleProgressSummary {
  holeId: string;
  totalStages: number;
  completedStages: number;
  overallPercentage: number;
  isFullyCompleted: boolean;
  stageProgressMap: Record<StageId, StageProgress>;
}

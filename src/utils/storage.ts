import { User, DrillHole, ProductionLog, SampleShipmentAR } from '../types';
import {
  INITIAL_USERS,
  INITIAL_HOLES,
  INITIAL_LOGS,
  INITIAL_ARS,
  saveUserToDb,
  saveHoleToDb,
  saveLogToDb,
  saveARToDb,
  getLocalCachedUsers,
  setLocalCachedUsers,
  updateUserInLocalCache,
  deleteUserFromLocalCache,
} from '../services/firebase';

const ACTIVE_USER_KEY = 'galpao_testemunhos_active_user_v1';

export function loadActiveUserId(): string {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    if (raw) return raw;
    return '';
  } catch {
    return '';
  }
}

export function saveActiveUserId(userId: string) {
  localStorage.setItem(ACTIVE_USER_KEY, userId);
}

export {
  INITIAL_USERS,
  INITIAL_HOLES,
  INITIAL_LOGS,
  INITIAL_ARS,
  getLocalCachedUsers,
  setLocalCachedUsers,
  updateUserInLocalCache,
  deleteUserFromLocalCache,
};

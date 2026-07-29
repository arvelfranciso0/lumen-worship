import { createElectronRepository, hasElectronApi } from "./electron";
import { createIndexedDbRepository } from "./indexeddb";
import type { AppRepository } from "./types";

let instance: AppRepository | null = null;

export function getRepository(): AppRepository {
  if (!instance) {
    instance = hasElectronApi() ? createElectronRepository() : createIndexedDbRepository();
  }
  return instance;
}

export type { AppRepository, PersistedData, PersistedPrefs } from "./types";

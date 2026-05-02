import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater'
import { openUrl } from '@tauri-apps/plugin-opener'

export const RELEASES_LATEST_URL = 'https://github.com/Heylucasabatino/taxa-desk/releases/latest'
export const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL
  ?? 'https://github.com/Heylucasabatino/taxa-desk/issues/new?template=beta_feedback.yml'

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'none'
  | 'available'
  | 'backup'
  | 'downloading'
  | 'installing'
  | 'installed'
  | 'unsupported'
  | 'error'

export type UpdateState = {
  phase: UpdatePhase
  currentVersion: string
  channel?: 'portable' | 'installer'
  availableVersion?: string
  changelog?: string
  backupPath?: string
  progress?: number
  error?: string
}

export type PortableUpdateInfo = {
  version: string
  notes?: string
  pubDate?: string
  url: string
  sha256: string
  size?: number
}

export const initialUpdateState: UpdateState = {
  phase: 'idle',
  currentVersion: '0.1.2',
}

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function readInstalledVersion() {
  if (!isTauriRuntime()) return initialUpdateState.currentVersion

  return getVersion()
}

export async function checkForAppUpdate() {
  if (!isTauriRuntime()) {
    return null
  }

  return check({ timeout: 30_000 })
}

export async function checkForPortableUpdate(currentVersion: string) {
  if (!isTauriRuntime()) {
    return null
  }

  return invoke<PortableUpdateInfo | null>('check_portable_update', { currentVersion })
}

export async function installPortableUpdate(update: PortableUpdateInfo) {
  if (!isTauriRuntime()) {
    throw new Error('Aggiornamento portable disponibile solo nell’app desktop.')
  }

  await invoke('install_portable_update', { update })
}

export async function openLatestReleasePage() {
  await openExternalUrl(RELEASES_LATEST_URL)
}

export async function openFeedbackPage() {
  await openExternalUrl(FEEDBACK_URL)
}

async function openExternalUrl(url: string) {
  if (isTauriRuntime()) {
    await openUrl(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

export function toUpdateState(update: Update, currentVersion: string): UpdateState {
  return {
    phase: 'available',
    channel: 'installer',
    currentVersion,
    availableVersion: update.version,
    changelog: update.body,
  }
}

export function toPortableUpdateState(update: PortableUpdateInfo, currentVersion: string): UpdateState {
  return {
    phase: 'available',
    channel: 'portable',
    currentVersion,
    availableVersion: update.version,
    changelog: update.notes,
  }
}

export function formatUpdaterError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (/network|fetch|dns|timed out|timeout|connection|offline/i.test(message)) {
    return 'Errore di rete: verifica la connessione e riprova.'
  }

  return message || 'Controllo aggiornamenti non riuscito.'
}

export function getDownloadProgress(event: DownloadEvent, downloadedBytes: number) {
  if (event.event === 'Progress') {
    return downloadedBytes + event.data.chunkLength
  }

  return downloadedBytes
}

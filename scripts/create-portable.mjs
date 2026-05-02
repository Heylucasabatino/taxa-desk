import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const tauriDir = join(root, 'src-tauri')
const tauriConfig = JSON.parse(readFileSync(join(tauriDir, 'tauri.conf.json'), 'utf8'))
const version = tauriConfig.version
const repo = process.env.GITHUB_REPOSITORY ?? 'Heylucasabatino/taxa-desk'
const tag = process.env.RELEASE_TAG ?? `v${version}`
const targetDir = process.env.CARGO_TARGET_DIR
  ? resolve(process.env.CARGO_TARGET_DIR)
  : join(tauriDir, 'target')
const releaseDir = join(targetDir, 'release')
const outputDir = join(root, 'release-portable')
const appDir = join(outputDir, 'Taxa Desk')
const updateRoot = join(outputDir, 'update-package')
const updateAppDir = join(updateRoot, 'app')
const appBinary = join(releaseDir, 'fondi-e-tasse.exe')
const updaterBinary = join(releaseDir, 'taxa-desk-updater.exe')
const portableZipName = `Taxa.Desk_${version}_windows_x64_portable.zip`
const updateZipName = `Taxa.Desk_${version}_windows_x64_update.zip`
const portableZipPath = join(outputDir, portableZipName)
const updateZipPath = join(outputDir, updateZipName)
const manifestPath = join(outputDir, 'portable-manifest.json')

if (!existsSync(appBinary)) {
  throw new Error(`App binary not found: ${appBinary}. Run npm run tauri:build first.`)
}

if (!existsSync(updaterBinary)) {
  const result = spawnSync('cargo', ['build', '--manifest-path', join(tauriDir, 'Cargo.toml'), '--release', '--bin', 'taxa-desk-updater'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  })

  if (result.status !== 0 || !existsSync(updaterBinary)) {
    throw new Error(`Unable to build portable updater: ${updaterBinary}`)
  }
}

rmInsideWorkspace(outputDir)
mkdirSync(appDir, { recursive: true })
mkdirSync(join(appDir, 'data'), { recursive: true })
mkdirSync(join(appDir, 'backups'), { recursive: true })
mkdirSync(join(appDir, 'logs'), { recursive: true })
copyFileSync(appBinary, join(appDir, 'Taxa Desk.exe'))
copyFileSync(updaterBinary, join(appDir, 'Taxa Desk Updater.exe'))
writeFileSync(join(appDir, 'LEGGIMI.txt'), readmeText(version), 'utf8')

mkdirSync(updateAppDir, { recursive: true })
copyFileSync(appBinary, join(updateAppDir, 'Taxa Desk.exe'))
writeFileSync(join(updateAppDir, 'LEGGIMI.txt'), readmeText(version), 'utf8')

compressArchive(appDir, portableZipPath, { includeRoot: true })
compressArchive(updateRoot, updateZipPath, { includeRoot: false })

const updateHash = sha256(updateZipPath)
const updateAssetUrl = `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(updateZipName)}`
const manifest = {
  version,
  notes: process.env.RELEASE_NOTES ?? '',
  pubDate: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      url: updateAssetUrl,
      sha256: updateHash,
      size: statSync(updateZipPath).size,
    },
  },
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(portableZipPath)
console.log(updateZipPath)
console.log(manifestPath)

function readmeText(version) {
  return `Taxa Desk ${version}

Avvio
1. Apri "Taxa Desk.exe".
2. Non spostare o cancellare le cartelle data, backups e logs mentre l'app è aperta.

Dati locali
- data/fondi-e-tasse.sqlite contiene l'archivio locale.
- backups contiene i backup JSON.
- logs contiene il log tecnico locale.

Aggiornamenti
- Usa Dati & backup > Verifica aggiornamenti.
- Prima di aggiornare, Taxa Desk crea un backup JSON locale.
- L'aggiornamento non carica online dati fiscali, movimenti, backup o contenuti SQLite.

Avvertenza
Le stime fiscali sono orientative e non sostituiscono il commercialista o fonti ufficiali.
`
}

function compressArchive(sourcePath, destinationPath, options) {
  const resolvedSource = resolve(sourcePath)
  const escapedDestination = destinationPath.replaceAll("'", "''")
  const archivePath = options.includeRoot ? resolvedSource : join(resolvedSource, '*')
  const escapedArchivePath = archivePath.replaceAll("'", "''")
  const command = `Compress-Archive -Path '${escapedArchivePath}' -DestinationPath '${escapedDestination}' -Force`
  const result = spawnSync('powershell', ['-NoProfile', '-Command', command], {
    cwd: root,
    stdio: 'inherit',
  })

  if (result.status !== 0 || !existsSync(destinationPath)) {
    throw new Error(`Failed to create zip: ${destinationPath}`)
  }
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function rmInsideWorkspace(path) {
  const resolved = resolve(path)
  const workspace = resolve(root)

  if (resolved === workspace || !resolved.startsWith(`${workspace}\\`) && !resolved.startsWith(`${workspace}/`)) {
    throw new Error(`Refusing to remove outside workspace: ${resolved}`)
  }

  rmSync(resolved, { recursive: true, force: true })
}

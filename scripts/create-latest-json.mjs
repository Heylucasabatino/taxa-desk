import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repo = process.env.GITHUB_REPOSITORY ?? 'Heylucasabatino/taxa-desk'
const root = process.cwd()
const targetDir = process.env.CARGO_TARGET_DIR
  ? resolve(process.env.CARGO_TARGET_DIR)
  : join(root, 'src-tauri', 'target')
const bundleDir = process.env.TAURI_BUNDLE_DIR
  ? resolve(process.env.TAURI_BUNDLE_DIR)
  : join(targetDir, 'release', 'bundle', 'nsis')
const tauriConfig = JSON.parse(readFileSync(join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'))
const version = tauriConfig.version
const tag = process.env.RELEASE_TAG ?? `v${version}`

if (!existsSync(bundleDir)) {
  throw new Error(`Bundle directory not found: ${bundleDir}`)
}

const installers = readdirSync(bundleDir)
  .filter((name) => name.endsWith('.exe') && existsSync(join(bundleDir, `${name}.sig`)))
const installerName = installers.find((name) => name.includes(`_${version}_`)) ?? installers[0]

if (!installerName) {
  throw new Error(`No NSIS installer with .sig found in ${bundleDir}`)
}

const signature = readFileSync(join(bundleDir, `${installerName}.sig`), 'utf8').trim()
const githubAssetName = installerName.replaceAll(' ', '.')
const encodedInstallerName = githubAssetName
  .split('/')
  .map((segment) => encodeURIComponent(segment))
  .join('/')
const manifest = {
  version,
  notes: process.env.RELEASE_NOTES ?? '',
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature,
      url: `https://github.com/${repo}/releases/download/${tag}/${encodedInstallerName}`,
    },
  },
}

const outputPath = join(bundleDir, 'latest.json')
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(outputPath)

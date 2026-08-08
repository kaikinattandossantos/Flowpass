import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const packageDir = dirname(fileURLToPath(import.meta.url))
const monorepoRoot = resolve(packageDir, '../..')
const envPath = resolve(monorepoRoot, '.env')

if (!existsSync(envPath)) {
  console.warn(`[env] Arquivo .env não encontrado em ${envPath}`)
} else {
  const result = config({ path: envPath })
  if (result.error) {
    console.warn('[env] Falha ao carregar .env:', result.error.message)
  }
}

const prismaArgs = process.argv.slice(2)
const result = spawnSync('pnpm', ['exec', 'prisma', ...prismaArgs], {
  cwd: packageDir,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)

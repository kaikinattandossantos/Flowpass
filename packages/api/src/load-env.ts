import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const envPath = resolve(monorepoRoot, '.env')

if (!existsSync(envPath)) {
  console.warn(`[env] Arquivo .env não encontrado em ${envPath}`)
} else {
  const result = config({ path: envPath })
  if (result.error) {
    console.warn('[env] Falha ao carregar .env:', result.error.message)
  }
}

export { envPath, monorepoRoot }

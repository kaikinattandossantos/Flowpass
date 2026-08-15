import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const ALLOWED_MIME = new Map<string, string>([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/webp', 'webp']
])

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const MAX_BANNER_BYTES = 5 * 1024 * 1024

export type AssetKind = 'logo' | 'background' | 'banner'

export interface StoredAsset {
  url: string
  key: string
  contentType: string
}

function isS3Configured(): boolean {
  const accessKey = process.env.R2_ACCESS_KEY
  const secretKey = process.env.R2_SECRET_KEY
  const bucket = process.env.R2_BUCKET
  const endpoint = process.env.R2_ENDPOINT
  if (!accessKey || !secretKey || !bucket || !endpoint) return false
  if (accessKey.includes('placeholder') || secretKey.includes('placeholder')) return false
  if (endpoint.includes('placeholder')) return false
  return true
}

function getPublicBaseUrl(): string {
  return process.env.PUBLIC_ASSETS_BASE_URL
    || process.env.API_PUBLIC_URL
    || `http://localhost:${process.env.PORT || 3333}`
}

function getLocalUploadRoot(): string {
  const apiRoot = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(apiRoot, '../../uploads/form-assets')
}

function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!
    },
    forcePathStyle: true
  })
}

function validateUpload(kind: AssetKind, mimeType: string, size: number): { ok: true; ext: string } | { ok: false; message: string } {
  const ext = ALLOWED_MIME.get(mimeType.toLowerCase())
  if (!ext) {
    return { ok: false, message: 'Formato de imagem não suportado. Use PNG, JPG/JPEG ou WEBP.' }
  }

  const max = kind === 'logo' ? MAX_LOGO_BYTES : MAX_BANNER_BYTES
  if (size > max) {
    return {
      ok: false,
      message: kind === 'logo'
        ? 'Logo deve ter no máximo 2 MB'
        : kind === 'banner'
          ? 'Banner deve ter no máximo 5 MB'
          : 'Imagem de fundo deve ter no máximo 5 MB'
    }
  }

  return { ok: true, ext }
}

function buildObjectKey(companyId: string, formId: string, kind: AssetKind, ext: string): string {
  return `companies/${companyId}/forms/${formId}/${kind}/${randomUUID()}.${ext}`
}

export async function storeFormAsset(input: {
  companyId: string
  formId: string
  kind: AssetKind
  mimeType: string
  buffer: Buffer
}): Promise<{ ok: true; asset: StoredAsset } | { ok: false; message: string }> {
  const validation = validateUpload(input.kind, input.mimeType, input.buffer.byteLength)
  if (!validation.ok) return validation

  const key = buildObjectKey(input.companyId, input.formId, input.kind, validation.ext)

  if (isS3Configured()) {
    const client = getS3Client()
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: input.buffer,
      ContentType: input.mimeType,
      CacheControl: 'public, max-age=31536000, immutable'
    }))

    const publicBase = process.env.R2_PUBLIC_BASE_URL || getPublicBaseUrl()
    return {
      ok: true,
      asset: {
        key,
        url: `${publicBase.replace(/\/$/, '')}/${key}`,
        contentType: input.mimeType
      }
    }
  }

  const localRoot = getLocalUploadRoot()
  const filePath = path.join(localRoot, key)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, input.buffer)

  return {
    ok: true,
    asset: {
      key,
      url: `${getPublicBaseUrl().replace(/\/$/, '')}/assets/${key}`,
      contentType: input.mimeType
    }
  }
}

export async function readLocalAsset(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (key.includes('..') || key.startsWith('/')) return null
  const ext = path.extname(key).slice(1).toLowerCase()
  const mime = [...ALLOWED_MIME.entries()].find(([, value]) => value === ext)?.[0] ?? 'application/octet-stream'
  const filePath = path.join(getLocalUploadRoot(), key)
  try {
    const buffer = await readFile(filePath)
    return { buffer, contentType: mime }
  } catch {
    return null
  }
}

export async function deleteStoredAsset(key: string | null | undefined): Promise<void> {
  if (!key) return

  if (isS3Configured()) {
    const client = getS3Client()
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key
    })).catch(() => {})
    return
  }

  const filePath = path.join(getLocalUploadRoot(), key)
  await import('node:fs/promises').then(({ unlink }) => unlink(filePath)).catch(() => {})
}

export function extractAssetKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const assetsMarker = '/assets/'
  const idx = url.indexOf(assetsMarker)
  if (idx >= 0) return url.slice(idx + assetsMarker.length)

  try {
    const parsed = new URL(url)
    return parsed.pathname.replace(/^\//, '')
  } catch {
    return null
  }
}

export async function listFormAssets(input: {
  companyId: string
  formId: string
}): Promise<StoredAsset[]> {
  const prefix = `companies/${input.companyId}/forms/${input.formId}/`
  const publicBase = getPublicBaseUrl().replace(/\/$/, '')

  if (isS3Configured()) {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3')
    const client = getS3Client()
    const response = await client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      Prefix: prefix
    }))
    return (response.Contents ?? [])
      .filter((item) => item.Key)
      .map((item) => {
        const key = item.Key!
        const ext = path.extname(key).slice(1).toLowerCase()
        const mime = [...ALLOWED_MIME.entries()].find(([, value]) => value === ext)?.[0] ?? 'image/jpeg'
        const publicUrl = process.env.R2_PUBLIC_BASE_URL
          ? `${process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
          : `${publicBase}/${key}`
        return { key, url: publicUrl, contentType: mime }
      })
  }

  const localRoot = getLocalUploadRoot()
  const formRoot = path.join(localRoot, prefix)
  const assets: StoredAsset[] = []

  async function walk(currentDir: string, keyPrefix: string): Promise<void> {
    let entries
    try {
      entries = await readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      const key = `${keyPrefix}${entry.name}`
      if (entry.isDirectory()) {
        await walk(fullPath, `${key}/`)
        continue
      }
      const ext = path.extname(entry.name).slice(1).toLowerCase()
      const mime = [...ALLOWED_MIME.entries()].find(([, value]) => value === ext)?.[0] ?? 'image/jpeg'
      assets.push({
        key,
        url: `${publicBase}/assets/${key}`,
        contentType: mime
      })
    }
  }

  await walk(formRoot, prefix)
  return assets.sort((a, b) => a.key.localeCompare(b.key))
}

export { ALLOWED_MIME, MAX_LOGO_BYTES, MAX_BANNER_BYTES }

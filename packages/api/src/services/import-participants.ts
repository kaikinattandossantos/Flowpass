import { Category, FormField, prisma } from '../../../database'
import { validateFormData } from '../utils/validate-form-data'
import {
  resolveStructuralValues,
  validateCpfWhenEnabled,
  validateResolvedStructuralValues
} from '../utils/resolve-structural-values'
import {
  parseStructuralConfig,
  STRUCTURAL_FIELD_LABELS,
  type StructuralConfig,
  type StructuralFieldKey
} from '../utils/structural-config'
import { findDuplicateRegistration, normalizeImportCpf } from './registration-create'

export interface ImportMapping {
  name?: string
  email?: string
  phone?: string
  cpf?: string
  category?: string
  form_fields: Record<string, string>
}

export type ImportProblemType = 'error' | 'duplicate'

export interface ImportRowProblem {
  row: number
  participant: string
  reason: string
  type: ImportProblemType
}

export interface ImportPreviewResult {
  total: number
  ready: number
  errors: number
  duplicates: number
  problems: ImportRowProblem[]
  ready_row_indexes: number[]
}

export interface ImportFormContext {
  structuralConfig: StructuralConfig
  formFields: FormField[]
  categories: Category[]
}

export async function loadImportFormContext(
  eventId: string,
  registrationFormId: string
): Promise<ImportFormContext | null> {
  const form = await prisma.registrationForm.findFirst({
    where: { id: registrationFormId, event_id: eventId },
    include: {
      form_fields: { orderBy: { order: 'asc' } },
      event: { include: { categories: true } }
    }
  })

  if (!form) return null

  return {
    structuralConfig: parseStructuralConfig(form.structural_config),
    formFields: form.form_fields,
    categories: form.event.categories
  }
}

function rowValue(row: Record<string, string>, column?: string): string {
  if (!column) return ''
  return row[column]?.trim() ?? ''
}

export async function previewImportRows(
  eventId: string,
  mapping: ImportMapping,
  rows: Array<Record<string, string>>,
  formContext: ImportFormContext
): Promise<ImportPreviewResult> {
  const problems: ImportRowProblem[] = []
  const readyRowIndexes: number[] = []
  const seenEmails = new Set<string>()
  const seenCpfs = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2
    const result = await validateImportRow({
      eventId,
      mapping,
      row,
      rowNum,
      formContext,
      seenEmails,
      seenCpfs,
      checkDatabase: true
    })

    if (result.ok) {
      readyRowIndexes.push(i)
      if (result.emailKey) seenEmails.add(result.emailKey)
      if (result.cpfKey) seenCpfs.add(result.cpfKey)
    } else {
      problems.push({
        row: rowNum,
        participant: result.participant,
        reason: result.reason,
        type: result.type
      })
    }
  }

  return {
    total: rows.length,
    ready: readyRowIndexes.length,
    errors: problems.filter((p) => p.type === 'error').length,
    duplicates: problems.filter((p) => p.type === 'duplicate').length,
    problems,
    ready_row_indexes: readyRowIndexes
  }
}

export async function executeImportRows(
  eventId: string,
  mapping: ImportMapping,
  rows: Array<Record<string, string>>,
  formContext: ImportFormContext,
  createRow: (data: {
    name: string
    email: string | null
    phone?: string | null
    cpf?: string | null
    category_id: string | null
    form_data: Record<string, unknown>
  }) => Promise<void>
) {
  const report = {
    total: rows.length,
    imported: 0,
    skipped: 0,
    duplicates: 0,
    errors: [] as Array<{ row: number; reason: string; participant?: string }>
  }

  const seenEmails = new Set<string>()
  const seenCpfs = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    const result = await validateImportRow({
      eventId,
      mapping,
      row,
      rowNum,
      formContext,
      seenEmails,
      seenCpfs,
      checkDatabase: true
    })

    if (!result.ok) {
      report.skipped++
      if (result.type === 'duplicate') report.duplicates++
      report.errors.push({
        row: rowNum,
        reason: result.reason,
        participant: result.participant
      })
      continue
    }

    try {
      await createRow(result.data)
      report.imported++
      if (result.emailKey) seenEmails.add(result.emailKey)
      if (result.cpfKey) seenCpfs.add(result.cpfKey)
    } catch (err) {
      report.skipped++
      report.errors.push({
        row: rowNum,
        reason: err instanceof Error ? err.message : 'Erro ao importar linha',
        participant: result.participant
      })
    }
  }

  return report
}

async function validateImportRow(params: {
  eventId: string
  mapping: ImportMapping
  row: Record<string, string>
  rowNum: number
  formContext: ImportFormContext
  seenEmails: Set<string>
  seenCpfs: Set<string>
  checkDatabase: boolean
}):
  Promise<
    | {
        ok: true
        data: {
          name: string
          email: string | null
          phone: string | null
          cpf: string | null
          category_id: string | null
          form_data: Record<string, unknown>
        }
        participant: string
        emailKey: string | null
        cpfKey: string | null
      }
    | {
        ok: false
        participant: string
        reason: string
        type: ImportProblemType
      }
  > {
  const { eventId, mapping, row, rowNum, formContext, seenEmails, seenCpfs, checkDatabase } = params
  const { structuralConfig, formFields, categories } = formContext

  let categoryId: string | null = null
  if (structuralConfig.category.enabled && mapping.category) {
    const catName = rowValue(row, mapping.category)
    const cat = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase())
    categoryId = cat?.id ?? null
  }

  const cpfRaw = structuralConfig.cpf.enabled ? rowValue(row, mapping.cpf) : undefined
  const resolved = resolveStructuralValues(structuralConfig, {
    name: rowValue(row, mapping.name),
    email: structuralConfig.email.enabled ? rowValue(row, mapping.email) : undefined,
    phone: structuralConfig.phone.enabled ? rowValue(row, mapping.phone) : undefined,
    cpf: cpfRaw,
    category_id: categoryId
  })

  const participantLabel = resolved.name || resolved.email || resolved.cpf || `Linha ${rowNum}`

  const cpfValidation = validateCpfWhenEnabled(structuralConfig, cpfRaw, resolved.cpf)
  if (!cpfValidation.ok) {
    return { ok: false, participant: participantLabel, reason: cpfValidation.message, type: 'error' }
  }

  const structuralValidation = validateResolvedStructuralValues(structuralConfig, resolved)
  if (!structuralValidation.ok) {
    return { ok: false, participant: participantLabel, reason: structuralValidation.message, type: 'error' }
  }

  if (structuralConfig.category.enabled && mapping.category) {
    const catName = rowValue(row, mapping.category)
    const cat = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase())
    if (!catName || !cat) {
      return {
        ok: false,
        participant: participantLabel,
        reason: 'Categoria inválida ou ausente',
        type: 'error'
      }
    }
  }

  if (resolved.cpf && seenCpfs.has(resolved.cpf)) {
    return { ok: false, participant: participantLabel, reason: 'CPF duplicado na planilha', type: 'duplicate' }
  }

  if (resolved.email && seenEmails.has(resolved.email)) {
    return { ok: false, participant: participantLabel, reason: 'E-mail duplicado na planilha', type: 'duplicate' }
  }

  const form_data: Record<string, unknown> = {}
  for (const [fieldId, column] of Object.entries(mapping.form_fields)) {
    const value = rowValue(row, column)
    if (value) form_data[fieldId] = value
  }

  const validation = validateFormData(formFields, form_data)
  if (!validation.ok) {
    return { ok: false, participant: participantLabel, reason: validation.message, type: 'error' }
  }

  if (checkDatabase) {
    const duplicate = await findDuplicateRegistration(eventId, resolved.email, resolved.cpf)
    if (duplicate) {
      return {
        ok: false,
        participant: participantLabel,
        reason: resolved.cpf ? 'CPF já cadastrado neste evento' : 'E-mail já cadastrado neste evento',
        type: 'duplicate'
      }
    }
  }

  return {
    ok: true,
    participant: participantLabel,
    emailKey: resolved.email,
    cpfKey: resolved.cpf,
    data: {
      name: resolved.name,
      email: resolved.email,
      phone: resolved.phone,
      cpf: resolved.cpf,
      category_id: resolved.category_id,
      form_data: validation.data
    }
  }
}

export function structuralFieldLabel(key: StructuralFieldKey): string {
  return STRUCTURAL_FIELD_LABELS[key]
}

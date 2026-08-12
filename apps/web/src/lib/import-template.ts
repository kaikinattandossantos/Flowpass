import * as XLSX from 'xlsx'
import { FormField } from '@/lib/form-field-types'
import { buildTemplateColumnsFromLayout, FormLayoutEntry } from '@/lib/field-layout'
import { getStructuralFieldLabel, type StructuralConfig, type StructuralFieldKey } from '@/lib/structural-config'

export function buildTemplateColumns(
  structuralConfig: StructuralConfig,
  formFields: FormField[],
  fieldLayout: FormLayoutEntry[]
): string[] {
  return buildTemplateColumnsFromLayout(structuralConfig, formFields, fieldLayout)
}

export function slugifyFormName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'formulario'
}

function exampleValueForColumn(
  column: string,
  structuralConfig: StructuralConfig
): string {
  const structuralEntries = (Object.keys(structuralConfig) as StructuralFieldKey[])
    .map((key) => ({ key, label: getStructuralFieldLabel(key, structuralConfig) }))

  const match = structuralEntries.find((entry) => entry.label === column)
  if (match?.key === 'name') return 'Maria Silva'
  if (match?.key === 'email') return 'maria@email.com'
  if (match?.key === 'phone') return '81999999999'
  if (match?.key === 'cpf') return '529.982.247-25'
  if (match?.key === 'category') return 'Público Geral'
  return ''
}

export function downloadParticipantTemplate(
  formName: string,
  structuralConfig: StructuralConfig,
  formFields: FormField[],
  fieldLayout: FormLayoutEntry[]
) {
  const columns = buildTemplateColumns(structuralConfig, formFields, fieldLayout)
  const exampleRow: Record<string, string> = {}

  for (const col of columns) {
    exampleRow[col] = exampleValueForColumn(col, structuralConfig)
  }

  const sheet = XLSX.utils.json_to_sheet([exampleRow], { header: columns })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Participantes')

  const slug = slugifyFormName(formName)
  XLSX.writeFile(workbook, `modelo-participantes-${slug}.xlsx`)
}

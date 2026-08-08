import * as XLSX from 'xlsx'
import { FormField, sortFormFields } from '@/lib/form-field-types'
import { buildStructuralColumns, type StructuralConfig } from '@/lib/structural-config'

export function buildTemplateColumns(
  structuralConfig: StructuralConfig,
  formFields: FormField[]
): string[] {
  const structural = buildStructuralColumns(structuralConfig)
  const dynamic = sortFormFields(formFields)
    .filter((field) => !['email', 'phone', 'cpf'].includes(field.type))
    .map((field) => field.label)

  return [...structural, ...dynamic]
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

export function downloadParticipantTemplate(
  formName: string,
  structuralConfig: StructuralConfig,
  formFields: FormField[]
) {
  const columns = buildTemplateColumns(structuralConfig, formFields)
  const exampleRow: Record<string, string> = {}

  for (const col of columns) {
    if (col === 'Nome') exampleRow[col] = 'Maria Silva'
    else if (col === 'E-mail') exampleRow[col] = 'maria@email.com'
    else if (col === 'Telefone') exampleRow[col] = '81999999999'
    else if (col === 'CPF') exampleRow[col] = '529.982.247-25'
    else if (col === 'Categoria') exampleRow[col] = 'Público Geral'
    else exampleRow[col] = ''
  }

  const sheet = XLSX.utils.json_to_sheet([exampleRow], { header: columns })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Participantes')

  const slug = slugifyFormName(formName)
  XLSX.writeFile(workbook, `modelo-participantes-${slug}.xlsx`)
}

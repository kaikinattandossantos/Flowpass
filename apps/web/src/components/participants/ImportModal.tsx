'use client'

import { useCallback, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import { FormField } from '@/lib/form-field-types'
import { parseStructuralConfig, type StructuralConfig } from '@/lib/structural-config'
import { type RegistrationFormSummary } from '@/lib/registration-form-types'
import { downloadParticipantTemplate } from '@/lib/import-template'
import {
  buildMappingOptions,
  isMappingValid,
  mappingTargetsToApiPayload,
  suggestColumnMappings,
  type MappingTarget
} from '@/lib/import-mapping'

type Step = 'form' | 'file' | 'map' | 'review' | 'result'

interface ImportPreview {
  total: number
  ready: number
  errors: number
  duplicates: number
  problems: Array<{ row: number; participant: string; reason: string; type: 'error' | 'duplicate' }>
}

interface ImportReport {
  total: number
  imported: number
  skipped: number
  duplicates: number
  errors: Array<{ row: number; reason: string; participant?: string }>
}

interface ImportModalProps {
  open: boolean
  eventId: string
  registrationForms: RegistrationFormSummary[]
  onClose: () => void
  onComplete: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { key: 'file', label: 'Arquivo', num: 1 },
    { key: 'map', label: 'Mapear campos', num: 2 },
    { key: 'review', label: 'Revisar', num: 3 }
  ] as const

  const currentIndex = current === 'result' || current === 'form'
    ? -1
    : steps.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 text-xs sm:text-sm">
      {steps.map((step, index) => {
        const done = currentIndex > index || current === 'result'
        const active = step.key === current || (current === 'result' && index === 2)
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full font-semibold shrink-0 ${
                done
                  ? 'bg-[#00C896] text-white'
                  : active
                    ? 'bg-[#0B1F3A] text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.num}
            </div>
            <span className={`hidden sm:inline ${active || done ? 'text-[#0B1F3A] font-medium' : 'text-gray-500'}`}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-6 sm:w-12 h-0.5 ${done ? 'bg-[#00C896]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ImportModal({
  open,
  eventId,
  registrationForms,
  onClose,
  onComplete
}: ImportModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [selectedForm, setSelectedForm] = useState<RegistrationFormSummary | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [structuralConfig, setStructuralConfig] = useState<StructuralConfig | null>(null)
  const [loadingFormFields, setLoadingFormFields] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [columnMappings, setColumnMappings] = useState<Record<string, MappingTarget>>({})
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [parsing, setParsing] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mappingOptions = structuralConfig
    ? buildMappingOptions(structuralConfig, formFields)
    : []

  const reset = useCallback(() => {
    setStep('form')
    setSelectedForm(null)
    setFormFields([])
    setStructuralConfig(null)
    setHeaders([])
    setRows([])
    setColumnMappings({})
    setFileName('')
    setFileSize(0)
    setPreview(null)
    setReport(null)
    setParsing(false)
    setPreviewing(false)
    setImporting(false)
    setDragOver(false)
  }, [])

  const handleClose = () => {
    if (importing) return
    reset()
    onClose()
  }

  const selectForm = async (form: RegistrationFormSummary) => {
    setSelectedForm(form)
    setStructuralConfig(parseStructuralConfig(form.structural_config))
    setLoadingFormFields(true)
    try {
      const res = await axios.get(
        `${API_URL}/events/${eventId}/registration-forms/${form.id}/form-fields`,
        { headers: authHeaders() }
      )
      setFormFields(res.data)
    } catch {
      toast.error('Erro ao carregar campos do formulário')
    } finally {
      setLoadingFormFields(false)
    }
  }

  const parseFile = async (file: File) => {
    if (!selectedForm || !structuralConfig) return
    if (!file.name.match(/\.xlsx$/i)) {
      toast.error('Selecione um arquivo .xlsx')
      return
    }

    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const normalized = data.map((row) => {
        const out: Record<string, string> = {}
        for (const [key, value] of Object.entries(row)) {
          out[String(key)] = String(value ?? '').trim()
        }
        return out
      })
      const cols = normalized.length > 0 ? Object.keys(normalized[0]) : []
      if (cols.length === 0 || normalized.length === 0) {
        toast.error('Planilha vazia ou inválida')
        return
      }

      setFileName(file.name)
      setFileSize(file.size)
      setHeaders(cols)
      setRows(normalized)
      setColumnMappings(suggestColumnMappings(cols, structuralConfig, formFields))
      setPreview(null)
      setStep('map')
    } catch {
      toast.error('Não foi possível ler a planilha')
    } finally {
      setParsing(false)
    }
  }

  const handleFileInput = (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (file) void parseFile(file)
  }

  const getExample = (column: string): string => {
    for (const row of rows) {
      const value = row[column]?.trim()
      if (value) return value.length > 40 ? `${value.slice(0, 40)}…` : value
    }
    return '—'
  }

  const loadPreview = async () => {
    if (!selectedForm || !structuralConfig) return false
    if (!isMappingValid(columnMappings, structuralConfig)) {
      toast.error('Mapeie os campos obrigatórios do formulário')
      return false
    }

    setPreviewing(true)
    try {
      const mapping = mappingTargetsToApiPayload(columnMappings)
      const res = await axios.post(
        `${API_URL}/events/${eventId}/participants/import/preview`,
        { registration_form_id: selectedForm.id, mapping, rows },
        { headers: authHeaders() }
      )
      setPreview(res.data)
      setStep('review')
      return true
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao validar planilha'
        : 'Erro ao validar planilha'
      toast.error(message)
      return false
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    if (!preview || preview.ready === 0 || importing || !selectedForm) return

    setImporting(true)
    try {
      const mapping = mappingTargetsToApiPayload(columnMappings)
      const res = await axios.post(
        `${API_URL}/events/${eventId}/participants/import`,
        { registration_form_id: selectedForm.id, mapping, rows },
        { headers: authHeaders() }
      )
      setReport(res.data)
      setStep('result')
      onComplete()
      toast.success('Importação concluída')
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro na importação'
        : 'Erro na importação'
      toast.error(message)
    } finally {
      setImporting(false)
    }
  }

  const downloadErrorReport = () => {
    const errors = report?.errors ?? preview?.problems ?? []
    if (errors.length === 0) return

    const sheetData = errors.map((err) => ({
      Linha: 'row' in err ? err.row : 0,
      Participante: 'participant' in err ? err.participant : '',
      Problema: err.reason
    }))

    const sheet = XLSX.utils.json_to_sheet(sheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Erros')
    XLSX.writeFile(workbook, `relatorio-erros-importacao-${eventId.slice(0, 8)}.xlsx`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[#0B1F3A]">Importar participantes</h3>
              {step === 'form' && (
                <p className="text-sm text-gray-600 mt-1">
                  Selecione o formulário que define os campos desta importação.
                </p>
              )}
              {step === 'file' && (
                <p className="text-sm text-gray-600 mt-1">
                  Importe uma planilha com os participantes deste evento. Você pode usar nosso modelo ou enviar sua
                  própria planilha.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          {step !== 'result' && step !== 'form' && <StepIndicator current={step} />}
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {step === 'form' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[#0B1F3A]">
                Qual formulário deseja utilizar?
              </label>
              <select
                value={selectedForm?.id ?? ''}
                onChange={(e) => {
                  const form = registrationForms.find((f) => f.id === e.target.value)
                  if (form) void selectForm(form)
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Selecione um formulário</option>
                {registrationForms.map((form) => (
                  <option key={form.id} value={form.id}>{form.name}</option>
                ))}
              </select>
              {loadingFormFields && (
                <p className="text-sm text-gray-500">Carregando campos...</p>
              )}
              {selectedForm && structuralConfig && !loadingFormFields && (
                <p className="text-sm text-gray-600">
                  Formulário <strong>{selectedForm.name}</strong> selecionado.
                </p>
              )}
            </div>
          )}

          {step === 'file' && selectedForm && structuralConfig && (
            <div className="space-y-6">
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0B1F3A] mb-1">
                  Modelo FlowPass
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  Baixe um modelo já preparado com os campos deste formulário.
                </p>
                <button
                  type="button"
                  onClick={() => downloadParticipantTemplate(selectedForm.name, structuralConfig, formFields)}
                  className="px-4 py-2 border border-[#00C896] text-[#00C896] rounded-lg text-sm font-medium hover:bg-[#00C896]/5"
                >
                  Baixar modelo de planilha
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0B1F3A] mb-2">
                  Minha planilha
                </p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    handleFileInput(e.dataTransfer.files)
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-[#00C896] bg-[#00C896]/5'
                      : 'border-gray-300 hover:border-[#00C896] hover:bg-gray-50'
                  }`}
                >
                  {parsing ? (
                    <p className="text-sm text-gray-600">Lendo planilha...</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-[#0B1F3A]">
                        Arraste sua planilha aqui ou selecione um arquivo
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Formato aceito: .xlsx</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => handleFileInput(e.target.files)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p><span className="font-medium">Arquivo:</span> {fileName}</p>
                <p><span className="font-medium">Tamanho:</span> {formatFileSize(fileSize)}</p>
                <p><span className="font-medium">Linhas encontradas:</span> {rows.length}</p>
              </div>

              <p className="text-sm text-gray-600">
                Associe cada coluna da planilha ao campo correspondente no FlowPass.
              </p>

              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Coluna da planilha</th>
                      <th className="px-4 py-3 text-left font-medium w-56">Campo no FlowPass</th>
                      <th className="px-4 py-3 text-left font-medium">Exemplo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((header) => (
                      <tr key={header} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium text-[#0B1F3A]">{header}</td>
                        <td className="px-4 py-3">
                          <select
                            value={columnMappings[header] ?? 'ignore'}
                            onChange={(e) =>
                              setColumnMappings({
                                ...columnMappings,
                                [header]: e.target.value as MappingTarget
                              })
                            }
                            className="w-full min-w-[180px] px-3 py-2 border rounded-lg text-sm"
                          >
                            {(['Outros', 'Estrutural', 'Personalizado'] as const).map((group) => {
                              const opts = mappingOptions.filter((o) => o.group === group)
                              if (opts.length === 0) return null
                              return (
                                <optgroup key={group} label={group}>
                                  {opts.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </optgroup>
                              )
                            })}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{getExample(header)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'review' && preview && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#0B1F3A]">{preview.total} participantes encontrados</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{preview.ready}</p>
                  <p className="text-sm text-gray-600">Prontos para importar</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{preview.errors}</p>
                  <p className="text-sm text-gray-600">Com problemas</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{preview.duplicates}</p>
                  <p className="text-sm text-gray-600">Duplicados</p>
                </div>
              </div>

              {preview.problems.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Registros com problemas</p>
                  <div className="border rounded-lg overflow-x-auto max-h-56">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead className="bg-gray-50 border-b sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Linha</th>
                          <th className="px-3 py-2 text-left">Participante</th>
                          <th className="px-3 py-2 text-left">Problema</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.problems.map((problem, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-2">{problem.row}</td>
                            <td className="px-3 py-2">{problem.participant}</td>
                            <td className="px-3 py-2 text-gray-600">{problem.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={downloadErrorReport}
                    className="mt-2 text-sm text-[#00C896] hover:underline"
                  >
                    Baixar relatório de erros
                  </button>
                </div>
              )}

              <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
                Apenas os {preview.ready} participantes válidos serão importados. Registros com erro ou duplicados
                serão ignorados.
              </p>
            </div>
          )}

          {step === 'result' && report && (
            <div className="space-y-5 text-center">
              <div>
                <p className="text-xl font-bold text-[#0B1F3A]">Importação concluída</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-700">{report.imported}</p>
                  <p className="text-xs text-gray-600">Importados</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-gray-700">{report.skipped}</p>
                  <p className="text-xs text-gray-600">Ignorados</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-red-700">{report.duplicates}</p>
                  <p className="text-xs text-gray-600">Duplicados</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-amber-700">
                    {Math.max(0, report.skipped - report.duplicates)}
                  </p>
                  <p className="text-xs text-gray-600">Com erro</p>
                </div>
              </div>

              {report.errors.length > 0 && (
                <button
                  type="button"
                  onClick={downloadErrorReport}
                  className="text-sm text-[#00C896] hover:underline"
                >
                  Baixar relatório de erros
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          {step === 'form' && (
            <>
              <button type="button" onClick={handleClose} className="px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setStep('file')}
                disabled={!selectedForm || loadingFormFields}
                className="px-4 py-2 bg-[#00C896] text-white rounded-lg text-sm disabled:opacity-50"
              >
                Continuar
              </button>
            </>
          )}

          {step === 'file' && (
            <>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Voltar
              </button>
              <button type="button" onClick={handleClose} className="px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
            </>
          )}

          {step === 'map' && (
            <>
              <button
                type="button"
                onClick={() => setStep('file')}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void loadPreview()}
                disabled={previewing || !structuralConfig || !isMappingValid(columnMappings, structuralConfig)}
                className="px-4 py-2 bg-[#00C896] text-white rounded-lg text-sm disabled:opacity-50"
              >
                {previewing ? 'Validando...' : 'Continuar'}
              </button>
            </>
          )}

          {step === 'review' && preview && (
            <>
              <button
                type="button"
                onClick={() => setStep('map')}
                disabled={importing}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={importing || preview.ready === 0}
                className="px-4 py-2 bg-[#00C896] text-white rounded-lg text-sm disabled:opacity-50"
              >
                {importing ? 'Importando...' : `Importar ${preview.ready} participantes`}
              </button>
            </>
          )}

          {step === 'result' && (
            <>
              <button type="button" onClick={handleClose} className="px-4 py-2 border rounded-lg text-sm">
                Fechar
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-[#00C896] text-white rounded-lg text-sm"
              >
                Ver participantes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { Prisma, prisma } from '../../../database'

export class RegistrationLimitError extends Error {
  constructor(message = 'Inscrições encerradas. Este formulário atingiu o limite de inscrições.') {
    super(message)
    this.name = 'RegistrationLimitError'
  }
}

type RegistrationCountClient = Pick<Prisma.TransactionClient, 'registration'>

/** Conta inscrições atuais válidas vinculadas ao formulário (exclui canceladas/excluídas). */
export async function countActiveRegistrationsForForm(
  tx: RegistrationCountClient,
  registrationFormId: string
): Promise<number> {
  return tx.registration.count({
    where: {
      registration_form_id: registrationFormId,
      status: { not: 'cancelled' }
    }
  })
}

export async function getFormCapacityStats(
  tx: RegistrationCountClient,
  registrationFormId: string,
  registrationLimit: number | null
) {
  const active_registration_count = await countActiveRegistrationsForForm(tx, registrationFormId)
  const available_slots = registrationLimit !== null
    ? Math.max(0, registrationLimit - active_registration_count)
    : null

  return {
    active_registration_count,
    registration_limit: registrationLimit,
    available_slots,
    is_full: registrationLimit !== null && active_registration_count >= registrationLimit
  }
}

export async function assertRegistrationFormCapacity(
  tx: Prisma.TransactionClient,
  registrationFormId: string
): Promise<void> {
  await tx.$queryRaw`
    SELECT id FROM registration_forms
    WHERE id = ${registrationFormId}
    FOR UPDATE
  `

  const form = await tx.registrationForm.findUnique({
    where: { id: registrationFormId },
    select: { registration_limit: true }
  })

  if (!form?.registration_limit) return

  const count = await countActiveRegistrationsForForm(tx, registrationFormId)
  if (count >= form.registration_limit) {
    throw new RegistrationLimitError()
  }
}

export async function getRegistrationFormAvailability(
  form: {
    status: 'draft' | 'active' | 'inactive'
    registration_limit: number | null
    event: { status: string; company: { status: string } }
  },
  registrationFormId: string,
  activeCount?: number
): Promise<{
  can_submit: boolean
  block_reason?: 'draft' | 'inactive' | 'limit_reached' | 'event_inactive' | 'company_inactive'
  message?: string
}> {
  if (form.event.company.status !== 'active') {
    return {
      can_submit: false,
      block_reason: 'company_inactive',
      message: 'Empresa inativa'
    }
  }

  if (form.event.status !== 'active') {
    return {
      can_submit: false,
      block_reason: 'event_inactive',
      message: 'Evento não está aceitando inscrições'
    }
  }

  if (form.status === 'draft') {
    return {
      can_submit: false,
      block_reason: 'draft',
      message: 'Este formulário ainda não está disponível.'
    }
  }

  if (form.status === 'inactive') {
    return {
      can_submit: false,
      block_reason: 'inactive',
      message: 'Inscrições encerradas.'
    }
  }

  if (form.registration_limit !== null) {
    const count = activeCount ?? await countActiveRegistrationsForForm(prisma, registrationFormId)
    if (count >= form.registration_limit) {
      return {
        can_submit: false,
        block_reason: 'limit_reached',
        message: 'Inscrições encerradas. Este formulário atingiu o limite de inscrições.'
      }
    }
  }

  return { can_submit: true }
}

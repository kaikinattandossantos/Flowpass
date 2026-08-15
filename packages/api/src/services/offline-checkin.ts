import { Prisma, prisma } from '../../../database'

const MAX_SERIALIZABLE_RETRIES = 3

export interface OfflineCheckinInput {
  uuid: string
  qr_token: string
  checked_at: string
  device_id?: string
}

export type OfflineCheckinResult = {
  uuid: string
  status: 'accepted' | 'duplicate' | 'already_synced' | 'invalid_qr' | 'expired_qr' | 'inactive_registration'
  registration_id?: string
  accepted_checkin_uuid?: string
}

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
}

export function shouldIncomingReplaceAccepted(input: {
  incomingCheckedAt: Date
  incomingUuid: string
  acceptedCheckedAt: Date
  acceptedUuid: string
}) {
  return input.incomingCheckedAt < input.acceptedCheckedAt || (
    input.incomingCheckedAt.getTime() === input.acceptedCheckedAt.getTime() &&
    input.incomingUuid < input.acceptedUuid
  )
}

export async function reconcileOfflineCheckin(input: {
  eventId: string
  operatorId: string | null
  checkin: OfflineCheckinInput
}): Promise<OfflineCheckinResult> {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const alreadySynced = await tx.checkIn.findUnique({
          where: { uuid: input.checkin.uuid },
          select: { registration_id: true, is_duplicate: true }
        })

        if (alreadySynced) {
          return {
            uuid: input.checkin.uuid,
            status: 'already_synced' as const,
            registration_id: alreadySynced.registration_id
          }
        }

        const registration = await tx.registration.findFirst({
          where: { qr_token: input.checkin.qr_token, event_id: input.eventId },
          select: {
            id: true,
            status: true,
            qr_token_expires_at: true
          }
        })

        if (!registration) {
          return { uuid: input.checkin.uuid, status: 'invalid_qr' as const }
        }

        if (registration.status !== 'confirmed') {
          return {
            uuid: input.checkin.uuid,
            status: 'inactive_registration' as const,
            registration_id: registration.id
          }
        }

        if (registration.qr_token_expires_at && registration.qr_token_expires_at <= new Date()) {
          return {
            uuid: input.checkin.uuid,
            status: 'expired_qr' as const,
            registration_id: registration.id
          }
        }

        const checkedAt = new Date(input.checkin.checked_at)
        const accepted = await tx.checkIn.findFirst({
          where: { registration_id: registration.id, is_duplicate: false },
          orderBy: [{ checked_at: 'asc' }, { uuid: 'asc' }]
        })

        const incomingComesFirst = accepted && shouldIncomingReplaceAccepted({
          incomingCheckedAt: checkedAt,
          incomingUuid: input.checkin.uuid,
          acceptedCheckedAt: accepted.checked_at,
          acceptedUuid: accepted.uuid
        })

        if (accepted && incomingComesFirst) {
          await tx.checkIn.update({
            where: { id: accepted.id },
            data: { is_duplicate: true }
          })
        }

        const isDuplicate = Boolean(accepted && !incomingComesFirst)
        await tx.checkIn.create({
          data: {
            registration_id: registration.id,
            operator_id: input.operatorId,
            device_id: input.checkin.device_id?.trim() || null,
            checked_at: checkedAt,
            uuid: input.checkin.uuid,
            synced_at: new Date(),
            is_duplicate: isDuplicate
          }
        })

        return {
          uuid: input.checkin.uuid,
          status: isDuplicate ? 'duplicate' as const : 'accepted' as const,
          registration_id: registration.id,
          accepted_checkin_uuid: isDuplicate ? accepted!.uuid : input.checkin.uuid
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (attempt < MAX_SERIALIZABLE_RETRIES && isRetryableTransactionError(error)) continue
      throw error
    }
  }

  throw new Error('Não foi possível reconciliar o check-in')
}

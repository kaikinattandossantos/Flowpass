import crypto from 'crypto'
import { prisma } from '../../../database'
import { getSocketIo } from '../lib/socket'

export type CredentialingScanResult =
  | {
      result: 'success'
      name: string
      category: string | null
      checked_at: string
    }
  | {
      result: 'unauthorized_category'
      name: string
      category: string | null
      message: string
    }
  | {
      result: 'already_checked_in'
      name: string
      category: string | null
      checked_at: string
    }
  | { result: 'invalid_qr' }
  | { result: 'inactive_link' }
  | { result: 'link_not_found' }

function formatCategoryName(name: string | null | undefined): string | null {
  return name?.trim() ? name.trim() : null
}

function isRegistrationEligible(registration: {
  status: string
  qr_token_expires_at: Date | null
}): boolean {
  if (registration.status === 'cancelled') return false
  if (registration.qr_token_expires_at && registration.qr_token_expires_at < new Date()) {
    return false
  }
  return true
}

function isCategoryAllowed(
  allowsAllCategories: boolean,
  allowedCategoryIds: string[],
  categoryId: string | null
): boolean {
  if (allowsAllCategories) return true
  if (!categoryId) return false
  return allowedCategoryIds.includes(categoryId)
}

export async function getCredentialingLinkByPublicId(publicId: string) {
  const accessPoint = await prisma.accessPoint.findUnique({
    where: { public_id: publicId },
    include: {
      event: { select: { id: true, name: true, status: true } },
      categories: {
        include: { category: { select: { id: true, name: true } } }
      },
      _count: { select: { checkins: true } }
    }
  })

  if (!accessPoint) return null

  const categoryNames = accessPoint.categories.map((entry) => entry.category.name)
  const categoriesLabel = accessPoint.allows_all_categories
    ? 'Todas as categorias'
    : categoryNames.length > 0
      ? categoryNames.join(', ')
      : 'Nenhuma categoria configurada'

  return {
    event: {
      id: accessPoint.event.id,
      name: accessPoint.event.name,
      status: accessPoint.event.status
    },
    point: {
      id: accessPoint.id,
      name: accessPoint.name,
      description: accessPoint.description,
      active: accessPoint.active,
      public_id: accessPoint.public_id,
      allows_all_categories: accessPoint.allows_all_categories,
      categories: accessPoint.categories.map((entry) => ({
        id: entry.category.id,
        name: entry.category.name
      })),
      categories_label: categoriesLabel,
      checkin_count: accessPoint._count.checkins
    }
  }
}

export async function processCredentialingScan(
  publicId: string,
  qrToken: string
): Promise<CredentialingScanResult> {
  const accessPoint = await prisma.accessPoint.findUnique({
    where: { public_id: publicId },
    include: {
      event: { select: { id: true, name: true } },
      categories: { select: { category_id: true } }
    }
  })

  if (!accessPoint) {
    return { result: 'link_not_found' }
  }

  if (!accessPoint.active) {
    return { result: 'inactive_link' }
  }

  const registration = await prisma.registration.findUnique({
    where: { qr_token: qrToken },
    include: { category: { select: { id: true, name: true } } }
  })

  if (!registration || registration.event_id !== accessPoint.event_id) {
    return { result: 'invalid_qr' }
  }

  if (!isRegistrationEligible(registration)) {
    return { result: 'invalid_qr' }
  }

  const categoryName = formatCategoryName(registration.category?.name)
  const allowedCategoryIds = accessPoint.categories.map((entry) => entry.category_id)

  return prisma.$transaction(async (tx) => {
    const existingCheckin = await tx.checkIn.findFirst({
      where: {
        registration_id: registration.id,
        is_duplicate: false
      },
      orderBy: { checked_at: 'desc' }
    })

    if (existingCheckin) {
      return {
        result: 'already_checked_in' as const,
        name: registration.name,
        category: categoryName,
        checked_at: existingCheckin.checked_at.toISOString()
      }
    }

    if (!isCategoryAllowed(
      accessPoint.allows_all_categories,
      allowedCategoryIds,
      registration.category_id
    )) {
      const label = categoryName ?? 'Sem categoria'
      return {
        result: 'unauthorized_category' as const,
        name: registration.name,
        category: categoryName,
        message:
          `Participante pertence à categoria ${label}. ` +
          'Este ponto de credenciamento não está autorizado para essa categoria.'
      }
    }

    const checkedAt = new Date()
    const checkin = await tx.checkIn.create({
      data: {
        registration_id: registration.id,
        access_point_id: accessPoint.id,
        uuid: crypto.randomUUID(),
        checked_at: checkedAt,
        synced_at: checkedAt
      }
    })

    const socketIo = getSocketIo()
    socketIo?.of(`/events/${accessPoint.event_id}`).emit('checkin', {
      registration_id: registration.id,
      name: registration.name,
      category: categoryName ?? '',
      checked_at: checkin.checked_at,
      operator_name: accessPoint.name
    })

    return {
      result: 'success' as const,
      name: registration.name,
      category: categoryName,
      checked_at: checkin.checked_at.toISOString()
    }
  })
}

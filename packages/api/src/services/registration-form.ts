import { Prisma, prisma } from '../../../database'
import { generatePublicId } from '../utils/public-id'
import { DEFAULT_STRUCTURAL_CONFIG } from '../utils/structural-config'

export async function createDefaultRegistrationForm(
  eventId: string,
  name = 'Formulário principal'
) {
  return prisma.registrationForm.create({
    data: {
      event_id: eventId,
      name,
      public_id: generatePublicId(),
      structural_config: DEFAULT_STRUCTURAL_CONFIG as unknown as Prisma.InputJsonValue,
      status: 'active'
    }
  })
}

export async function getPrimaryRegistrationForm(eventId: string) {
  return prisma.registrationForm.findFirst({
    where: { event_id: eventId },
    orderBy: { created_at: 'asc' }
  })
}

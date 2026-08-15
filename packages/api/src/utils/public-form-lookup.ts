import { prisma } from '../../../database'

export async function findPublicRegistrationForm(identifier: string) {
  const byPublicId = await prisma.registrationForm.findUnique({
    where: { public_id: identifier },
    include: {
      event: { include: { company: true, categories: { orderBy: { name: 'asc' } } } },
      form_fields: { orderBy: { order: 'asc' } }
    }
  })

  if (byPublicId) return byPublicId

  return prisma.registrationForm.findUnique({
    where: { slug: identifier },
    include: {
      event: { include: { company: true, categories: { orderBy: { name: 'asc' } } } },
      form_fields: { orderBy: { order: 'asc' } }
    }
  })
}

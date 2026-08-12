import './load-env.js'
import bcrypt from 'bcryptjs'
import { prisma, Prisma } from '../../database'
import { DEFAULT_STRUCTURAL_CONFIG } from '../src/utils/structural-config'
import { generatePublicId } from '../src/utils/public-id'

async function main() {
  await prisma.user.upsert({
    where: { email: 'superadmin@flowpass.com.br' },
    update: {},
    create: {
      name: 'Super Admin FlowPass',
      email: 'superadmin@flowpass.com.br',
      password_hash: await bcrypt.hash('flowpass123', 10),
      role: 'super_admin',
      company_id: null
    }
  })

  const company = await prisma.company.upsert({
    where: { cnpj: '00000000000000' },
    update: {},
    create: {
      name: 'Empresa Demo',
      cnpj: '00000000000000',
      email: 'demo@flowpass.com.br',
      subdomain: 'demo',
      status: 'active',
      primary_color: '#0B1F3A',
      secondary_color: '#00C896'
    }
  })

  await prisma.user.upsert({
    where: { email: 'admin@flowpass.com.br' },
    update: {},
    create: {
      company_id: company.id,
      name: 'Admin Demo',
      email: 'admin@flowpass.com.br',
      password_hash: await bcrypt.hash('flowpass123', 10),
      role: 'admin'
    }
  })

  const start = new Date('2026-09-15T14:00:00.000Z')
  const end = new Date('2026-09-15T22:00:00.000Z')

  const demoEvent = await prisma.event.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      company_id: company.id,
      name: 'Plug Social Day Recife',
      description: 'Evento demo com formulário configurável',
      start_at: start,
      end_at: end,
      location: 'Recife, PE',
      status: 'active',
      categories: {
        create: [{ name: 'Público Geral' }, { name: 'VIP' }]
      }
    },
    include: { categories: true }
  })

  let mainForm = await prisma.registrationForm.findFirst({
    where: { event_id: demoEvent.id, name: 'Formulário principal' }
  })

  if (!mainForm) {
    mainForm = await prisma.registrationForm.create({
      data: {
        event_id: demoEvent.id,
        name: 'Formulário principal',
        public_id: generatePublicId(),
        structural_config: DEFAULT_STRUCTURAL_CONFIG as unknown as Prisma.InputJsonValue,
        status: 'active'
      }
    })
  }

  await prisma.formField.deleteMany({ where: { registration_form_id: mainForm.id } })
  await prisma.formField.createMany({
    data: [
      {
        registration_form_id: mainForm.id,
        label: 'Nome da empresa',
        type: 'text',
        required: true,
        order: 0,
        placeholder: 'Ex: Plug'
      },
      {
        registration_form_id: mainForm.id,
        label: 'Cargo',
        type: 'text',
        required: false,
        order: 1
      },
      {
        registration_form_id: mainForm.id,
        label: 'Cidade',
        type: 'text',
        required: true,
        order: 2
      }
    ]
  })

  console.log('Seed concluído.')
  console.log('Super Admin: superadmin@flowpass.com.br / flowpass123')
  console.log('Admin Demo: admin@flowpass.com.br / flowpass123')
  console.log(`Evento demo: ${demoEvent.id}`)
  console.log(`Formulário principal: /f/${mainForm.public_id}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())

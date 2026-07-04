import bcrypt from 'bcryptjs'
import { prisma } from '../../database'

async function main() {
  await prisma.user.upsert({
    where: { email: 'superadmin@flowpass.com.br' },
    update: {},
    create: {
      name: 'Administrador FlowPass',
      email: 'superadmin@flowpass.com.br',
      password_hash: await bcrypt.hash('flowpass123', 10),
      role: 'superadmin'
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
      primary_color: '#0B1F3A',
      secondary_color: '#00C896'
    }
  })

  await prisma.user.upsert({
    where: { email: 'admin@flowpass.com.br' },
    update: {},
    create: {
      company_id: company.id,
      name: 'Gestor Demo',
      email: 'admin@flowpass.com.br',
      password_hash: await bcrypt.hash('flowpass123', 10),
      role: 'admin'
    }
  })

  console.log('Seed concluído.')
  console.log('Superadmin: superadmin@flowpass.com.br / flowpass123')
  console.log('Empresa demo: admin@flowpass.com.br / flowpass123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
import bcrypt from 'bcryptjs'
import { prisma } from '../../database'
import { formatEventAddress } from './utils/address'

const demoEvents = [
  {
    name: 'Summit de Inovação 2026',
    description: 'Conferência anual sobre transformação digital e liderança empresarial.',
    start_at: '2026-08-15T14:00:00.000Z',
    end_at: '2026-08-15T22:00:00.000Z',
    cep: '01310100',
    street: 'Avenida Paulista',
    number: '1578',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Bela Vista',
    banner_color: '#0B1F3A',
    accent_color: '#00C896',
    welcome_message: 'Bem-vindo ao maior encontro de inovação corporativa do ano.',
    categories: [{ name: 'Executivo', color: '#0B1F3A' }, { name: 'Convidado', color: '#00C896' }]
  },
  {
    name: 'Fórum de RH & Cultura',
    description: 'People analytics, employer branding e retenção de talentos.',
    start_at: '2026-07-20T13:00:00.000Z',
    end_at: '2026-07-20T18:00:00.000Z',
    cep: '22640102',
    street: 'Avenida das Américas',
    number: '500',
    city: 'Rio de Janeiro',
    state: 'RJ',
    neighborhood: 'Barra da Tijuca',
    banner_color: '#1e3a5f',
    accent_color: '#3b82f6',
    categories: [{ name: 'RH', color: '#3b82f6' }, { name: 'Palestrante', color: '#1e3a5f' }]
  },
  {
    name: 'Congresso de Saúde Corporativa',
    description: 'Bem-estar, produtividade e programas de saúde ocupacional.',
    start_at: '2026-09-05T09:00:00.000Z',
    end_at: '2026-09-05T17:00:00.000Z',
    cep: '30130100',
    street: 'Avenida Afonso Pena',
    number: '867',
    city: 'Belo Horizonte',
    state: 'MG',
    banner_color: '#065f46',
    accent_color: '#10b981',
    categories: [{ name: 'Corporativo', color: '#10b981' }]
  },
  {
    name: 'Meetup Clientes & Parceiros',
    description: 'Networking exclusivo para clientes e ecossistema de parceiros.',
    start_at: '2026-09-15T19:00:00.000Z',
    end_at: '2026-09-15T22:00:00.000Z',
    cep: '01310100',
    street: 'Av Paulista',
    number: '1000',
    city: 'São Paulo',
    state: 'SP',
    banner_color: '#312e81',
    accent_color: '#818cf8',
    categories: [{ name: 'Cliente', color: '#818cf8' }, { name: 'Parceiro', color: '#312e81' }]
  },
  {
    name: 'Workshop Liderança Executiva',
    description: 'Imersão prática em gestão de equipes de alta performance.',
    start_at: '2026-09-01T10:00:00.000Z',
    end_at: '2026-09-01T12:00:00.000Z',
    cep: '01310100',
    street: 'Rua Teste',
    number: '123',
    city: 'São Paulo',
    state: 'SP',
    banner_color: '#0B1F3A',
    accent_color: '#00C896',
    categories: [{ name: 'VIP', color: '#00C896' }]
  },
  {
    name: 'Encontro Nordeste de Negócios',
    description: 'Conexões B2B e cases de crescimento na região Nordeste.',
    start_at: '2026-10-10T14:00:00.000Z',
    end_at: '2026-10-10T20:00:00.000Z',
    cep: '53130150',
    street: 'Rua Professor Marcolino Botelho',
    number: '333',
    complement: '11',
    city: 'Olinda',
    state: 'PE',
    neighborhood: 'Bairro Novo',
    banner_color: '#006eff',
    accent_color: '#44c1a1',
    welcome_message: 'Conectando empresas e oportunidades no Nordeste.',
    categories: [{ name: 'Empresário', color: '#006eff' }, { name: 'Investidor', color: '#44c1a1' }]
  },
  {
    name: 'Tech Day FlowPass',
    description: 'Demonstrações de credenciamento, analytics e operações ao vivo.',
    start_at: '2026-11-08T09:00:00.000Z',
    end_at: '2026-11-08T18:00:00.000Z',
    cep: '88015000',
    street: 'Rua Felipe Schmidt',
    number: '120',
    city: 'Florianópolis',
    state: 'SC',
    banner_color: '#0f172a',
    accent_color: '#06b6d4',
    categories: [{ name: 'Tecnologia', color: '#06b6d4' }, { name: 'Operações', color: '#0f172a' }]
  },
  {
    name: 'Gala Anual de Parceiros',
    description: 'Cerimônia de premiação e confraternização de fim de ciclo.',
    start_at: '2026-12-05T20:00:00.000Z',
    end_at: '2026-12-06T01:00:00.000Z',
    cep: '70040902',
    street: 'Setor Comercial Sul Quadra 2',
    number: 'Bloco C',
    city: 'Brasília',
    state: 'DF',
    banner_color: '#1a1a2e',
    accent_color: '#e94560',
    categories: [{ name: 'Premium', color: '#e94560' }, { name: 'Imprensa', color: '#1a1a2e' }]
  }
]

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
      name: 'FlowPass Eventos',
      cnpj: '00000000000000',
      email: 'demo@flowpass.com.br',
      subdomain: 'demo',
      primary_color: '#0B1F3A',
      secondary_color: '#00C896'
    }
  })

  await prisma.user.upsert({
    where: { email: 'admin@flowpass.com.br' },
    update: { company_id: company.id },
    create: {
      company_id: company.id,
      name: 'Gestor Demo',
      email: 'admin@flowpass.com.br',
      password_hash: await bcrypt.hash('flowpass123', 10),
      role: 'admin'
    }
  })

  for (const demo of demoEvents) {
    const existing = await prisma.event.findFirst({
      where: { company_id: company.id, name: demo.name }
    })

    if (existing) continue

    const address = {
      cep: demo.cep,
      street: demo.street,
      number: demo.number,
      complement: demo.complement ?? null,
      neighborhood: demo.neighborhood ?? null,
      city: demo.city ?? null,
      state: demo.state ?? null
    }

    await prisma.event.create({
      data: {
        company_id: company.id,
        name: demo.name,
        description: demo.description,
        start_at: new Date(demo.start_at),
        end_at: new Date(demo.end_at),
        ...address,
        location: formatEventAddress(address),
        banner_color: demo.banner_color,
        accent_color: demo.accent_color,
        welcome_message: demo.welcome_message ?? null,
        status: 'active',
        categories: {
          create: demo.categories.map((category) => ({
            name: category.name,
            color: category.color
          }))
        }
      }
    })
  }

  const eventCount = await prisma.event.count({ where: { company_id: company.id, status: 'active' } })

  console.log('Seed concluído.')
  console.log('Superadmin: superadmin@flowpass.com.br / flowpass123')
  console.log('Empresa demo: admin@flowpass.com.br / flowpass123')
  console.log(`Eventos ativos: ${eventCount}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
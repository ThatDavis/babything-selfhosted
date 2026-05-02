import { PrismaClient } from '@prisma/client'
import { defaultEmailTemplates } from '../src/lib/mailer.js'

const prisma = new PrismaClient()

async function main() {
  for (const [name, { subject, html }] of Object.entries(defaultEmailTemplates)) {
    await prisma.emailTemplate.upsert({
      where: { name },
      update: {},
      create: { name, subject, htmlBody: html },
    })
    console.log(`Seeded template: ${name}`)
  }

  await prisma.plan.upsert({
    where: { name: 'Flat Rate' },
    update: {},
    create: {
      name: 'Flat Rate',
      description: 'All features, unlimited babies and caregivers.',
      monthlyPrice: 800,
      annualPrice: 7700,
      features: ['Unlimited babies', 'Unlimited caregivers', 'Real-time sync', 'PDF reports', 'CSV export', 'PWA support'],
      isActive: true,
      sortOrder: 0,
    },
  })
  console.log('Seeded plan: Flat Rate')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

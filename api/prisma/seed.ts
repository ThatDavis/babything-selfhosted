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

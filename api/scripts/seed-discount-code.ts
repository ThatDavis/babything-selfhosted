import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.discountCode.findUnique({
    where: { code: 'SIXMONTHS' },
  })

  if (existing) {
    console.log('Sample discount code SIXMONTHS already exists.')
    return
  }

  const freeTimeCode = await prisma.discountCode.create({
    data: {
      code: 'SIXMONTHS',
      type: 'FREE_TIME',
      value: 180, // 180 days = ~6 months
      appliesTo: 'ANY',
      isActive: true,
    },
  })

  console.log('Created sample discount code:', freeTimeCode)

  const percentageCode = await prisma.discountCode.create({
    data: {
      code: 'YEARLY20',
      type: 'PERCENTAGE',
      value: 20,
      appliesTo: 'ANNUAL',
      isActive: true,
    },
  })

  console.log('Created sample discount code:', percentageCode)
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

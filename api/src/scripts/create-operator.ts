/**
 * Bootstrap script: create the first operator account.
 *
 * Usage (inside the API container):
 *   node dist/scripts/create-operator.js <email> <name> <password> <role>
 *
 * Example:
 *   node dist/scripts/create-operator.js admin@example.com "Admin User" "SecurePass123!" GLOBAL_ADMIN
 */

import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'

async function main() {
  const [email, name, password, role] = process.argv.slice(2)

  if (!email || !name || !password || !role) {
    console.error('Usage: node dist/scripts/create-operator.js <email> <name> <password> <role>')
    console.error('Roles: HELPDESK, ACCOUNTING, GLOBAL_ADMIN')
    process.exit(1)
  }

  const validRoles = ['HELPDESK', 'ACCOUNTING', 'GLOBAL_ADMIN']
  if (!validRoles.includes(role)) {
    console.error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`)
    process.exit(1)
  }

  const existing = await prisma.operator.findUnique({ where: { email } })
  if (existing) {
    console.error(`Operator with email ${email} already exists.`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const operator = await prisma.operator.create({
    data: { email, name, passwordHash, role: role as any },
  })

  console.log('Operator created successfully:')
  console.log(`  ID:    ${operator.id}`)
  console.log(`  Email: ${operator.email}`)
  console.log(`  Name:  ${operator.name}`)
  console.log(`  Role:  ${operator.role}`)
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

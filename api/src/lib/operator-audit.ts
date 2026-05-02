import { prisma } from './prisma.js'

interface LogOperatorActionOpts {
  operatorId: string
  action: string
  targetType?: string
  targetId?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
}

export async function logOperatorAction(opts: LogOperatorActionOpts) {
  try {
    await prisma.auditLog.create({
      data: {
        operatorId: opts.operatorId,
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId,
        oldValue: opts.oldValue ? JSON.stringify(opts.oldValue) : null,
        newValue: opts.newValue ? JSON.stringify(opts.newValue) : null,
        ipAddress: opts.ipAddress,
      },
    })
  } catch (err) {
    // Audit logging should never fail the main operation
    console.error('Failed to write audit log:', err)
  }
}

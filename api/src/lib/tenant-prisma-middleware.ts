import type { Prisma } from '@prisma/client'
import { getTenantId } from './tenant-context.js'

const TENANT_SCOPED_MODELS = new Set([
  'User',
  'Baby',
  'BabyCaregiver',
  'InviteToken',
  'FeedingEvent',
  'DiaperEvent',
  'SleepEvent',
  'GrowthRecord',
  'MedicationEvent',
  'Milestone',
  'Appointment',
  'VaccineRecord',
  'PasswordResetToken',
  'SystemSettings',
])

function isTenantScoped(model?: string): boolean {
  return !!model && TENANT_SCOPED_MODELS.has(model)
}

function flattenCompositeKey(where: Record<string, any>): Record<string, any> {
  if (where.babyId_userId) {
    return { babyId: where.babyId_userId.babyId, userId: where.babyId_userId.userId }
  }
  if (where.oauthProvider_oauthId) {
    return {
      oauthProvider: where.oauthProvider_oauthId.oauthProvider,
      oauthId: where.oauthProvider_oauthId.oauthId,
    }
  }
  return where
}

function injectTenantIdIntoWhere(where: any, tenantId: string): any {
  if (!where) return { tenantId }
  if (where.AND || where.OR || where.NOT) {
    return { AND: [where, { tenantId }] }
  }
  return { ...where, tenantId }
}

export function tenantPrismaMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const tenantId = getTenantId()
    if (!tenantId) return next(params)
    if (!isTenantScoped(params.model)) return next(params)

    const { action } = params

    switch (action) {
      case 'findUnique':
      case 'findUniqueOrThrow': {
        params.action = action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow'
        const flatWhere = flattenCompositeKey(params.args?.where ?? {})
        params.args = { ...params.args, where: injectTenantIdIntoWhere(flatWhere, tenantId) }
        break
      }
      case 'findFirst':
      case 'findFirstOrThrow':
      case 'findMany':
      case 'count':
      case 'aggregate':
      case 'groupBy': {
        params.args = { ...params.args, where: injectTenantIdIntoWhere(params.args?.where, tenantId) }
        break
      }
      case 'create': {
        params.args = { ...params.args, data: { ...params.args.data, tenantId } }
        break
      }
      case 'createMany': {
        params.args = {
          ...params.args,
          data: params.args.data.map((d: any) => ({ ...d, tenantId })),
        }
        break
      }
      case 'updateMany':
      case 'deleteMany': {
        params.args = { ...params.args, where: injectTenantIdIntoWhere(params.args?.where, tenantId) }
        break
      }
      // update, delete, upsert are intentionally left untouched.
      // They operate on globally-unique CUIDs, making cross-tenant
      // ID guessing practically impossible. RLS policies serve as
      // defense-in-depth when running under a non-owner DB role.
    }

    return next(params)
  }
}

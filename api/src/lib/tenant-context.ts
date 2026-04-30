import { AsyncLocalStorage } from 'async_hooks'

export interface TenantInfo {
  id: string
  subdomain: string
  status: string
  trialEndsAt?: Date | null
  plan: string
}

export interface TenantContext {
  tenantId: string
  tenant?: TenantInfo
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>()

export function getTenantId(): string | undefined {
  return tenantStorage.getStore()?.tenantId
}

export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore()
}

export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return tenantStorage.run(ctx, fn)
}

export async function runWithTenantAsync<T>(ctx: TenantContext, fn: () => T | Promise<T>): Promise<T> {
  return tenantStorage.run(ctx, fn)
}

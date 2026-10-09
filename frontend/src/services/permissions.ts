export const permissionKeys = ['dashboard', 'products', 'orders', 'inventory', 'stock_count', 'waste', 'purchasing', 'analytics', 'forecast', 'users', 'settings'] as const
export type Permissions = Record<string, boolean>
export const defaultPermissions: Record<string, Permissions> = Object.fromEntries(['owner', 'manager', 'inventory_staff', 'cashier'].map(role => [role, Object.fromEntries(permissionKeys.map(key => [key, role === 'owner' || (role === 'manager' && key !== 'settings') || (role === 'inventory_staff' && ['inventory', 'stock_count', 'waste', 'purchasing'].includes(key)) || (role === 'cashier' && key === 'orders')]))]))
export function homeForRole(role: string) {
  return role === 'cashier' ? '/app/orders' : role === 'inventory_staff' ? '/app/inventory' : '/app/dashboard'
}
export function featureForRoute(path: string) {
  if (path.startsWith('/app/analytics') || path === '/app/reports') return 'analytics'
  const key = path.split('/')[2]
  return ({ dashboard: 'dashboard', products: 'products', recipes: 'products', orders: 'orders', inventory: 'inventory', receiving: 'inventory', expiration: 'inventory', 'stock-count': 'stock_count', waste: 'waste', suppliers: 'purchasing', 'purchase-orders': 'purchasing', forecast: 'forecast', settings: path.endsWith('/users') ? 'users' : 'settings' } as Record<string, string>)[key]
}
export function currentPermissions(role: string): Permissions {
  if (role === 'owner' || role === 'admin') return defaultPermissions.owner
  const key = `khumflow_permissions:${localStorage.getItem('khumflow_business_id') || ''}:${role}`
  try { return JSON.parse(localStorage.getItem(key) || 'null') || defaultPermissions[role] || {} } catch { return defaultPermissions[role] || {} }
}

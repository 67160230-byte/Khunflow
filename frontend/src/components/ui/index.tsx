import { type ReactNode } from 'react'
import { clsx } from 'clsx'

// ── Badge ─────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const badgeVariants: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  loading?: boolean
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-green-700 text-white hover:bg-green-800 active:bg-green-900 shadow-sm',
  secondary: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-gray-100 shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow duration-200',
        className
      )}
    >
      {children}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────
interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  changePercent?: number
  icon: ReactNode
  iconBg?: string
}

export function KPICard({ title, value, subtitle, changePercent, icon, iconBg = 'bg-green-100' }: KPICardProps) {
  const isPositive = changePercent !== undefined && changePercent >= 0
  const isNegative = changePercent !== undefined && changePercent < 0
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          {changePercent !== undefined && (
            <p
              className={clsx(
                'mt-2 text-xs font-medium flex items-center gap-0.5',
                isPositive && 'text-green-600',
                isNegative && 'text-red-500',
                changePercent === 0 && 'text-gray-400'
              )}
            >
              {isPositive ? '↑' : isNegative ? '↓' : '–'}
              {Math.abs(changePercent).toFixed(1)}% เทียบกับเมื่อวาน
            </p>
          )}
        </div>
        <div className={clsx('p-2.5 rounded-xl', iconBg)}>{icon}</div>
      </div>
    </Card>
  )
}

// ── Alert Card ────────────────────────────────────────────────
interface AlertCardProps {
  severity: 'warning' | 'danger' | 'info'
  title: string
  description: string
  icon?: ReactNode
}

const alertStyles: Record<string, string> = {
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}
const alertIconBg: Record<string, string> = {
  warning: 'text-amber-500',
  danger: 'text-red-500',
  info: 'text-blue-500',
}

export function AlertCard({ severity, title, description }: AlertCardProps) {
  return (
    <div className={clsx('rounded-lg border p-3 flex gap-2.5', alertStyles[severity])}>
      <span className={clsx('mt-0.5 flex-shrink-0 text-lg leading-none', alertIconBg[severity])}>
        {severity === 'danger' ? '⚠' : severity === 'warning' ? '⚡' : 'ℹ'}
      </span>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs mt-0.5 opacity-80">{description}</p>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-gray-300 mb-4 text-5xl">{icon}</div>}
      <h3 className="text-gray-700 font-semibold text-base">{title}</h3>
      {description && <p className="text-gray-400 text-sm mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Loading Spinner ───────────────────────────────────────────
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center justify-center py-16', className)}>
      <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>
  )
}

// ── Section Header ─────────────────────────────────────────────
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ── Status Badge helpers ───────────────────────────────────────
export function IngredientStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    normal: { label: 'ปกติ', variant: 'success' },
    low: { label: 'ใกล้หมด', variant: 'warning' },
    critical: { label: 'วิกฤต', variant: 'danger' },
    expiring_soon: { label: 'ใกล้หมดอายุ', variant: 'warning' },
    expired: { label: 'หมดอายุ', variant: 'danger' },
  }
  const item = map[status] ?? { label: status, variant: 'neutral' as BadgeVariant }
  return <Badge variant={item.variant}>{item.label}</Badge>
}

export function ProductStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    active: { label: 'ใช้งาน', variant: 'success' },
    inactive: { label: 'ปิดใช้งาน', variant: 'neutral' },
    out_of_stock: { label: 'หมดสต็อก', variant: 'danger' },
  }
  const item = map[status] ?? { label: status, variant: 'neutral' as BadgeVariant }
  return <Badge variant={item.variant}>{item.label}</Badge>
}

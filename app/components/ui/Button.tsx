import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LoadingMark } from './PageLoader'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'border border-orange-700 bg-orange-600 text-white hover:bg-orange-700',
      secondary: 'border border-slate-900 bg-slate-800 text-white hover:bg-slate-900',
      outline: 'border border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 text-slate-700',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
      danger: 'border border-red-700 bg-red-600 text-white hover:bg-red-700',
    }

    const sizes = {
      sm: 'h-9 px-3 text-xs',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-8 text-lg',
      icon: 'h-10 w-10 p-2 flex items-center justify-center',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&>svg]:shrink-0',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <LoadingMark className="mr-2" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }

type PageLoaderProps = {
  message?: string
  detail?: string
  compact?: boolean
}

type InlineLoaderProps = {
  message?: string
  className?: string
}

export function PageLoader({
  message = 'Carregando',
  detail = 'Preparando tudo para você',
  compact = false,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rei-page-loader${compact ? ' rei-page-loader--compact' : ''}`}
    >
      <div className="rei-page-loader__content">
        <div className="rei-page-loader__stage" aria-hidden="true">
          <span className="rei-page-loader__glow" />
          <span className="rei-page-loader__orbit rei-page-loader__orbit--outer" />
          <span className="rei-page-loader__orbit rei-page-loader__orbit--inner" />
          <span className="rei-page-loader__mark">C</span>
        </div>
        <div className="rei-page-loader__copy">
          <strong>{message}</strong>
          <span>{detail}</span>
          <span className="rei-page-loader__dots" aria-hidden="true">
            <i /><i /><i />
          </span>
        </div>
      </div>
    </div>
  )
}

export function InlineLoader({ message = 'Carregando', className = '' }: InlineLoaderProps) {
  return (
    <span role="status" aria-live="polite" className={`rei-inline-loader ${className}`.trim()}>
      <span>{message}</span>
      <span className="rei-inline-loader__dots" aria-hidden="true">
        <i /><i /><i />
      </span>
    </span>
  )
}

export function LoadingMark({ className = '' }: { className?: string }) {
  return (
    <span className={`rei-loading-mark ${className}`.trim()} aria-hidden="true">
      <i /><i /><i />
    </span>
  )
}

export function LoadingValue() {
  return <span className="rei-loading-value" role="status" aria-label="Carregando" />
}

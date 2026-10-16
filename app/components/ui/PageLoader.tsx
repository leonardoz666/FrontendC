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
      className={`controlae-page-loader${compact ? ' controlae-page-loader--compact' : ''}`}
    >
      <div className="controlae-page-loader__content">
        <div className="controlae-page-loader__stage" aria-hidden="true">
          <span className="controlae-page-loader__glow" />
          <span className="controlae-page-loader__orbit controlae-page-loader__orbit--outer" />
          <span className="controlae-page-loader__orbit controlae-page-loader__orbit--inner" />
          <span className="controlae-page-loader__mark">C</span>
        </div>
        <div className="controlae-page-loader__copy">
          <strong>{message}</strong>
          <span>{detail}</span>
          <span className="controlae-page-loader__dots" aria-hidden="true">
            <i /><i /><i />
          </span>
        </div>
      </div>
    </div>
  )
}

export function InlineLoader({ message = 'Carregando', className = '' }: InlineLoaderProps) {
  return (
    <span role="status" aria-live="polite" className={`controlae-inline-loader ${className}`.trim()}>
      <span>{message}</span>
      <span className="controlae-inline-loader__dots" aria-hidden="true">
        <i /><i /><i />
      </span>
    </span>
  )
}

export function LoadingMark({ className = '' }: { className?: string }) {
  return (
    <span className={`controlae-loading-mark ${className}`.trim()} aria-hidden="true">
      <i /><i /><i />
    </span>
  )
}

export function LoadingValue() {
  return <span className="controlae-loading-value" role="status" aria-label="Carregando" />
}

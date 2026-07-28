import type { ConnectionStatus } from '../types'

interface ToolbarProps {
  name: string
  status: ConnectionStatus
  message?: string
  companionVersion?: string
  onPrevious(): void
  onNext(): void
  onSettings(): void
  onAdmin(): void
}

const statusLabel: Record<ConnectionStatus, string> = {
  mock: 'Mock Online',
  connecting: 'Connecting',
  online: 'Connected',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  error: 'Connection Error',
}

export function Toolbar(props: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="brand-block">
        <span className="brand-mark">TD</span>
        <div>
          <strong>{props.name}</strong>
          <span>TOUCH SURFACE</span>
        </div>
      </div>
      <div className="toolbar-center">
        <button type="button" onClick={props.onPrevious} aria-label="Previous page">‹</button>
        <div className="status-block" title={props.message}>
          <span className={`status-dot status-${props.status}`} />
          <span>{statusLabel[props.status]}</span>
          {props.companionVersion && <small>{props.companionVersion}</small>}
        </div>
        <button type="button" onClick={props.onNext} aria-label="Next page">›</button>
      </div>
      <div className="toolbar-actions">
        <button type="button" onClick={props.onAdmin}>COMPANION</button>
        <button type="button" className="toolbar-settings" onClick={props.onSettings} aria-label="Settings" />
      </div>
    </header>
  )
}

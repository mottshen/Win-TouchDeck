interface LockScreenProps {
  pinLength: number
  onKey(key: number): void
}

export function LockScreen({ pinLength, onKey }: LockScreenProps) {
  return (
    <div className="lock-screen" role="dialog" aria-modal="true" aria-label="Console locked">
      <div className="lock-card">
        <div className="lock-symbol">LOCK</div>
        <h1>Console Locked</h1>
        <p>Enter the Companion Surface PIN</p>
        <div className="pin-dots" aria-label={`${pinLength} digits entered`}>
          {Array.from({ length: Math.max(4, pinLength) }, (_, index) => (
            <span key={index} className={index < pinLength ? 'filled' : ''} />
          ))}
        </div>
        <div className="pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((key) => (
            <button type="button" key={key} onClick={() => onKey(key)}>{key}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

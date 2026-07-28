import { useMemo, useState } from 'react'
import { normalizeSettings, suggestGrid } from '../config/defaults'
import { BUILT_IN_THEMES } from '../config/themes'
import type { AppSettings, DisplayInfo } from '../types'

interface SettingsPanelProps {
  settings: AppSettings
  displays: DisplayInfo[]
  initialProfileId: string
  onCancel(): void
  onSave(settings: AppSettings, activeProfileId: string): Promise<void>
  onDeleteSurface(profileId: string): Promise<AppSettings>
  onExport(settings: AppSettings): Promise<{ saved: boolean; path?: string }>
  onImport(): Promise<void>
  onDiagnostics(): Promise<{ saved: boolean; path?: string }>
}

export function SettingsPanel({ settings, displays, initialProfileId, onCancel, onSave, onDeleteSurface, onExport, onImport, onDiagnostics }: SettingsPanelProps) {
  const [draft, setDraft] = useState<AppSettings>(() => structuredClone(settings))
  const [profileId, setProfileId] = useState(initialProfileId)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [profilePendingDeletion, setProfilePendingDeletion] = useState<string | null>(null)
  const [operationMessage, setOperationMessage] = useState('')
  const profileIndex = Math.max(0, draft.profiles.findIndex((profile) => profile.id === profileId))
  const profile = draft.profiles[profileIndex]
  const selectedDisplay = useMemo(
    () => displays.find((display) => display.id === profile?.displayId)
      ?? displays.find((display) => display.primary)
      ?? displays[0],
    [displays, profile?.displayId],
  )

  const updateProfile = (patch: Partial<typeof profile>) => {
    setDraft((current) => ({
      ...current,
      profiles: current.profiles.map((item, index) => index === profileIndex ? { ...item, ...patch } : item),
    }))
  }

  const addProfile = () => {
    const id = `surface-${Date.now().toString(36)}`
    setDraft((current) => ({
      ...current,
      profiles: [...current.profiles, {
        ...structuredClone(current.profiles[profileIndex]),
        id,
        name: `Touch Surface ${current.profiles.length + 1}`,
        displayId: displays.find((display) => !current.profiles.some((item) => item.displayId === display.id))?.id ?? '',
        kiosk: false,
        keepVisibleOnShowDesktop: undefined,
      }],
    }))
    setProfileId(id)
  }

  const confirmProfileDeletion = async () => {
    if (!profilePendingDeletion || draft.profiles.length <= 1) return
    setDeleting(true)
    try {
      const persisted = settings.profiles.some((item) => item.id === profilePendingDeletion)
      if (persisted) {
        const saved = await onDeleteSurface(profilePendingDeletion)
        setDraft(structuredClone(saved))
        setProfileId(saved.profiles[0].id)
        setOperationMessage('Surface permanently deleted from TouchDeck and disconnected from Companion.')
      } else {
        const next = draft.profiles.filter((item) => item.id !== profilePendingDeletion)
        setDraft((current) => ({ ...current, profiles: next }))
        setProfileId(next[0].id)
      }
      setProfilePendingDeletion(null)
    } finally {
      setDeleting(false)
    }
  }

  const submit = async () => {
    setSaving(true)
    try {
      await onSave(normalizeSettings(draft), profile.id)
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null
  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <section className="settings-panel">
        <header>
          <div>
            <span className="eyebrow">SYSTEM CONFIGURATION</span>
            <h1 id="settings-title">Win-TouchDeck Settings</h1>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close settings">×</button>
        </header>

        <div className="settings-body">
          <section className="settings-section">
            <div className="section-heading"><span>01</span><h2>Companion Connection</h2></div>
            <div className="mode-switch">
              <button
                className={draft.companionUrl === 'mock://local' ? 'active' : ''}
                type="button"
                onClick={() => setDraft({ ...draft, companionUrl: 'mock://local' })}
              >Mock Mode</button>
              <button
                className={draft.companionUrl !== 'mock://local' ? 'active' : ''}
                type="button"
                onClick={() => setDraft({ ...draft, companionUrl: 'ws://127.0.0.1:16623' })}
              >Live Companion</button>
            </div>
            <label>
              <span>Satellite WebSocket</span>
              <input
                value={draft.companionUrl}
                onChange={(event) => setDraft({ ...draft, companionUrl: event.target.value })}
                spellCheck={false}
              />
            </label>
            <label>
              <span>Administration Interface</span>
              <input
                value={draft.adminUrl}
                onChange={(event) => setDraft({ ...draft, adminUrl: event.target.value })}
                spellCheck={false}
              />
            </label>
          </section>

          <section className="settings-section">
            <div className="section-heading"><span>02</span><h2>Displays and Surfaces</h2></div>
            <div className="profile-tabs">
              {draft.profiles.map((item) => (
                <button key={item.id} className={item.id === profile.id ? 'active' : ''} type="button" onClick={() => setProfileId(item.id)}>
                  {item.name}
                </button>
              ))}
              {draft.profiles.length < 8 && <button type="button" className="add" onClick={addProfile}>＋</button>}
            </div>
            <div className="field-row">
              <label><span>Name</span><input value={profile.name} onChange={(event) => updateProfile({ name: event.target.value })} /></label>
              <label>
                <span>Target Display</span>
                <select value={profile.displayId} onChange={(event) => updateProfile({ displayId: event.target.value })}>
                  <option value="">Primary Display (Automatic)</option>
                  {displays.map((display) => (
                    <option key={display.id} value={display.id}>
                      {display.label} - {display.width}x{display.height} @{display.scaleFactor * 100}%
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid-controls">
              <label><span>Columns</span><input type="number" min="1" max="16" value={profile.columns} onChange={(event) => updateProfile({ columns: Number(event.target.value) })} /></label>
              <span className="multiply">×</span>
              <label><span>Rows</span><input type="number" min="1" max="16" value={profile.rows} onChange={(event) => updateProfile({ rows: Number(event.target.value) })} /></label>
              <label><span>Gap</span><input type="number" min="0" max="32" value={profile.gap} onChange={(event) => updateProfile({ gap: Number(event.target.value) })} /></label>
              <label><span>Bitmap Size</span><input type="number" min="48" max="512" step="8" value={profile.bitmapSize} onChange={(event) => updateProfile({ bitmapSize: Number(event.target.value) })} /></label>
              <button type="button" className="outline-button" onClick={() => selectedDisplay && updateProfile(suggestGrid(selectedDisplay, profile.showToolbar))}>Recommend Layout</button>
            </div>
            <div className="toggle-row">
              <label><input type="checkbox" checked={profile.enabled} onChange={(event) => updateProfile({ enabled: event.target.checked })} /><span>Enable This Display</span></label>
              <label><input type="checkbox" checked={profile.kiosk} onChange={(event) => updateProfile({ kiosk: event.target.checked })} /><span>Fullscreen Kiosk Mode</span></label>
              <label>
                <input
                  type="checkbox"
                  checked={profile.keepVisibleOnShowDesktop ?? selectedDisplay?.primary === false}
                  onChange={(event) => updateProfile({ keepVisibleOnShowDesktop: event.target.checked })}
                />
                <span>Keep Visible When Showing Desktop</span>
              </label>
              <label><input type="checkbox" checked={profile.showToolbar} onChange={(event) => updateProfile({ showToolbar: event.target.checked })} /><span>Show Top Toolbar (Press F9 to Toggle)</span></label>
              <label><input type="checkbox" checked={profile.showMediaBar} onChange={(event) => updateProfile({ showMediaBar: event.target.checked })} /><span>Show Bottom Spotify Control Bar (On by Default)</span></label>
            </div>
            <div className="surface-delete-row">
              <div>
                <strong>Delete this Surface</strong>
                <span>Removes it from TouchDeck permanently and disconnects it from Companion.</span>
              </div>
              <button
                type="button"
                className="danger-button"
                disabled={draft.profiles.length <= 1 || deleting}
                onClick={() => setProfilePendingDeletion(profile.id)}
              >
                Delete Surface
              </button>
            </div>
          </section>

          <section className="settings-section">
            <div className="section-heading"><span>03</span><h2>Appearance</h2></div>
            <div className="theme-picker" role="radiogroup" aria-label="Built-in theme">
              {BUILT_IN_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-option${draft.theme === theme.id ? ' active' : ''}`}
                  role="radio"
                  aria-checked={draft.theme === theme.id}
                  onClick={() => setDraft({ ...draft, theme: theme.id })}
                >
                  <span className="theme-swatches" aria-hidden="true">
                    {theme.swatches.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
                  </span>
                  <span className="theme-copy"><strong>{theme.name}</strong><small>{theme.description}</small></span>
                  <span className="theme-check" aria-hidden="true">✓</span>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <div className="section-heading"><span>04</span><h2>Windows Runtime</h2></div>
            <div className="toggle-row">
              <label><input type="checkbox" checked={draft.launchAtLogin} onChange={(event) => setDraft({ ...draft, launchAtLogin: event.target.checked })} /><span>Launch After Windows Sign-In</span></label>
              <label><input type="checkbox" checked={draft.closeToTray} onChange={(event) => setDraft({ ...draft, closeToTray: event.target.checked })} /><span>Hide to System Tray When Closing a Window</span></label>
              <label><input type="checkbox" checked={draft.preventDisplaySleep} onChange={(event) => setDraft({ ...draft, preventDisplaySleep: event.target.checked })} /><span>Keep Displays Awake While Running</span></label>
            </div>
            <div className="data-actions">
              <button type="button" className="outline-button" onClick={async () => {
                const result = await onExport(normalizeSettings(draft))
                setOperationMessage(result.saved ? `Configuration exported${result.path ? `: ${result.path}` : ''}` : 'Export canceled')
              }}>Export Configuration</button>
              <button type="button" className="outline-button" onClick={() => void onImport()}>Import and Apply</button>
              <button type="button" className="outline-button" onClick={async () => {
                const result = await onDiagnostics()
                setOperationMessage(result.saved ? `Diagnostics exported${result.path ? `: ${result.path}` : ''}` : 'Export canceled')
              }}>Export Diagnostics</button>
            </div>
            {operationMessage && <p className="operation-message" role="status">{operationMessage}</p>}
          </section>
        </div>

        <footer>
          <p>Saving rebuilds affected surfaces after safely releasing any pressed buttons.</p>
          <div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="save-button" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save and Apply'}</button></div>
        </footer>
        {profilePendingDeletion && (
          <div className="confirm-overlay" role="presentation">
            <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-surface-title" aria-describedby="delete-surface-description">
              <span className="confirm-kicker">PERMANENT ACTION</span>
              <h2 id="delete-surface-title">Delete “{draft.profiles.find((item) => item.id === profilePendingDeletion)?.name}”?</h2>
              <p id="delete-surface-description">This removes the Surface from TouchDeck immediately, disconnects it from Companion, and prevents it from returning after the next restart.</p>
              <div>
                <button type="button" disabled={deleting} onClick={() => setProfilePendingDeletion(null)}>Cancel</button>
                <button type="button" className="danger-button" disabled={deleting} onClick={() => void confirmProfileDeletion()}>
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}

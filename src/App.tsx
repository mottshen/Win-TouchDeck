import { useCallback, useEffect, useMemo, useState } from 'react'
import { SettingsPanel } from './components/SettingsPanel'
import { LockScreen } from './components/LockScreen'
import { SurfaceGrid } from './components/SurfaceGrid'
import { Toolbar } from './components/Toolbar'
import { DEFAULT_SETTINGS, normalizeSettings, selectProfile } from './config/defaults'
import { useSurface } from './hooks/use-surface'
import { desktopBridge } from './platform/bridge'
import type { AppSettings, DisplayInfo, RuntimeInfo } from './types'
import './styles.css'

const query = new URLSearchParams(window.location.search)

function Console({ settings, runtime, displays, onSettingsChange }: {
  settings: AppSettings
  runtime: RuntimeInfo
  displays: DisplayInfo[]
  onSettingsChange(settings: AppSettings): void
}) {
  const requestedProfileId = query.get('profile')
  const profile = useMemo(
    () => settings.profiles.find((item) => item.id === requestedProfileId) ?? selectProfile(settings, runtime.displayId),
    [settings, runtime.displayId, requestedProfileId],
  )
  const { state, controller } = useSurface(settings.companionUrl, profile)
  const [showSettings, setShowSettings] = useState(false)
  const onPress = useCallback((index: number, pressed: boolean) => controller.press(index, pressed), [controller])

  const toggleToolbar = useCallback(async () => {
    const nextSettings: AppSettings = {
      ...settings,
      profiles: settings.profiles.map((item) => item.id === profile.id
        ? { ...item, showToolbar: !item.showToolbar }
        : item),
    }
    const saved = await desktopBridge.saveSettings(nextSettings)
    onSettingsChange(saved)
  }, [onSettingsChange, profile.id, settings])

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'F9' && !event.repeat && !showSettings) {
        event.preventDefault()
        void toggleToolbar()
        return
      }
      if (event.key === 'F10' || (event.key === ',' && event.ctrlKey)) setShowSettings(true)
      if (event.key === 'Escape' && showSettings) setShowSettings(false)
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [showSettings, toggleToolbar])

  useEffect(() => {
    desktopBridge.logSurfaceEvent({
      profileId: profile.id,
      status: state.status,
      companionVersion: state.companionVersion,
      apiVersion: state.apiVersion,
      message: state.message,
    })
  }, [profile.id, state.status, state.companionVersion, state.apiVersion, state.message])

  const saveSettings = async (draft: AppSettings) => {
    const saved = await desktopBridge.saveSettings(draft)
    onSettingsChange(saved)
    setShowSettings(false)
  }

  return (
    <div className={`app-shell theme-${settings.theme} ${profile.showToolbar ? '' : 'toolbar-hidden'}`}>
      {profile.showToolbar && (
        <Toolbar
          name={profile.name}
          status={state.status}
          message={state.message}
          companionVersion={state.companionVersion}
          onPrevious={() => controller.changePage(-1)}
          onNext={() => controller.changePage(1)}
          onSettings={() => setShowSettings(true)}
          onAdmin={() => void desktopBridge.openAdmin(settings.adminUrl)}
        />
      )}
      {!profile.showToolbar && <button className="edge-settings" type="button" onClick={() => setShowSettings(true)} aria-label="Open settings" />}
      <SurfaceGrid profile={profile} buttons={state.buttons} brightness={state.brightness} onPress={onPress} />
      {state.locked && <LockScreen pinLength={state.pinLength} onKey={(key) => controller.pinKey(key)} />}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          displays={displays}
          initialProfileId={profile.id}
          onCancel={() => setShowSettings(false)}
          onSave={saveSettings}
          onExport={(draft) => desktopBridge.exportSettings(draft)}
          onImport={async () => {
            const imported = await desktopBridge.importSettings()
            if (!imported) return
            onSettingsChange(normalizeSettings(imported))
            setShowSettings(false)
          }}
          onDiagnostics={() => desktopBridge.exportDiagnostics()}
        />
      )}
    </div>
  )
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => structuredClone(DEFAULT_SETTINGS))
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([desktopBridge.getSettings(), desktopBridge.getRuntimeInfo(), desktopBridge.getDisplays()])
      .then(([loadedSettings, loadedRuntime, loadedDisplays]) => {
        if (!mounted) return
        setSettings(normalizeSettings(loadedSettings))
        setRuntime(loadedRuntime)
        setDisplays(loadedDisplays)
      })
      .catch((reason) => mounted && setError(reason instanceof Error ? reason.message : 'Initialization failed'))
    const unsubscribe = desktopBridge.onDisplaysChanged((next) => setDisplays(next))
    const unsubscribeSettings = desktopBridge.onSettingsChanged((next) => setSettings(normalizeSettings(next)))
    return () => {
      mounted = false
      unsubscribe()
      unsubscribeSettings()
    }
  }, [])

  if (error) return <div className="fatal-error"><strong>Win-TouchDeck could not start</strong><span>{error}</span></div>
  if (!runtime) return <div className="startup-screen"><span className="startup-mark">WTD</span><p>Initializing Win-TouchDeck...</p></div>
  return <Console settings={settings} runtime={runtime} displays={displays} onSettingsChange={setSettings} />
}

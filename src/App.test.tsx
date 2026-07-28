import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { DEFAULT_SETTINGS as DEFAULT_TEST_SETTINGS } from './config/defaults'

describe('Win-TouchDeck application', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('renders the mock surface and applies a grid setting', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /PROGRAM|PREVIEW|CAM|AUTO|CUT|RECORD|STREAM|MUTE|LOWER|BLACK|PAGE/ })).toHaveLength(15))
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('heading', { name: 'Win-TouchDeck Settings' })).toBeInTheDocument()
    const columns = screen.getByRole('spinbutton', { name: 'Columns' })
    await user.clear(columns)
    await user.type(columns, '4')
    await user.click(screen.getByRole('button', { name: 'Save and Apply' }))
    await waitFor(() => expect(document.querySelectorAll('.surface-button')).toHaveLength(12))
  })

  it('toggles and persists the toolbar with F9', async () => {
    const { container } = render(<App />)
    await waitFor(() => expect(container.querySelector('.toolbar')).toBeInTheDocument())

    fireEvent.keyDown(window, { key: 'F9' })
    await waitFor(() => expect(container.querySelector('.toolbar')).not.toBeInTheDocument())
    expect(JSON.parse(localStorage.getItem('win-touchdeck.settings') ?? '{}').profiles[0].showToolbar).toBe(false)

    fireEvent.keyDown(window, { key: 'F9' })
    await waitFor(() => expect(container.querySelector('.toolbar')).toBeInTheDocument())
    expect(JSON.parse(localStorage.getItem('win-touchdeck.settings') ?? '{}').profiles[0].showToolbar).toBe(true)
  })

  it('offers six themes and persists the selected appearance', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))

    expect(screen.getAllByRole('radio')).toHaveLength(6)
    await user.click(screen.getByRole('radio', { name: /Signal Paper/ }))
    await user.click(screen.getByRole('button', { name: 'Save and Apply' }))

    await waitFor(() => expect(container.querySelector('.app-shell')).toHaveClass('theme-paper'))
    expect(JSON.parse(localStorage.getItem('win-touchdeck.settings') ?? '{}').theme).toBe('paper')
  })

  it('migrates settings saved under the legacy product key', async () => {
    localStorage.setItem('touchdeck.settings', JSON.stringify({ theme: 'neon' }))
    const { container } = render(<App />)
    await waitFor(() => expect(container.querySelector('.app-shell')).toHaveClass('theme-neon'))
    expect(JSON.parse(localStorage.getItem('win-touchdeck.settings') ?? '{}').theme).toBe('neon')
  })

  it('permanently deletes a surface without requiring Save and Apply', async () => {
    localStorage.setItem('win-touchdeck.settings', JSON.stringify({
      ...DEFAULT_TEST_SETTINGS,
      profiles: [
        { ...DEFAULT_TEST_SETTINGS.profiles[0], id: 'surface-1', name: 'Surface One' },
        { ...DEFAULT_TEST_SETTINGS.profiles[0], id: 'surface-2', name: 'Surface Two' },
      ],
    }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Surface Two' }))
    await user.click(screen.getByRole('button', { name: 'Delete Surface' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('prevents it from returning after the next restart')
    await user.click(screen.getByRole('button', { name: 'Delete Permanently' }))

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('win-touchdeck.settings') ?? '{}')
      expect(saved.profiles.map((profile: { id: string }) => profile.id)).toEqual(['surface-1'])
    })
    expect(screen.queryByRole('button', { name: 'Surface Two' })).not.toBeInTheDocument()
  })
})

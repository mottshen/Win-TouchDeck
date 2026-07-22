import { describe, expect, it, vi } from 'vitest'
import { PressController } from './press-controller'

describe('PressController', () => {
  it('emits exactly one release per pointer', () => {
    const emit = vi.fn()
    const controller = new PressController(emit)
    expect(controller.down(10, 3)).toBe(true)
    expect(controller.down(10, 3)).toBe(false)
    expect(controller.up(10)).toBe(true)
    expect(controller.up(10)).toBe(false)
    expect(emit.mock.calls).toEqual([[3, true], [3, false]])
  })

  it('releases every active pointer on blur or shutdown', () => {
    const emit = vi.fn()
    const controller = new PressController(emit)
    controller.down(1, 2)
    controller.down(2, 7)
    controller.releaseAll()
    expect(emit.mock.calls).toEqual([[2, true], [7, true], [2, false], [7, false]])
  })
})

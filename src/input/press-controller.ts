export class PressController {
  private activePointers = new Map<number, number>()

  constructor(private readonly emit: (buttonIndex: number, pressed: boolean) => void) {}

  down(pointerId: number, buttonIndex: number): boolean {
    if (this.activePointers.has(pointerId)) return false
    this.activePointers.set(pointerId, buttonIndex)
    this.emit(buttonIndex, true)
    return true
  }

  up(pointerId: number): boolean {
    const buttonIndex = this.activePointers.get(pointerId)
    if (buttonIndex === undefined) return false
    this.activePointers.delete(pointerId)
    this.emit(buttonIndex, false)
    return true
  }

  releaseAll(): void {
    const active = [...this.activePointers.entries()]
    this.activePointers.clear()
    active.forEach(([, buttonIndex]) => this.emit(buttonIndex, false))
  }

  isActive(pointerId: number): boolean {
    return this.activePointers.has(pointerId)
  }
}

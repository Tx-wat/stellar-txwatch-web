import { buttonClassName, SIZE_CLASSES, VARIANT_CLASSES } from '@/components/ui/Button'

describe('Button — class names', () => {
  it('defaults to primary / md', () => {
    const cls = buttonClassName()
    expect(cls).toContain(VARIANT_CLASSES.primary)
    expect(cls).toContain(SIZE_CLASSES.md)
  })

  it.each(['primary', 'secondary', 'danger', 'ghost'] as const)('applies the %s variant', (variant) => {
    expect(buttonClassName({ variant })).toContain(VARIANT_CLASSES[variant])
  })

  it.each(['sm', 'md', 'lg'] as const)('applies the %s size', (size) => {
    expect(buttonClassName({ size })).toContain(SIZE_CLASSES[size])
  })

  it('always includes disabled styling', () => {
    expect(buttonClassName()).toContain('disabled:opacity-50')
  })

  it('appends fullWidth and custom classes', () => {
    const cls = buttonClassName({ fullWidth: true, className: 'flex-1' })
    expect(cls).toContain('w-full')
    expect(cls.endsWith('flex-1')).toBe(true)
  })
})

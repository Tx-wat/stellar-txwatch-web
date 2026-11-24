import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Some legacy suites still use Jest's `jest` global while running under Vitest.
Object.assign(globalThis, { jest: vi })

import fs from 'fs'
import path from 'path'
import { STORAGE_KEYS } from '@/lib/storageKeys'

const ROOT = path.resolve(__dirname, '..')
const SOURCE_DIRS = ['app', 'components', 'hooks', 'lib', 'types']
const ALLOWED_FILE = path.join(ROOT, 'lib', 'storageKeys.ts')

function collectSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : collectSourceFiles(full)
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

const files = SOURCE_DIRS.flatMap((dir) => collectSourceFiles(path.join(ROOT, dir))).filter(
  (file) => file !== ALLOWED_FILE
)

describe('storage keys', () => {
  it('has unique key values', () => {
    const values = Object.values(STORAGE_KEYS)
    expect(new Set(values).size).toBe(values.length)
  })

  it.each(Object.entries(STORAGE_KEYS))('%s is only written as a literal in lib/storageKeys.ts', (_, value) => {
    const pattern = new RegExp(`['"\`]${value}['"\`]`)
    const offenders = files.filter((file) => pattern.test(fs.readFileSync(file, 'utf8')))
    expect(offenders.map((file) => path.relative(ROOT, file))).toEqual([])
  })

  it('no source file uses a txwatch-prefixed storage key literal', () => {
    const pattern = /['"`]txwatch[_:][a-z_]+['"`]/
    const offenders = files.filter((file) => pattern.test(fs.readFileSync(file, 'utf8')))
    expect(offenders.map((file) => path.relative(ROOT, file))).toEqual([])
  })
})

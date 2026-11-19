// First-load JS budgets per route (gzipped), checked against `next build` output.
// Each entry sums the chunks shared by every route (runtime, framework,
// common chunks, root layout) with the route's own page chunk.
const CHUNKS = '.next/static/chunks'

const shared = [
  `${CHUNKS}/webpack-*.js`,
  `${CHUNKS}/main-app-*.js`,
  `${CHUNKS}/[0-9]*-*.js`,
  `${CHUNKS}/app/layout-*.js`,
]

const route = (name, page, limit) => ({
  name,
  path: [...shared, `${CHUNKS}/app/${page}-*.js`],
  limit,
})

module.exports = [
  { name: 'Shared by all routes', path: shared, limit: '100 kB' },
  route('/', 'page', '110 kB'),
  route('/dashboard', 'dashboard/page', '120 kB'),
  route('/contracts', 'contracts/page', '120 kB'),
  route('/contracts/new', 'contracts/new/page', '120 kB'),
  route('/contracts/[id]', 'contracts/\\[id\\]/page', '130 kB'),
]

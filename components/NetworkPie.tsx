import { Network } from '@/types'

interface NetworkPieProps {
  data: { network: Network; count: number }[]
}

const SLICE_COLORS: Record<Network, string> = {
  mainnet: '#34d399',
  testnet: '#fbbf24',
  futurenet: '#a78bfa',
}

const RADIUS = 40
const CENTER = 50

function polarPoint(angle: number): [number, number] {
  return [CENTER + RADIUS * Math.cos(angle), CENTER + RADIUS * Math.sin(angle)]
}

/** Dependency-free pie chart with a screen-reader-only data table (#665). */
export default function NetworkPie({ data }: NetworkPieProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  if (total === 0) return null

  // Start at 12 o'clock and sweep clockwise.
  let angle = -Math.PI / 2
  const slices = data.map((item) => {
    const fraction = item.count / total
    const start = angle
    angle += fraction * 2 * Math.PI
    return { ...item, fraction, start, end: angle }
  })

  return (
    <figure className="flex items-center gap-4">
      <svg
        viewBox="0 0 100 100"
        className="h-24 w-24 shrink-0"
        role="img"
        aria-label="Contracts by network"
      >
        {slices.map((slice) =>
          slice.fraction === 1 ? (
            <circle key={slice.network} cx={CENTER} cy={CENTER} r={RADIUS} fill={SLICE_COLORS[slice.network]} />
          ) : (
            <path
              key={slice.network}
              fill={SLICE_COLORS[slice.network]}
              d={(() => {
                const [x1, y1] = polarPoint(slice.start)
                const [x2, y2] = polarPoint(slice.end)
                const largeArc = slice.fraction > 0.5 ? 1 : 0
                return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`
              })()}
            />
          )
        )}
      </svg>
      <table className="sr-only">
        <caption>Contracts by network</caption>
        <thead>
          <tr>
            <th scope="col">Network</th>
            <th scope="col">Contracts</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.network}>
              <td>{item.network}</td>
              <td>{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export function SakuraBackdrop() {
  return (
    <div className="sakura-bg" aria-hidden="true">
      <span className="petal p1" />
      <span className="petal p2" />
      <span className="petal p3" />
      <span className="petal p4" />
      <span className="petal p5" />
      <span className="petal p6" />
      <span className="leaf l1" />
      <span className="leaf l2" />
    </div>
  )
}

export function SakuraBranch() {
  return (
    <svg className="sakura-branch" viewBox="0 0 320 360" role="img" aria-label="Sakura">
      <path
        d="M28 332c42-78 38-132 92-176 34-28 78-52 126-92"
        fill="none"
        stroke="#8d5a48"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M118 168c18 8 28 28 24 48"
        fill="none"
        stroke="#8d5a48"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M168 128c22-2 42 12 48 32"
        fill="none"
        stroke="#8d5a48"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <Leaf x={96} y={196} rotate={-30} />
      <Leaf x={188} y={118} rotate={20} />
      <Leaf x={236} y={78} rotate={-12} />
      <Blossom cx={142} cy={214} scale={1} />
      <Blossom cx={214} cy={156} scale={0.86} />
      <Blossom cx={262} cy={78} scale={0.72} />
      <Blossom cx={92} cy={132} scale={0.62} />
      <Blossom cx={176} cy={246} scale={0.55} />
    </svg>
  )
}

function Leaf({ x, y, rotate }: { x: number; y: number; rotate: number }) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx="16"
      ry="8"
      fill="#7dce8a"
      transform={`rotate(${rotate} ${x} ${y})`}
    />
  )
}

function Blossom({ cx, cy, scale }: { cx: number; cy: number; scale: number }) {
  const petals = [0, 72, 144, 216, 288]
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {petals.map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy="-16"
          rx="9"
          ry="14"
          fill={angle % 144 === 0 ? '#ffd0dc' : '#ff8fa3'}
          transform={`rotate(${angle})`}
        />
      ))}
      <circle cx="0" cy="0" r="5" fill="#ffe08a" />
    </g>
  )
}

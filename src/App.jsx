import { useState } from 'react'

// Simple pass-and-play Ludo (2 players, 1 token each)
// Rules:
// - Roll a 6 to bring token out of base to your start square
// - Move token by dice number along shared 28-tile track
// - Landing on opponent sends them back to base
// - Exact roll not required to enter home in this simplified version
// - Roll of 6 grants another turn

const BOARD_SIZE = 7
// Define a 28-step path around a 7x7 board (avoids corners, loops around)
// Track indices map to x,y on the grid (row, col)
const PATH = [
  // Top row (left -> right) excluding last cell
  [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],
  // Right column (top -> down) excluding last cell
  [1,6],[2,6],[3,6],[4,6],[5,6],
  // Bottom row (right -> left) excluding first cell
  [6,6],[6,5],[6,4],[6,3],[6,2],[6,1],
  // Left column (bottom -> up) excluding first and last cells
  [6,0],[5,0],[4,0],[3,0],[2,0],[1,0],
  // Inner top row (left -> right) small bridge to center area
  [1,1],[1,2],[1,3],[1,4]
]

const START_INDEX = {
  0: 0,   // Player Red starts at PATH[0]
  1: 14   // Player Blue starts opposite at PATH[14]
}

const COLORS = {
  0: {
    name: 'Red',
    bg: 'bg-red-500',
    ring: 'ring-red-400',
    light: 'bg-red-100',
  },
  1: {
    name: 'Blue',
    bg: 'bg-blue-500',
    ring: 'ring-blue-400',
    light: 'bg-blue-100',
  }
}

function Die({ value, onRoll, disabled }) {
  return (
    <button
      onClick={onRoll}
      disabled={disabled}
      className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-bold shadow-md transition-transform active:scale-95 select-none ${disabled ? 'bg-gray-200 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-800'}`}
      aria-label="Roll dice"
    >
      {value ?? '🎲'}
    </button>
  )
}

function Token({ color }) {
  return <div className={`w-5 h-5 rounded-full ${COLORS[color].bg} shadow ring-2 ${COLORS[color].ring}`}></div>
}

function App() {
  // positions: -1 = base, 0.. PATH.length-1 = on track, 999 = home
  const [positions, setPositions] = useState({ 0: -1, 1: -1 })
  const [current, setCurrent] = useState(0) // 0 = Red, 1 = Blue
  const [die, setDie] = useState(null)
  const [message, setMessage] = useState('Welcome! Red starts.')

  const rollDie = () => {
    const val = Math.floor(Math.random() * 6) + 1
    setDie(val)

    const pos = positions[current]

    // Determine possible move
    if (pos === -1) {
      if (val === 6) {
        // Enter board
        const newIndex = START_INDEX[current]
        handleMoveTo(newIndex, val, true)
      } else {
        setMessage(`${COLORS[current].name} needs a 6 to start. Turn passes.`)
        endTurn()
      }
    } else if (pos === 999) {
      setMessage(`${COLORS[current].name} is already home. Turn passes.`)
      endTurn()
    } else {
      // Move along track
      let newIndex = (pos + val) % PATH.length
      // Simple home rule: if crossing your start after full loop, move to home
      // We consider home if from any position, moving would pass over your start and you were already on or past it once.
      // To keep it simple, require exactly landing on your start again to go home.
      if (newIndex === START_INDEX[current] && pos !== -1) {
        handleMoveTo(999, val)
      } else {
        handleMoveTo(newIndex, val)
      }
    }
  }

  const handleMoveTo = (targetIndex, dieVal, starting = false) => {
    setPositions(prev => {
      const updated = { ...prev }
      // Capture logic: if targetIndex is on track and opponent is there, send them to base
      if (targetIndex !== -1 && targetIndex !== 999) {
        const opponent = 1 - current
        if (prev[opponent] === targetIndex) {
          updated[opponent] = -1
          setMessage(`${COLORS[current].name} captured ${COLORS[opponent].name}!`)
        }
      }
      updated[current] = targetIndex
      return updated
    })

    // Win check
    if (targetIndex === 999) {
      setMessage(`${COLORS[current].name} reached home and wins!`)
      return
    }

    // Extra turn on 6 (unless moved to home already handled)
    if (dieVal === 6) {
      setMessage(`${COLORS[current].name} rolled a 6. Go again!`)
      setDie(null)
      return
    }

    // Normal end turn
    endTurn()
    setDie(null)
  }

  const endTurn = () => setCurrent(c => 1 - c)

  const resetGame = () => {
    setPositions({ 0: -1, 1: -1 })
    setCurrent(0)
    setDie(null)
    setMessage('New game! Red starts.')
  }

  const renderCell = (r, c) => {
    // Determine if cell is on path
    const pathIndex = PATH.findIndex(([pr, pc]) => pr === r && pc === c)

    // Center home cell
    const isCenter = r === 3 && c === 3

    // Base areas (top-left for Red, bottom-right for Blue)
    const isRedBase = (r <= 1 && c <= 1)
    const isBlueBase = (r >= 5 && c >= 5)

    let content = null
    let extra = ''

    if (isCenter) {
      // Show home tokens
      content = (
        <div className="flex items-center justify-center gap-2">
          {positions[0] === 999 && <Token color={0} />}
          {positions[1] === 999 && <Token color={1} />}
        </div>
      )
      extra = 'bg-gray-100'
    } else if (pathIndex !== -1) {
      // Show tokens on track
      const redHere = positions[0] === pathIndex
      const blueHere = positions[1] === pathIndex
      content = (
        <div className="relative w-full h-full flex items-center justify-center">
          {redHere && <Token color={0} />}
          {blueHere && <div className="absolute right-1 bottom-1"><Token color={1} /></div>}
        </div>
      )
      extra = 'bg-white'
    } else if (isRedBase || isBlueBase) {
      content = (
        <div className="flex items-center justify-center">
          {(isRedBase && r === 0 && c === 0 && positions[0] === -1) && <Token color={0} />}
          {(isBlueBase && r === 6 && c === 6 && positions[1] === -1) && <Token color={1} />}
        </div>
      )
      extra = isRedBase ? 'bg-red-50' : 'bg-blue-50'
    } else {
      extra = 'bg-gray-50'
    }

    return (
      <div key={`${r}-${c}`} className={`aspect-square border border-gray-200 ${extra} flex items-center justify-center`}> 
        {content}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_auto] gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Ludo (Simple 2-Player)</h1>
            <button onClick={resetGame} className="text-sm px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200">Reset</button>
          </div>

          <div className="grid grid-cols-7 gap-0 rounded-xl overflow-hidden ring-1 ring-gray-200">
            {Array.from({ length: BOARD_SIZE }).map((_, r) => (
              <>
                {Array.from({ length: BOARD_SIZE }).map((_, c) => renderCell(r, c))}
              </>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="bg-white w-full md:w-64 rounded-2xl shadow-lg p-5 flex flex-col items-center">
            <div className="text-sm text-gray-500 mb-2">Current Turn</div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${COLORS[current].light} text-gray-800`}>
                <span className={`w-3 h-3 rounded-full ${COLORS[current].bg}`}></span>
                {COLORS[current].name}
              </span>
            </div>
            <Die value={die} onRoll={rollDie} disabled={positions[current] === 999} />
            <div className="mt-4 text-center text-gray-700 min-h-[2.5rem]">{message}</div>
          </div>

          <div className="bg-white w-full md:w-64 rounded-2xl shadow p-4 text-sm text-gray-600 leading-relaxed">
            <div className="font-semibold text-gray-800 mb-2">How to play</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pass-and-play for 2 players: Red and Blue.</li>
              <li>Roll a 6 to bring your token out.</li>
              <li>Move along the track by the dice number.</li>
              <li>Land on your opponent to send them back to base.</li>
              <li>Reaching your start again sends you home and you win.</li>
              <li>Rolling a 6 grants an extra turn.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, Activity, TrendingUp, Brain, Zap, Network } from "lucide-react";
import { Cell, TrainingMetrics } from "../types/game";
import { NeuralNetwork, boardToInput, getValidMoves } from "../lib/neuralNetwork";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";

const CONFIG = { rows: 9, cols: 9, mines: 10 };
const NUM_VISIBLE_GAMES = 12;

interface GameInstance {
  id: number;
  board: Cell[][];
  gameOver: boolean;
  gameWon: boolean;
  moves: number;
  firstClick: boolean;
}

function createEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );
}

function placeMinesSafe(board: Cell[][], mines: number, safeRow: number, safeCol: number): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  
  let minesPlaced = 0;
  while (minesPlaced < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    
    if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
    if (newBoard[r][c].isMine) continue;
    
    newBoard[r][c].isMine = true;
    minesPlaced++;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!newBoard[r][c].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc].isMine) {
              count++;
            }
          }
        }
        newBoard[r][c].adjacentMines = count;
      }
    }
  }

  return newBoard;
}

function revealCell(board: Cell[][], row: number, col: number): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map(r => r.map(c => ({ ...c })));

  function flood(r: number, c: number) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (newBoard[r][c].isRevealed || newBoard[r][c].isFlagged) return;

    newBoard[r][c].isRevealed = true;

    if (newBoard[r][c].adjacentMines === 0 && !newBoard[r][c].isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          flood(r + dr, c + dc);
        }
      }
    }
  }

  flood(row, col);
  return newBoard;
}

function checkWin(board: Cell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine && !cell.isRevealed) return false;
    }
  }
  return true;
}

// Neural Network Visualization Component
function NetworkVisualization({ network }: { network: NeuralNetwork | null }) {
  if (!network) return null;

  const layers = network.getLayerSizes();
  const maxNeurons = Math.max(...layers);
  const layerSpacing = 120;
  const neuronSpacing = 28;
  const svgWidth = layers.length * layerSpacing + 60;
  const svgHeight = maxNeurons * neuronSpacing + 60;

  // Generate positions for each neuron
  const neuronPositions: { x: number; y: number }[][] = [];
  
  layers.forEach((neuronCount, layerIdx) => {
    const layerPositions: { x: number; y: number }[] = [];
    const startY = (svgHeight - neuronCount * neuronSpacing) / 2;
    
    for (let i = 0; i < neuronCount; i++) {
      layerPositions.push({
        x: layerIdx * layerSpacing + 40,
        y: startY + i * neuronSpacing + 20,
      });
    }
    neuronPositions.push(layerPositions);
  });

  // Sample some connections (not all, for performance)
  const connections: { x1: number; y1: number; x2: number; y2: number; weight: number }[] = [];
  
  for (let l = 0; l < neuronPositions.length - 1; l++) {
    const currentLayer = neuronPositions[l];
    const nextLayer = neuronPositions[l + 1];
    
    // Sample connections
    for (let i = 0; i < currentLayer.length; i++) {
      for (let j = 0; j < nextLayer.length; j++) {
        if (Math.random() < 0.3) { // Only show 30% of connections
          const weight = network.getWeight(l, i, j);
          connections.push({
            x1: currentLayer[i].x,
            y1: currentLayer[i].y,
            x2: nextLayer[j].x,
            y2: nextLayer[j].y,
            weight,
          });
        }
      }
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 overflow-auto">
      <svg width={svgWidth} height={svgHeight} className="mx-auto">
        {/* Connections */}
        {connections.map((conn, idx) => (
          <line
            key={idx}
            x1={conn.x1}
            y1={conn.y1}
            x2={conn.x2}
            y2={conn.y2}
            stroke={conn.weight > 0 ? "rgba(52, 211, 153, 0.3)" : "rgba(248, 113, 113, 0.3)"}
            strokeWidth={Math.abs(conn.weight) * 2 + 0.5}
          />
        ))}
        
        {/* Neurons */}
        {neuronPositions.map((layer, layerIdx) => (
          <g key={layerIdx}>
            {layer.map((neuron, neuronIdx) => (
              <g key={neuronIdx}>
                <circle
                  cx={neuron.x}
                  cy={neuron.y}
                  r={10}
                  fill={layerIdx === 0 ? "rgb(52, 211, 153)" : layerIdx === neuronPositions.length - 1 ? "rgb(167, 139, 250)" : "rgb(100, 116, 139)"}
                  stroke="white"
                  strokeWidth={1}
                  className="transition-all duration-300"
                />
                {layerIdx === 0 && neuronIdx < 3 && (
                  <text
                    x={neuron.x - 16}
                    y={neuron.y + 4}
                    fill="rgb(148, 163, 184)"
                    fontSize="8"
                    textAnchor="end"
                  >
                    {neuronIdx === 0 ? "Cell" : neuronIdx === 1 ? "State" : "..."}
                  </text>
                )}
                {layerIdx === neuronPositions.length - 1 && neuronIdx < 3 && (
                  <text
                    x={neuron.x + 16}
                    y={neuron.y + 4}
                    fill="rgb(148, 163, 184)"
                    fontSize="8"
                    textAnchor="start"
                  >
                    {neuronIdx === 0 ? "Move" : neuronIdx === 1 ? "Score" : "..."}
                  </text>
                )}
              </g>
            ))}
          </g>
        ))}
        
        {/* Layer Labels */}
        {layers.map((_, layerIdx) => (
          <text
            key={layerIdx}
            x={layerIdx * layerSpacing + 40}
            y={svgHeight - 10}
            fill="rgb(148, 163, 184)"
            fontSize="10"
            textAnchor="middle"
          >
            {layerIdx === 0 ? "Input" : layerIdx === layers.length - 1 ? "Output" : `Hidden ${layerIdx}`}
          </text>
        ))}
      </svg>
    </div>
  );
}

// Mini Board Component
function MiniBoard({ game }: { game: GameInstance }) {
  return (
    <div 
      className={`grid gap-px p-1 rounded ${
        game.gameWon ? "bg-emerald-900/50" : game.gameOver ? "bg-red-900/50" : "bg-slate-800"
      }`}
      style={{ gridTemplateColumns: `repeat(${CONFIG.cols}, minmax(0, 1fr))` }}
    >
      {game.board.map((row, rowIdx) =>
        row.map((cell, colIdx) => (
          <div
            key={`${rowIdx}-${colIdx}`}
            className={`w-3 h-3 rounded-sm flex items-center justify-center text-[6px] font-bold ${
              cell.isRevealed
                ? cell.isMine
                  ? "bg-red-500 text-white"
                  : cell.adjacentMines > 0
                    ? "bg-slate-600 text-slate-200"
                    : "bg-slate-700"
                : "bg-slate-600"
            }`}
          >
            {cell.isRevealed && !cell.isMine && cell.adjacentMines > 0 ? cell.adjacentMines : ""}
          </div>
        ))
      )}
    </div>
  );
}

export default function AILab() {
  const [isTraining, setIsTraining] = useState(false);
  const [learningRate, setLearningRate] = useState(0.001);
  const [epsilon, setEpsilon] = useState(0.3);
  const [speed, setSpeed] = useState(10);
  const [metrics, setMetrics] = useState<TrainingMetrics>({
    gamesPlayed: 0,
    gamesWon: 0,
    currentWinRate: 0,
    averageMoves: 0,
    totalMoves: 0,
    recentWins: [],
  });
  const [visibleGames, setVisibleGames] = useState<GameInstance[]>(() =>
    Array.from({ length: NUM_VISIBLE_GAMES }, (_, i) => ({
      id: i,
      board: createEmptyBoard(CONFIG.rows, CONFIG.cols),
      gameOver: false,
      gameWon: false,
      moves: 0,
      firstClick: true,
    }))
  );
  
  const networkRef = useRef<NeuralNetwork | null>(null);
  const trainingRef = useRef<boolean>(false);
  const gamesRef = useRef<GameInstance[]>(visibleGames);

  // Initialize or load network
  useEffect(() => {
    const saved = localStorage.getItem("minesweeper-ai");
    if (saved) {
      try {
        networkRef.current = NeuralNetwork.load(saved);
      } catch {
        networkRef.current = new NeuralNetwork(
          CONFIG.rows * CONFIG.cols,
          [64, 32],
          CONFIG.rows * CONFIG.cols
        );
      }
    } else {
      networkRef.current = new NeuralNetwork(
        CONFIG.rows * CONFIG.cols,
        [64, 32],
        CONFIG.rows * CONFIG.cols
      );
    }
  }, []);

  // Save network periodically
  useEffect(() => {
    if (networkRef.current && metrics.gamesPlayed % 100 === 0 && metrics.gamesPlayed > 0) {
      localStorage.setItem("minesweeper-ai", networkRef.current.save());
    }
  }, [metrics.gamesPlayed]);

  const stepGame = useCallback((game: GameInstance): { game: GameInstance; won: boolean; done: boolean } => {
    if (!networkRef.current || game.gameOver || game.gameWon) {
      return { game, won: false, done: true };
    }

    let newBoard = game.board;
    
    const validMoves = getValidMoves(newBoard);
    if (validMoves.length === 0) {
      return { game: { ...game, gameWon: checkWin(newBoard), gameOver: !checkWin(newBoard) }, won: checkWin(newBoard), done: true };
    }

    const state = boardToInput(newBoard);
    const move = networkRef.current.getAction(validMoves, state, true);
    
    const row = Math.floor(move / CONFIG.cols);
    const col = move % CONFIG.cols;

    if (game.firstClick) {
      newBoard = placeMinesSafe(newBoard, CONFIG.mines, row, col);
    }

    newBoard = revealCell(newBoard, row, col);
    const newMoves = game.moves + 1;

    // Train immediately
    if (newBoard[row][col].isMine) {
      const targetOutput = new Array(CONFIG.rows * CONFIG.cols).fill(0);
      targetOutput[move] = -1;
      networkRef.current!.train(state, targetOutput, -1);
      
      return {
        game: { ...game, board: newBoard, gameOver: true, moves: newMoves, firstClick: false },
        won: false,
        done: true
      };
    } else {
      const gameWon = checkWin(newBoard);
      const targetOutput = new Array(CONFIG.rows * CONFIG.cols).fill(0);
      targetOutput[move] = 1;
      networkRef.current!.train(state, targetOutput, gameWon ? 1 : 0.1);
      
      return {
        game: { ...game, board: newBoard, gameWon, moves: newMoves, firstClick: false },
        won: gameWon,
        done: gameWon
      };
    }
  }, []);

  useEffect(() => {
    if (!isTraining) {
      trainingRef.current = false;
      return;
    }

    trainingRef.current = true;

    const interval = setInterval(() => {
      if (!trainingRef.current) return;

      let wins = 0;
      let totalMoves = 0;
      let gamesFinished = 0;

      // Step all visible games
      const updatedGames = gamesRef.current.map(game => {
        if (game.gameOver || game.gameWon) {
          // Reset finished game
          return {
            id: game.id,
            board: createEmptyBoard(CONFIG.rows, CONFIG.cols),
            gameOver: false,
            gameWon: false,
            moves: 0,
            firstClick: true,
          };
        }
        
        const result = stepGame(game);
        if (result.done) {
          gamesFinished++;
          totalMoves += result.game.moves;
          if (result.won) wins++;
        }
        return result.game;
      });

      gamesRef.current = updatedGames;
      setVisibleGames([...updatedGames]);

      // Also run background games
      for (let i = 0; i < speed - 1; i++) {
        let bgBoard = createEmptyBoard(CONFIG.rows, CONFIG.cols);
        let bgFirstClick = true;
        let bgMoves = 0;
        let bgGameOver = false;
        let bgGameWon = false;

        while (!bgGameOver && !bgGameWon && bgMoves < 200) {
          const validMoves = getValidMoves(bgBoard);
          if (validMoves.length === 0) break;

          const state = boardToInput(bgBoard);
          const move = networkRef.current!.getAction(validMoves, state, true);
          
          const row = Math.floor(move / CONFIG.cols);
          const col = move % CONFIG.cols;

          if (bgFirstClick) {
            bgBoard = placeMinesSafe(bgBoard, CONFIG.mines, row, col);
            bgFirstClick = false;
          }

          bgBoard = revealCell(bgBoard, row, col);
          bgMoves++;

          if (bgBoard[row][col].isMine) {
            bgGameOver = true;
            const targetOutput = new Array(CONFIG.rows * CONFIG.cols).fill(0);
            targetOutput[move] = -1;
            networkRef.current!.train(state, targetOutput, -1);
          } else {
            bgGameWon = checkWin(bgBoard);
            const targetOutput = new Array(CONFIG.rows * CONFIG.cols).fill(0);
            targetOutput[move] = 1;
            networkRef.current!.train(state, targetOutput, bgGameWon ? 1 : 0.1);
          }
        }

        gamesFinished++;
        totalMoves += bgMoves;
        if (bgGameWon) wins++;
      }

      networkRef.current?.decayEpsilon();

      setMetrics(prev => {
        const newRecentWins = [...prev.recentWins, ...Array(gamesFinished).fill(false).map((_, i) => i < wins)].slice(-100);
        const newTotalMoves = prev.totalMoves + totalMoves;
        const newGamesPlayed = prev.gamesPlayed + gamesFinished;
        const newGamesWon = prev.gamesWon + wins;
        
        return {
          gamesPlayed: newGamesPlayed,
          gamesWon: newGamesWon,
          currentWinRate: newRecentWins.length > 0 
            ? newRecentWins.filter(Boolean).length / newRecentWins.length * 100 
            : 0,
          averageMoves: newGamesPlayed > 0 ? newTotalMoves / newGamesPlayed : 0,
          totalMoves: newTotalMoves,
          recentWins: newRecentWins,
        };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isTraining, speed, stepGame]);

  const handleStart = () => {
    if (networkRef.current) {
      networkRef.current.setLearningRate(learningRate);
      networkRef.current.setEpsilon(epsilon);
    }
    setIsTraining(true);
  };

  const handleStop = () => {
    setIsTraining(false);
    if (networkRef.current) {
      localStorage.setItem("minesweeper-ai", networkRef.current.save());
    }
  };

  const handleReset = () => {
    setIsTraining(false);
    networkRef.current = new NeuralNetwork(
      CONFIG.rows * CONFIG.cols,
      [64, 32],
      CONFIG.rows * CONFIG.cols
    );
    localStorage.removeItem("minesweeper-ai");
    setMetrics({
      gamesPlayed: 0,
      gamesWon: 0,
      currentWinRate: 0,
      averageMoves: 0,
      totalMoves: 0,
      recentWins: [],
    });
    const newGames = Array.from({ length: NUM_VISIBLE_GAMES }, (_, i) => ({
      id: i,
      board: createEmptyBoard(CONFIG.rows, CONFIG.cols),
      gameOver: false,
      gameWon: false,
      moves: 0,
      firstClick: true,
    }));
    gamesRef.current = newGames;
    setVisibleGames(newGames);
  };

  const getMoveCounterClass = (game: GameInstance): string => {
    if (game.gameWon) return "bg-emerald-500 text-white";
    if (game.gameOver) return "bg-red-500 text-white";
    return "bg-slate-700 text-slate-300";
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-400" />
            AI Training Controls
          </CardTitle>
          <CardDescription>
            Train a neural network to play Minesweeper using reinforcement learning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {!isTraining ? (
              <Button onClick={handleStart} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900">
                <Play className="w-4 h-4 mr-2" />
                Start Training
              </Button>
            ) : (
              <Button onClick={handleStop} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            )}
            <Button onClick={handleReset} className="bg-slate-700 hover:bg-slate-600 text-slate-300">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset AI
            </Button>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Learning Rate: {learningRate}</label>
              <input
                type="range"
                min="0.0001"
                max="0.01"
                step="0.0001"
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Exploration (ε): {epsilon.toFixed(2)}</label>
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={epsilon}
                onChange={(e) => setEpsilon(parseFloat(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Speed: {speed} games/tick</label>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Games Played</span>
          </div>
          <p className="text-2xl font-bold text-slate-100 font-mono">
            {metrics.gamesPlayed.toLocaleString()}
          </p>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Win Rate</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            {metrics.currentWinRate.toFixed(1)}%
          </p>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Avg Moves</span>
          </div>
          <p className="text-2xl font-bold text-amber-400 font-mono">
            {metrics.averageMoves.toFixed(1)}
          </p>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Brain className="w-4 h-4" />
            <span className="text-sm">Current ε</span>
          </div>
          <p className="text-2xl font-bold text-violet-400 font-mono">
            {networkRef.current?.getEpsilon().toFixed(3) || "0.000"}
          </p>
        </Card>
      </div>

      {/* Training Status */}
      {isTraining && (
        <Card className="bg-violet-500/10 border-violet-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-violet-500 rounded-full animate-pulse" />
            <span className="text-violet-300 font-medium">
              Training in progress... The AI is learning from every game!
            </span>
          </div>
        </Card>
      )}

      {/* Neural Network Visualization */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Network className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-slate-200">Neural Network Architecture</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Watch the neural network's structure and connection weights update in real-time during training.
        </p>
        <NetworkVisualization network={networkRef.current} />
        <div className="flex gap-4 mt-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            <span>Input Layer (81 cells)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500"></div>
            <span>Hidden Layers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-400"></div>
            <span>Output Layer (81 moves)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-emerald-400/50"></div>
            <span>Positive weight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-red-400/50"></div>
            <span>Negative weight</span>
          </div>
        </div>
      </Card>

      {/* Live Game Grid */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Live AI Games</h3>
            <p className="text-sm text-slate-400">Watch 12 AI agents play simultaneously</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-slate-600"></div>
              <span className="text-slate-500">Playing</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500/50"></div>
              <span className="text-slate-500">Won</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500/50"></div>
              <span className="text-slate-500">Lost</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {visibleGames.map((game) => (
            <div key={game.id} className="relative">
              <MiniBoard game={game} />
              <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${getMoveCounterClass(game)}`}>
                {game.moves}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Performance Chart */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Recent Performance (Last 100 Games)</h3>
        <div className="flex gap-1 h-16">
          {metrics.recentWins.slice(-100).map((won, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${won ? "bg-emerald-500" : "bg-red-500/50"}`}
              title={won ? "Win" : "Loss"}
            />
          ))}
          {metrics.recentWins.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              No games played yet
            </div>
          )}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>Oldest</span>
          <span>Most Recent</span>
        </div>
      </Card>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, Activity, TrendingUp, Brain, Zap } from "lucide-react";
import { Cell, TrainingMetrics } from "../types/game";
import { NeuralNetwork, boardToInput, getValidMoves } from "../lib/neuralNetwork";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";

const CONFIG = { rows: 9, cols: 9, mines: 10 };

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
  const [currentBoard, setCurrentBoard] = useState<Cell[][]>(createEmptyBoard(CONFIG.rows, CONFIG.cols));
  const [confidenceMap, setConfidenceMap] = useState<number[]>([]);
  
  const networkRef = useRef<NeuralNetwork | null>(null);
  const trainingRef = useRef<boolean>(false);

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

  const playGame = useCallback((): { won: boolean; moves: number } => {
    if (!networkRef.current) return { won: false, moves: 0 };

    let board = createEmptyBoard(CONFIG.rows, CONFIG.cols);
    let firstClick = true;
    let moves = 0;
    let gameOver = false;
    let gameWon = false;

    while (!gameOver && !gameWon && moves < 200) {
      const validMoves = getValidMoves(board);
      if (validMoves.length === 0) break;

      const state = boardToInput(board);
      const move = networkRef.current.getAction(validMoves, state, true);
      
      const row = Math.floor(move / CONFIG.cols);
      const col = move % CONFIG.cols;

      if (firstClick) {
        board = placeMinesSafe(board, CONFIG.mines, row, col);
        firstClick = false;
      }

      board = revealCell(board, row, col);
      moves++;

      if (board[row][col].isMine) {
        gameOver = true;
        const targetOutput = new Array(CONFIG.rows * CONFIG.cols).fill(0);
        targetOutput[move] = -1;
        networkRef.current.train(state, targetOutput, -1);
      } else {
        gameWon = checkWin(board);
        const targetOutput = new Array(CONFIG.rows * CONFIG.cols).fill(0);
        targetOutput[move] = 1;
        networkRef.current.train(state, targetOutput, gameWon ? 1 : 0.1);
      }
    }

    networkRef.current.decayEpsilon();

    return { won: gameWon, moves };
  }, []);

  useEffect(() => {
    if (!isTraining) {
      trainingRef.current = false;
      return;
    }

    trainingRef.current = true;

    const interval = setInterval(() => {
      if (!trainingRef.current) return;

      const results: { won: boolean; moves: number }[] = [];
      
      for (let i = 0; i < speed; i++) {
        results.push(playGame());
      }

      setMetrics(prev => {
        const newRecentWins = [...prev.recentWins, ...results.map(r => r.won)].slice(-100);
        const totalMoves = prev.totalMoves + results.reduce((sum, r) => sum + r.moves, 0);
        const gamesPlayed = prev.gamesPlayed + results.length;
        const gamesWon = prev.gamesWon + results.filter(r => r.won).length;
        
        return {
          gamesPlayed,
          gamesWon,
          currentWinRate: newRecentWins.length > 0 
            ? newRecentWins.filter(Boolean).length / newRecentWins.length * 100 
            : 0,
          averageMoves: gamesPlayed > 0 ? totalMoves / gamesPlayed : 0,
          totalMoves,
          recentWins: newRecentWins,
        };
      });

      if (results.length > 0) {
        setCurrentBoard(createEmptyBoard(CONFIG.rows, CONFIG.cols));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isTraining, speed, playGame]);

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
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence > 0.7) return "bg-emerald-500";
    if (confidence > 0.5) return "bg-lime-500";
    if (confidence > 0.3) return "bg-amber-500";
    return "bg-red-500";
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

      {/* Board Visualization */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Board Visualization</h3>
        <p className="text-sm text-slate-400 mb-4">
          Watch the AI explore the board. Each cell shows the AI's confidence level for that position.
        </p>
        <div
          className="grid gap-1 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${CONFIG.cols}, minmax(0, 2rem))`,
            width: "fit-content",
          }}
        >
          {currentBoard.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const confidence = confidenceMap[rowIdx * CONFIG.cols + colIdx] || 0.5;
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`w-8 h-8 rounded flex items-center justify-center text-xs font-mono ${
                    cell.isRevealed
                      ? cell.isMine
                        ? "bg-red-500"
                        : "bg-slate-700"
                      : getConfidenceColor(confidence)
                  }`}
                >
                  {cell.isRevealed && !cell.isMine && cell.adjacentMines > 0
                    ? cell.adjacentMines
                    : ""}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

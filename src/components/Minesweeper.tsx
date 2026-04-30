import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Flag, Bomb, Timer, Trophy } from "lucide-react";
import { Cell, GameConfig, Difficulty, DIFFICULTY_CONFIGS } from "../types/game";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface MinesweeperProps {
  difficulty: Difficulty;
}

function createEmptyBoard(config: GameConfig): Cell[][] {
  return Array.from({ length: config.rows }, (_, row) =>
    Array.from({ length: config.cols }, (_, col) => ({
      row,
      col,
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );
}

function placeMines(board: Cell[][], config: GameConfig, safeRow: number, safeCol: number): Cell[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  
  let minesPlaced = 0;
  while (minesPlaced < config.mines) {
    const r = Math.floor(Math.random() * config.rows);
    const c = Math.floor(Math.random() * config.cols);
    
    // Don't place mine on first click or adjacent cells
    if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
    if (newBoard[r][c].isMine) continue;
    
    newBoard[r][c].isMine = true;
    minesPlaced++;
  }

  // Calculate adjacent mines
  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      if (!newBoard[r][c].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols && newBoard[nr][nc].isMine) {
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

function revealCell(board: Cell[][], row: number, col: number, config: GameConfig): Cell[][] {
  const newBoard = board.map(r => r.map(c => ({ ...c })));

  function flood(r: number, c: number) {
    if (r < 0 || r >= config.rows || c < 0 || c >= config.cols) return;
    if (newBoard[r][c].isRevealed || newBoard[r][c].isFlagged || newBoard[r][c].isMine) return;

    newBoard[r][c].isRevealed = true;

    // Only flood if adjacent mines is 0
    if (newBoard[r][c].adjacentMines === 0) {
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

function checkWin(board: Cell[][], config: GameConfig): boolean {
  let revealedCount = 0;
  let totalSafe = 0;
  
  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine) {
        totalSafe++;
        if (cell.isRevealed) revealedCount++;
      }
    }
  }
  
  return revealedCount === totalSafe;
}

function getNumberColor(num: number): string {
  const colors: Record<number, string> = {
    1: "text-blue-400",
    2: "text-green-400",
    3: "text-red-400",
    4: "text-violet-500",
    5: "text-amber-600",
    6: "text-cyan-400",
    7: "text-slate-900",
    8: "text-slate-400",
  };
  return colors[num] || "text-slate-300";
}

export default function Minesweeper({ difficulty }: MinesweeperProps) {
  const config = DIFFICULTY_CONFIGS[difficulty];
  
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard(config));
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [flagCount, setFlagCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [firstClick, setFirstClick] = useState(true);

  // Reset game when difficulty changes
  useEffect(() => {
    resetGame();
  }, [difficulty]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "playing") {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard(config));
    setGameState("idle");
    setFlagCount(0);
    setTimer(0);
    setFirstClick(true);
  }, [config]);

  const handleCellClick = (row: number, col: number) => {
    if (gameState === "won" || gameState === "lost") return;
    if (board[row][col].isFlagged || board[row][col].isRevealed) return;

    let currentBoard = board;

    if (firstClick) {
      currentBoard = placeMines(board, config, row, col);
      setFirstClick(false);
      setGameState("playing");
    }

    const newBoard = revealCell(currentBoard, row, col, config);

    if (newBoard[row][col].isMine) {
      // Game over - reveal all mines and show incorrect flags
      const finalBoard = newBoard.map(r => r.map(c => {
        if (c.isMine) {
          // Reveal all mines
          return { ...c, isRevealed: true };
        } else if (c.isFlagged) {
          // Remove flags from non-mine cells (incorrect flags)
          return { ...c, isFlagged: false };
        }
        return c;
      }));
      setBoard(finalBoard);
      setGameState("lost");
    } else {
      setBoard(newBoard);
      if (checkWin(newBoard, config)) {
        // Reveal all remaining cells on win
        const finalBoard = newBoard.map(r => r.map(c => 
          c.isMine ? c : { ...c, isRevealed: true }
        ));
        setBoard(finalBoard);
        setGameState("won");
      }
    }
  };

  const handleRightClick = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (gameState === "won" || gameState === "lost") return;
    if (board[row][col].isRevealed) return;

    const newBoard = board.map(r => r.map(c => ({ ...c })));
    newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged;
    setBoard(newBoard);
    setFlagCount(prev => newBoard[row][col].isFlagged ? prev + 1 : prev - 1);
  };

  // Handle chord click (reveal adjacent cells if flags match)
  const handleChordClick = (row: number, col: number) => {
    if (gameState === "won" || gameState === "lost") return;
    if (!board[row][col].isRevealed || board[row][col].adjacentMines === 0) return;

    // Count adjacent flags
    let adjacentFlagCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
          if (board[nr][nc].isFlagged) adjacentFlagCount++;
        }
      }
    }

    // If flags match adjacent mines, reveal all non-flagged adjacent cells
    if (adjacentFlagCount === board[row][col].adjacentMines) {
      let newBoard = board.map(r => r.map(c => ({ ...c })));
      let hitMine = false;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
            if (!newBoard[nr][nc].isFlagged && !newBoard[nr][nc].isRevealed) {
              const revealed = revealCell(newBoard, nr, nc, config);
              newBoard = revealed;
              if (newBoard[nr][nc].isMine) {
                hitMine = true;
              }
            }
          }
        }
      }

      if (hitMine) {
        // Game over - reveal all mines and show incorrect flags
        const finalBoard = newBoard.map(r => r.map(c => {
          if (c.isMine) {
            return { ...c, isRevealed: true };
          } else if (c.isFlagged) {
            return { ...c, isFlagged: false };
          }
          return c;
        }));
        setBoard(finalBoard);
        setGameState("lost");
      } else {
        setBoard(newBoard);
        if (checkWin(newBoard, config)) {
          const finalBoard = newBoard.map(r => r.map(c => 
            c.isMine ? c : { ...c, isRevealed: true }
          ));
          setBoard(finalBoard);
          setGameState("won");
        }
      }
    }
  };

  const getCellSize = () => {
    if (difficulty === "beginner") return "w-8 h-8 text-sm";
    if (difficulty === "intermediate") return "w-6 h-6 text-xs";
    return "w-5 h-5 text-[10px]";
  };

  return (
    <div className="space-y-4">
      {/* Game Stats */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Bomb className="w-5 h-5 text-red-400" />
              <span className="text-xl font-mono font-bold text-slate-200">
                {Math.max(0, config.mines - flagCount).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-cyan-400" />
              <span className="text-xl font-mono font-bold text-slate-200">
                {Math.min(999, timer).toString().padStart(3, "0")}
              </span>
            </div>
          </div>
          
          <Button onClick={resetGame} className="bg-slate-700 hover:bg-slate-600 text-slate-200">
            <RotateCcw className="w-4 h-4 mr-2" />
            New Game
          </Button>

          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-400" />
            <span className="text-xl font-mono font-bold text-slate-200">{flagCount}</span>
          </div>
        </div>
      </Card>

      {/* Game Status */}
      {(gameState === "won" || gameState === "lost") && (
        <Card className={`p-4 ${gameState === "won" ? "bg-emerald-500/20 border-emerald-500" : "bg-red-500/20 border-red-500"}`}>
          <div className="flex items-center justify-center gap-3">
            {gameState === "won" ? (
              <>
                <Trophy className="w-6 h-6 text-amber-400" />
                <span className="text-xl font-bold text-emerald-400">You Win!</span>
                <span className="text-slate-400">Time: {timer}s</span>
              </>
            ) : (
              <>
                <Bomb className="w-6 h-6 text-red-400" />
                <span className="text-xl font-bold text-red-400">Game Over!</span>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Game Board */}
      <Card className="bg-slate-900 border-slate-800 p-4 overflow-x-auto">
        <div 
          className="grid gap-px mx-auto"
          style={{ 
            gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
            width: difficulty === "expert" ? "max-content" : "fit-content",
            minWidth: difficulty === "expert" ? "100%" : "auto"
          }}
        >
          {board.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <button
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleCellClick(rowIdx, colIdx)}
                onContextMenu={(e) => handleRightClick(e, rowIdx, colIdx)}
                onDoubleClick={() => handleChordClick(rowIdx, colIdx)}
                disabled={gameState === "won" || gameState === "lost"}
                className={`${getCellSize()} rounded-sm flex items-center justify-center font-bold transition-all ${
                  cell.isRevealed
                    ? cell.isMine
                      ? "bg-red-500 text-white"
                      : "bg-slate-700 border border-slate-600"
                    : cell.isFlagged
                      ? "bg-amber-500/30 hover:bg-amber-500/40"
                      : "bg-slate-600 hover:bg-slate-500"
                } ${cell.isRevealed && !cell.isMine ? getNumberColor(cell.adjacentMines) : ""}`}
              >
                {cell.isRevealed ? (
                  cell.isMine ? (
                    <Bomb className="w-4 h-4" />
                  ) : cell.adjacentMines > 0 ? (
                    cell.adjacentMines
                  ) : null
                ) : cell.isFlagged ? (
                  <Flag className="w-3 h-3 text-amber-400" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">How to Play</h3>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• <strong>Left-click</strong> to reveal a cell</li>
          <li>• <strong>Right-click</strong> to place/remove a flag</li>
          <li>• <strong>Double-click</strong> on revealed number to chord (reveal adjacent cells if flags match)</li>
          <li>• Numbers show adjacent mines (0-8)</li>
          <li>• First click is always safe!</li>
        </ul>
      </Card>
    </div>
  );
}

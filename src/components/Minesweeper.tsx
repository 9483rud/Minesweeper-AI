import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Flag, Bomb, Clock } from "lucide-react";
import { Cell, GameState, GameConfig } from "../types/game";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const DIFFICULTIES: Record<string, GameConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

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

function placeMines(board: Cell[][], mines: number, safeRow: number, safeCol: number): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  
  let minesPlaced = 0;
  while (minesPlaced < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    
    // Don't place mine on safe cell or its neighbors
    if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
    if (newBoard[r][c].isMine) continue;
    
    newBoard[r][c].isMine = true;
    minesPlaced++;
  }

  // Calculate adjacent mines
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

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTIES>("beginner");
  const [gameState, setGameState] = useState<GameState>(() => ({
    board: createEmptyBoard(DIFFICULTIES[difficulty].rows, DIFFICULTIES[difficulty].cols),
    gameOver: false,
    gameWon: false,
    minesCount: DIFFICULTIES[difficulty].mines,
    flagsPlaced: 0,
    firstClick: true,
    startTime: null,
    elapsedTime: 0,
  }));

  const config = DIFFICULTIES[difficulty];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.startTime && !gameState.gameOver && !gameState.gameWon) {
      interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          elapsedTime: Math.floor((Date.now() - (prev.startTime || 0)) / 1000),
        }));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameState.startTime, gameState.gameOver, gameState.gameWon]);

  const resetGame = useCallback(() => {
    setGameState({
      board: createEmptyBoard(config.rows, config.cols),
      gameOver: false,
      gameWon: false,
      minesCount: config.mines,
      flagsPlaced: 0,
      firstClick: true,
      startTime: null,
      elapsedTime: 0,
    });
  }, [config]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState.gameOver || gameState.gameWon) return;
    const cell = gameState.board[row][col];
    if (cell.isRevealed || cell.isFlagged) return;

    let newBoard = gameState.board;

    if (gameState.firstClick) {
      newBoard = placeMines(gameState.board, config.mines, row, col);
      setGameState(prev => ({ ...prev, firstClick: false, startTime: Date.now() }));
    }

    newBoard = revealCell(newBoard, row, col);

    if (newBoard[row][col].isMine) {
      // Reveal all mines on game over
      newBoard = newBoard.map(r => r.map(c => ({
        ...c,
        isRevealed: c.isMine ? true : c.isRevealed
      })));
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        gameOver: true,
      }));
    } else {
      const won = checkWin(newBoard);
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        gameWon: won,
      }));
    }
  }, [gameState, config.mines]);

  const handleRightClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (gameState.gameOver || gameState.gameWon) return;
    const cell = gameState.board[row][col];
    if (cell.isRevealed) return;

    const newBoard = gameState.board.map(r => r.map(c => ({ ...c })));
    newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged;

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      flagsPlaced: prev.flagsPlaced + (newBoard[row][col].isFlagged ? 1 : -1),
    }));
  }, [gameState]);

  const getNumberColor = (num: number): string => {
    const colors: Record<number, string> = {
      1: "text-blue-400",
      2: "text-green-400",
      3: "text-red-400",
      4: "text-violet-400",
      5: "text-amber-600",
      6: "text-cyan-400",
      7: "text-slate-900",
      8: "text-slate-400",
    };
    return colors[num] || "text-slate-300";
  };

  return (
    <div className="space-y-6">
      {/* Difficulty Selector */}
      <div className="flex items-center justify-center gap-2">
        {Object.keys(DIFFICULTIES).map((diff) => (
          <button
            key={diff}
            onClick={() => {
              setDifficulty(diff as keyof typeof DIFFICULTIES);
              resetGame();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              difficulty === diff
                ? "bg-emerald-500 text-slate-900"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </button>
        ))}
      </div>

      {/* Game Stats */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Bomb className="w-5 h-5 text-red-400" />
            <span className="font-mono text-lg">
              {String(gameState.minesCount - gameState.flagsPlaced).padStart(2, "0")}
            </span>
          </div>

          <Button
            onClick={resetGame}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            New Game
          </Button>

          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-5 h-5" />
            <span className="font-mono text-lg">
              {String(Math.floor(gameState.elapsedTime / 60)).padStart(2, "0")}:
              {String(gameState.elapsedTime % 60).padStart(2, "0")}
            </span>
          </div>
        </div>
      </Card>

      {/* Game Board */}
      <Card className="bg-slate-900 border-slate-800 p-4 overflow-x-auto">
        <div
          className="grid gap-1 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${config.cols}, minmax(0, 2rem))`,
            width: "fit-content",
          }}
        >
          {gameState.board.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <button
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleCellClick(rowIdx, colIdx)}
                onContextMenu={(e) => handleRightClick(e, rowIdx, colIdx)}
                disabled={gameState.gameOver || gameState.gameWon}
                className={`
                  w-8 h-8 flex items-center justify-center rounded font-bold text-sm
                  transition-all duration-150 select-none
                  ${cell.isRevealed
                    ? cell.isMine
                      ? "bg-red-500 text-white"
                      : "bg-slate-800"
                    : cell.isFlagged
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-slate-700 hover:bg-slate-600 border border-slate-600"
                  }
                  ${!cell.isRevealed && !gameState.gameOver && !gameState.gameWon
                    ? "cursor-pointer active:scale-95"
                    : "cursor-default"
                  }
                `}
              >
                {cell.isRevealed ? (
                  cell.isMine ? (
                    <Bomb className="w-4 h-4" />
                  ) : cell.adjacentMines > 0 ? (
                    <span className={getNumberColor(cell.adjacentMines)}>
                      {cell.adjacentMines}
                    </span>
                  ) : null
                ) : cell.isFlagged ? (
                  <Flag className="w-4 h-4" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Game Status */}
      {(gameState.gameOver || gameState.gameWon) && (
        <div className={`text-center p-4 rounded-lg ${
          gameState.gameWon
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-red-500/20 text-red-400"
        }`}>
          <p className="text-xl font-bold">
            {gameState.gameWon ? "🎉 You Win!" : "💥 Game Over!"}
          </p>
          <p className="text-sm mt-1 opacity-75">
            {gameState.gameWon
              ? `Completed in ${gameState.elapsedTime} seconds!`
              : "You hit a mine!"}
          </p>
        </div>
      )}
    </div>
  );
}

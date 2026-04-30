export interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

export interface GameConfig {
  rows: number;
  cols: number;
  mines: number;
}

export type Difficulty = "beginner" | "intermediate" | "expert";

export const DIFFICULTY_CONFIGS: Record<Difficulty, GameConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

export interface TrainingMetrics {
  gamesPlayed: number;
  gamesWon: number;
  currentWinRate: number;
  averageMoves: number;
  totalMoves: number;
  recentWins: boolean[];
}

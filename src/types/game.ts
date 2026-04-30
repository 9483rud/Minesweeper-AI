export interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

export interface GameState {
  board: Cell[][];
  gameOver: boolean;
  gameWon: boolean;
  minesCount: number;
  flagsPlaced: number;
  firstClick: boolean;
  startTime: number | null;
  elapsedTime: number;
}

export interface GameConfig {
  rows: number;
  cols: number;
  mines: number;
}

export interface TrainingMetrics {
  gamesPlayed: number;
  gamesWon: number;
  currentWinRate: number;
  averageMoves: number;
  totalMoves: number;
  recentWins: boolean[];
}

export interface NeuralNetworkConfig {
  learningRate: number;
  epsilon: number;
  epsilonDecay: number;
  hiddenLayers: number[];
}

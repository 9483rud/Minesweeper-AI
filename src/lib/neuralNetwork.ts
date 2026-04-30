import { Cell } from "../types/game";

interface Layer {
  weights: number[][];
  biases: number[];
}

export class NeuralNetwork {
  private layers: Layer[] = [];
  private learningRate: number = 0.001;
  private epsilon: number = 0.3;
  private epsilonDecay: number = 0.9995;
  private minEpsilon: number = 0.01;

  constructor(inputSize: number, hiddenSizes: number[], outputSize: number) {
    // Initialize layers
    let prevSize = inputSize;
    
    for (const size of hiddenSizes) {
      this.layers.push({
        weights: this.randomMatrix(prevSize, size),
        biases: this.randomArray(size)
      });
      prevSize = size;
    }
    
    this.layers.push({
      weights: this.randomMatrix(prevSize, outputSize),
      biases: this.randomArray(outputSize)
    });
  }

  private randomMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() - 0.5) * 0.5)
    );
  }

  private randomArray(size: number): number[] {
    return Array.from({ length: size }, () => (Math.random() - 0.5) * 0.5);
  }

  private relu(x: number): number {
    return Math.max(0, x);
  }

  private reluDerivative(x: number): number {
    return x > 0 ? 1 : 0;
  }

  private softmax(arr: number[]): number[] {
    const max = Math.max(...arr);
    const exp = arr.map(x => Math.exp(x - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(x => x / sum);
  }

  forward(input: number[]): { output: number[]; activations: number[][] } {
    const activations: number[][] = [input];
    let current = input;

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const next: number[] = [];

      for (let j = 0; j < layer.biases.length; j++) {
        let sum = layer.biases[j];
        for (let k = 0; k < current.length; k++) {
          sum += current[k] * layer.weights[k][j];
        }
        // Apply ReLU for hidden layers, linear for output
        next.push(i < this.layers.length - 1 ? this.relu(sum) : sum);
      }

      current = next;
      activations.push(current);
    }

    // Apply softmax to output
    current = this.softmax(current);
    activations[activations.length - 1] = current;

    return { output: current, activations };
  }

  train(input: number[], targetOutput: number[], reward: number): void {
    const { output, activations } = this.forward(input);
    
    // Backpropagation with reward scaling
    const scaledReward = Math.tanh(reward);
    
    let gradients = output.map((o, i) => (o - targetOutput[i]) * scaledReward);

    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      const prevActivation = activations[i];
      const newGradients: number[] = new Array(prevActivation.length).fill(0);

      for (let j = 0; j < layer.biases.length; j++) {
        const gradient = gradients[j];
        layer.biases[j] -= this.learningRate * gradient;

        for (let k = 0; k < prevActivation.length; k++) {
          layer.weights[k][j] -= this.learningRate * gradient * prevActivation[k];
          if (i > 0) {
            newGradients[k] += gradient * layer.weights[k][j] * this.reluDerivative(activations[i][k]);
          }
        }
      }

      if (i > 0) {
        gradients = newGradients;
      }
    }
  }

  getAction(validMoves: number[], state: number[], exploration: boolean = true): number {
    // Epsilon-greedy exploration
    if (exploration && Math.random() < this.epsilon) {
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    const { output } = this.forward(state);
    
    // Filter to valid moves and find best
    let bestMove = validMoves[0];
    let bestScore = output[bestMove];
    
    for (const move of validMoves) {
      if (output[move] > bestScore) {
        bestScore = output[move];
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  decayEpsilon(): void {
    this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
  }

  setLearningRate(rate: number): void {
    this.learningRate = rate;
  }

  setEpsilon(eps: number): void {
    this.epsilon = eps;
  }

  getEpsilon(): number {
    return this.epsilon;
  }

  getConfidence(state: number[]): number[] {
    const { output } = this.forward(state);
    return output;
  }

  save(): string {
    return JSON.stringify({
      layers: this.layers,
      epsilon: this.epsilon
    });
  }

  static load(data: string): NeuralNetwork {
    const parsed = JSON.parse(data);
    const nn = new NeuralNetwork(1, [], 1); // Placeholder
    nn.layers = parsed.layers;
    nn.epsilon = parsed.epsilon;
    return nn;
  }
}

// Helper function to convert board state to neural network input
export function boardToInput(board: Cell[][]): number[] {
  const input: number[] = [];
  const rows = board.length;
  const cols = board[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      
      if (cell.isRevealed) {
        if (cell.isMine) {
          input.push(-1); // Mine
        } else {
          // Normalize adjacent mines count
          input.push(cell.adjacentMines / 8);
        }
      } else if (cell.isFlagged) {
        input.push(-0.5); // Flagged
      } else {
        input.push(0.5); // Hidden
      }
    }
  }

  return input;
}

// Get valid moves (hidden, unflagged cells)
export function getValidMoves(board: Cell[][]): number[] {
  const moves: number[] = [];
  const rows = board.length;
  const cols = board[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (!cell.isRevealed && !cell.isFlagged) {
        moves.push(r * cols + c);
      }
    }
  }

  return moves;
}

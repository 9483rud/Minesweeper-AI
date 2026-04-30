# Minesweeper AI

An intelligent agent that plays Minesweeper using propositional logic. This AI represents its knowledge through logical sentences to make inferences, allowing it to determine which cells are safe and which contain mines with high accuracy.

## 🚀 How it Works
Unlike a simple random-guess bot, this AI uses a **Knowledge-Based Agent** approach:
- **Knowledge Representation:** The AI tracks "Sentences" consisting of a set of cells and a count of how many mines are in that set.
- **Inference:** By comparing sentences, the AI can deduce new information. For example, if it knows `{A, B, C} = 1` and `{A, B} = 1`, it can infer that `C` must be safe.
- **Decision Making:** The AI identifies "Safe" cells to move to next. If no safe moves are known, it makes a random move from the remaining tiles (avoiding known mines).

## 🛠 Features
- **Interactive UI:** Play the game yourself or let the AI take over.
- **AI Move Button:** Click to let the AI make the next logically sound move.
- **Autoplay:** Watch the AI solve the board in real-time.
- **Logic Engine:** Handles complex inferences beyond simple neighbor checks.

## 📋 Prerequisites
To run this project, you need Python 3 and the `pygame` library installed.

```bash
pip install pygame
```

## 💻 Getting Started
1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd Minesweeper-AI
   ```

2. **Run the game:**
   ```bash
   python runner.py
   ```

## 📂 Project Structure
- `runner.py`: Handles the graphical interface and game loop using Pygame.
- `minesweeper.py`: Contains the core logic:
    - `Minesweeper`: The game engine that handles board state.
    - `Sentence`: A logical statement about a set of cells.
    - `MinesweeperAI`: The agent that tracks knowledge and makes moves.

## 🤝 Acknowledgments
This project is inspired by the CS50’s Introduction to Artificial Intelligence with Python curriculum, focusing on knowledge-based agents.

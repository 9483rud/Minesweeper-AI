import { useState } from "react";
import { Gamepad2, Brain } from "lucide-react";
import Minesweeper from "./components/Minesweeper";
import AILab from "./components/AILab";
import { Difficulty } from "./types/game";

export default function App() {
  const [activeTab, setActiveTab] = useState<"game" | "ai">("game");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              MineSweeper AI Trainer
            </h1>
            
            {/* Tab Navigation */}
            <nav className="flex gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("game")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "game"
                    ? "bg-violet-500 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                Play Game
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "ai"
                    ? "bg-violet-500 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                }`}
              >
                <Brain className="w-4 h-4" />
                AI Lab
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Difficulty Selector */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">Difficulty:</span>
          <div className="flex gap-2">
            {(["beginner", "intermediate", "expert"] as Difficulty[]).map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  difficulty === diff
                    ? "bg-cyan-500 text-slate-900"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 ml-4">
            {difficulty === "beginner" && "9×9 • 10 mines"}
            {difficulty === "intermediate" && "16×16 • 40 mines"}
            {difficulty === "expert" && "30×16 • 99 mines"}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {activeTab === "game" ? (
          <Minesweeper difficulty={difficulty} />
        ) : (
          <AILab difficulty={difficulty} />
        )}
      </main>
    </div>
  );
}

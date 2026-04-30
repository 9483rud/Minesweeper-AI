import { useState } from "react";
import { Gamepad2, Brain } from "lucide-react";
import Minesweeper from "./components/Minesweeper";
import AILab from "./components/AILab";

export default function App() {
  const [activeTab, setActiveTab] = useState<"game" | "ai">("game");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-emerald-400">Mine</span>
              <span className="text-slate-300">Sweeper</span>
              <span className="text-violet-400 ml-2">AI</span>
            </h1>
            
            {/* Tab Navigation */}
            <nav className="flex gap-2">
              <button
                onClick={() => setActiveTab("game")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === "game"
                    ? "bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                Play
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === "ai"
                    ? "bg-violet-500 text-slate-900 shadow-lg shadow-violet-500/20"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                <Brain className="w-4 h-4" />
                AI Lab
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === "game" && <Minesweeper />}
        {activeTab === "ai" && <AILab />}
      </main>
    </div>
  );
}

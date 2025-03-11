"use client";

import { useState, useEffect, useRef } from "react";

const GRID_SIZE = 4;
const GAME_DURATION = 60;
const CELL_SIZE = 64;
const POINTS_PER_WORD = 10;

// Fetch word list from an API
async function fetchWordList(): Promise<Set<string>> {
  const res = await fetch(
    "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"
  );
  const text = await res.text();
  return new Set(text.split("\n")
			.filter((word) => word.length >= 3)
		 .map((word) => word.trim().toUpperCase()));
}

// Generate a random letter grid
function generateGrid() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () =>
      letters[Math.floor(Math.random() * letters.length)]
    )
  );
}

export default function WordHunt() {
const [grid, setGrid] = useState<string[][]>([]);
  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [wordList, setWordList] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const isDragging = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setGrid(generateGrid());
    fetchWordList().then(setWordList);

    // Prevent scrolling on mobile while playing
    const preventScroll = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      document.removeEventListener("touchmove", preventScroll);
    };
  }, []);

  useEffect(() => {
    if (gameStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    
    if (timeLeft <= 0) {
      setGameOver(true);
      clearInterval(timerRef.current!);
    }

    return () => clearInterval(timerRef.current!);
  }, [gameStarted, timeLeft]);

  const handleStart = (row: number, col: number) => {
    if (!gameStarted) {
      setGameStarted(true);
    }

    if (gameOver) return;
    isDragging.current = true;
    setSelectedCells([[row, col]]);
    setCurrentWord(grid[row][col]);
    drawLine([[row, col]]);
  };

  const handleMove = (row: number, col: number) => {
    if (!isDragging.current || gameOver) return;
    if (selectedCells.some(([r, c]) => r === row && c === col)) return;

    setSelectedCells([...selectedCells, [row, col]]);
    setCurrentWord((prev) => prev + grid[row][col]);
    drawLine([...selectedCells, [row, col]]);
  };

  const handleEnd = () => {
    isDragging.current = false;
    if (wordList.has(currentWord)) {
      if (!foundWords.has(currentWord)) {
        setFoundWords((prev) => new Set([...prev, currentWord]));
        setScore((prev) => prev + POINTS_PER_WORD);
      }
    }
    setSelectedCells([]);
    setCurrentWord("");
    clearCanvas();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current || gameOver) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

	if (element instanceof HTMLElement) {
	  const row = Number(element.dataset.row);
	  const col = Number(element.dataset.col);
	  if (Number.isInteger(row) && Number.isInteger(col)) {
		handleMove(row, col);
	  };
	}
  }

  const drawLine = (cells: [number, number][]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    ctx.beginPath();
    cells.forEach(([row, col], index) => {
      const x = col * CELL_SIZE + CELL_SIZE / 2;
      const y = row * CELL_SIZE + CELL_SIZE / 2;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const restartGame = () => {
    setGrid(generateGrid());
    setFoundWords(new Set());
    setScore(0);
    setGameStarted(false);
    setGameOver(false);
    setTimeLeft(GAME_DURATION);
  }; 

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white overflow-hidden">
      <h1 className="text-3xl font-bold mb-4">Word Hunt</h1>

      {/* Score Counter */}


      {gameOver ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500">Time’s Up!</h2>
          <p className="text-xl mt-2">You found {foundWords.size} words!</p>
          <p className="text-xl font-bold">Final Score: {score}</p>
          <ul className="mt-2">
            {Array.from(foundWords).map((word) => (
              <li key={word} className="text-green-400">{word}</li>
            ))}
          </ul>
          <button 
            className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg"
            onClick={restartGame}
          >
            Play Again
          </button>
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold mb-4">
            Time Left:{" "}
            <span className={`${timeLeft <= 10 ? "text-red-500" : "text-white"}`}>
              {timeLeft}s
            </span>
          </div>

          {!gameStarted && <p className="text-lg text-gray-400">Tap a letter to start!</p>}

          <div className="relative">
	  <div 
              className="grid grid-cols-4 gap-2 relative"
              onTouchMove={handleTouchMove}
              onTouchEnd={handleEnd}
            >
              {grid.map((row, rowIndex) =>
                row.map((letter, colIndex) => {
                  const isSelected = selectedCells.some(
                    ([r, c]) => r === rowIndex && c === colIndex
                  );
                  const wordExists = foundWords.has(currentWord);
                const isGreen = wordList.has(currentWord) && !wordExists && currentWord.length >= 3;
                const isYellow = wordExists && currentWord.length >= 3;

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`w-16 h-16 flex items-center justify-center border-2 border-gray-300 text-2xl font-bold cursor-pointer select-none relative z-10
                        ${isGreen && isSelected ? "bg-green-500 text-white" : isYellow && isSelected ? "bg-yellow-500 text-black" : isSelected ? "bg-blue-500 text-white" : "bg-gray-700"}`}
                    onMouseDown={() => handleStart(rowIndex, colIndex)}
                    onMouseEnter={() => handleMove(rowIndex, colIndex)}
                    onMouseUp={handleEnd}
                    onTouchStart={() => handleStart(rowIndex, colIndex)}
                    data-row={rowIndex}
                    data-col={colIndex} 
                    >
                      {letter}
                    </div>
                  );
                })
              )}
            </div>
            <canvas ref={canvasRef} className="absolute top-0 left-0 z-0 pointer-events-none" width={GRID_SIZE * CELL_SIZE} height={GRID_SIZE * CELL_SIZE} />
          </div>
        </>
      )}
    </div>
  );
}

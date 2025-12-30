import React, { useState, useEffect, useRef } from "react";

const playSound = (type) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === "bang") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);

    const noiseBufferSize = ctx.sampleRate * 0.5;
    const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 1000;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseGain.gain.setValueAtTime(1, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    noise.start();
  } else if (type === "click") {
    osc.type = "square";
    osc.frequency.setValueAtTime(1500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }
};

const tensionShuffle = (array) => {
  if (Math.random() > 0.1) {
    const bullets = array.filter((b) => b);
    const empties = array.filter((b) => !b);
    const result = [];

    for (let i = 0; i < 6; i++) {
      const isEarlyRound = i < 3;
      const preferSafe = isEarlyRound && Math.random() > 0.15;

      let pickSafe = false;
      if (preferSafe && empties.length > 0) pickSafe = true;
      else if (bullets.length === 0) pickSafe = true;
      else if (empties.length === 0) pickSafe = false;
      else pickSafe = Math.random() > 0.5;

      if (pickSafe) result.push(empties.shift());
      else result.push(bullets.shift());
    }
    return result;
  }
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const App = () => {
  const [bulletCount, setBulletCount] = useState(1);
  const [chambers, setChambers] = useState([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [flashDanger, setFlashDanger] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [recoilEffect, setRecoilEffect] = useState(false);
  const [statusMessage, setStatusMessage] = useState("TABLE READY");

  const shakeTimeoutRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const recoilTimeoutRef = useRef(null);

  const initGame = () => {
    let newChambers = Array(6).fill(false);
    for (let i = 0; i < bulletCount; i++) {
      newChambers[i] = true;
    }
    newChambers = tensionShuffle(newChambers);

    setChambers(newChambers);
    setCurrentIndex(0);
    setShotsTaken(0);
    setGameStarted(true);
    setGameOver(false);
    setResult(null);
    setFlashDanger(false);
    setShakeScreen(false);
    setRecoilEffect(false);
    setStatusMessage("TABLE READY");
  };

  const handleTrigger = () => {
    if (gameOver) return;

    const isBullet = chambers[currentIndex];
    const nextIndex = (currentIndex + 1) % 6;

    if (isBullet) {
      playSound("bang");
      setResult("LOSS");
      setGameOver(true);
      setStatusMessage("FATAL");
      setFlashDanger(true);
      setShakeScreen(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      clearTimeout(shakeTimeoutRef.current);
      clearTimeout(flashTimeoutRef.current);
      shakeTimeoutRef.current = setTimeout(() => setShakeScreen(false), 500);
      flashTimeoutRef.current = setTimeout(() => setFlashDanger(false), 500);
    } else {
      playSound("click");
      setResult("SAFE");
      setStatusMessage("*CLICK*");
      setShotsTaken((prev) => prev + 1);
      setCurrentIndex(nextIndex);

      setRecoilEffect(true);
      if (navigator.vibrate) navigator.vibrate(50);
      clearTimeout(recoilTimeoutRef.current);
      recoilTimeoutRef.current = setTimeout(() => setRecoilEffect(false), 100);

      if (shotsTaken + 1 >= 6) {
        setGameOver(true);
        setResult("SURVIVED");
        setStatusMessage("SURVIVED THE TABLE");
      }
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setResult(null);
    setShotsTaken(0);
    setFlashDanger(false);
    setShakeScreen(false);
    setRecoilEffect(false);
    setStatusMessage("READY TO PLAY");
  };

  const [showPreloader, setShowPreloader] = useState(true);

  const enterGame = () => {
    playSound("click");
    setShowPreloader(false);
  };

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      @keyframes shake {
        0% { transform: translate(1px, 1px) rotate(0deg); }
        10% { transform: translate(-1px, -2px) rotate(-1deg); }
        20% { transform: translate(-3px, 0px) rotate(1deg); }
        30% { transform: translate(3px, 2px) rotate(0deg); }
        40% { transform: translate(1px, -1px) rotate(1deg); }
        50% { transform: translate(-1px, 2px) rotate(-1deg); }
        60% { transform: translate(-3px, 1px) rotate(0deg); }
        70% { transform: translate(3px, 1px) rotate(-1deg); }
        80% { transform: translate(-1px, -1px) rotate(1deg); }
        90% { transform: translate(1px, 2px) rotate(0deg); }
        100% { transform: translate(1px, -2px) rotate(-1deg); }
      }
    `;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  const containerBgClass =
    result === "LOSS"
      ? "bg-[radial-gradient(circle_at_center,_#2a0a0a_0%,_#000000_100%)]"
      : "bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#020617_120%)]";

  const contentTransform = shakeScreen
    ? "translate3d(-5px, 0, 0)"
    : recoilEffect
    ? "translate3d(0, -10px, 0)"
    : "none";
  const contentAnimation = shakeScreen
    ? "shake 0.3s cubic-bezier(.36,.07,.19,.97) both"
    : "none";

  return (
    <>
      {showPreloader && (
        <div className="fixed inset-0 z-2000 flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-500 pointer-events-auto">
          <img
            src="/logo.jpg"
            alt="Liar's Bar Logo"
            className="mb-10 h-[min(150px,30vmin)] w-[min(150px,30vmin)] animate-[shake_10s_infinite] rounded-full border-4 border-slate-700 object-cover shadow-[0_0_30px_rgba(0,0,0,0.8)]"
          />
          <h1 className="mb-10 text-center font-['Courier_New'] text-[clamp(1.5rem,6vw,2.5rem)] font-black leading-[1.1] tracking-wider text-slate-100 uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            LIAR'S BAR
            <br />
            ROULETTE
          </h1>
          <button
            onClick={enterGame}
            className="cursor-pointer border-2 border-slate-200 bg-transparent px-10 py-4 font-['Courier_New'] text-xl font-bold tracking-[4px] text-slate-200 uppercase shadow-[0_0_15px_rgba(226,232,240,0.1)] transition-all duration-200"
          >
            ENTER BAR
          </button>
        </div>
      )}

      <div
        className={`pointer-events-none fixed inset-0 z-9991 bg-red-600 mix-blend-multiply transition-opacity duration-75 ease-out ${
          flashDanger ? "opacity-60" : "opacity-0"
        }`}
      />

      <div className="pointer-events-none fixed inset-0 z-5 bg-[radial-gradient(circle,transparent_40%,#000_120%)]" />

      <div
        className={`fixed inset-0 flex h-dvh w-full flex-col justify-between overflow-hidden px-5 pb-[max(15px,env(safe-area-inset-bottom))] pt-[max(15px,env(safe-area-inset-top))] transition-[background] duration-200 ease-in box-border font-['Courier_New'] text-slate-300 ${containerBgClass}`}
      >
        <div
          style={{
            transform: contentTransform,
            animation: contentAnimation,
            transition: "transform 0.05s ease-out",
          }}
          className="mx-auto flex h-full w-full max-w-[480px] flex-1 flex-col justify-between"
        >
          <div className="z-10 mb-2.5 w-full shrink-0 border-b border-slate-700/50 pb-2.5 text-center">
            <h1 className="m-0 text-[clamp(1.2rem,5vw,2rem)] font-black leading-[1.1] tracking-[min(5px,1.5vw)] text-slate-100 uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              LIAR'S BAR
              <br />
              <span className="text-[0.5em] tracking-widest text-slate-400">
                RUSSIAN ROULETTE
              </span>
            </h1>
          </div>

          <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center">
            <div
              style={{
                width: "min(280px, 60vw, 35vh)",
                height: "min(280px, 60vw, 35vh)",
                transform: `rotate(${currentIndex * -60}deg) scale(${
                  gameStarted ? 1 : 0.85
                })`,
                opacity: gameStarted ? 1 : 0.5,
                transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
              className="relative mb-5"
            >
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "min(30px, 8vw, 5vh)",
                    height: "min(30px, 8vw, 5vh)",
                    transform: `rotate(${
                      i * 60
                    }deg) translate(min(100px, 22vw)) rotate(-${i * 60}deg)`,
                    marginLeft: "calc(min(30px, 8vw) / -2)",
                    marginTop: "calc(min(30px, 8vw) / -2)",
                    boxShadow:
                      i === currentIndex
                        ? "0 0 20px rgba(255,255,255,0.3)"
                        : "inset 0 0 5px rgba(0,0,0,0.5)",
                    border:
                      i === currentIndex
                        ? "2px solid #e2e8f0"
                        : "2px solid #1e293b",
                  }}
                  className="absolute left-1/2 top-1/2 rounded-full bg-slate-700 transition-all duration-300"
                />
              ))}
              <div
                style={{
                  transform: `translate(-50%, -50%) rotate(${
                    currentIndex * 60
                  }deg)`,
                }}
                className="absolute left-1/2 top-1/2 flex h-[35%] w-[35%] items-center justify-center rounded-full border-4 border-slate-800 bg-slate-950 font-black text-slate-600 text-[clamp(0.8rem,4vw,1.2rem)] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"
              >
                {6 - shotsTaken}
              </div>
            </div>

            {!gameStarted ? (
              <div className="w-full px-2.5">
                <div className="mb-2.5 flex w-full flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-950/50 p-5 backdrop-blur-sm">
                  <label className="flex items-center justify-between text-sm font-bold tracking-widest text-slate-200 uppercase">
                    LOADED ROUNDS:{" "}
                    <span className="text-2xl font-bold text-red-500">
                      {bulletCount}
                    </span>
                  </label>
                  <select
                    value={bulletCount}
                    onChange={(e) => setBulletCount(parseInt(e.target.value))}
                    className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-900 px-4 font-['Courier_New'] text-base font-bold tracking-wide text-slate-100 outline-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23cbd5e1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 15px center",
                      backgroundSize: "12px",
                    }}
                  >
                    <option value="1">1 ROUND (17%)</option>
                    <option value="2">2 ROUNDS (33%)</option>
                    <option value="3">3 ROUNDS (50%)</option>
                    <option value="4">4 ROUNDS (67%)</option>
                    <option value="5">5 ROUNDS (83%)</option>
                  </select>
                </div>
                <p className="text-center text-xs tracking-widest text-slate-400 uppercase">
                  FATAL ODDS:{" "}
                  <strong>{((bulletCount / 6) * 100).toFixed(0)}%</strong>
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2.5 rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1 text-[0.8rem] font-semibold tracking-[3px] text-slate-600 uppercase">
                  {shotsTaken === 0 ? "TABLE SET" : `ROUND ${shotsTaken + 1}`}
                </div>
                <div
                  className={`mb-1.5 flex min-h-10 items-center text-center text-[clamp(1.5rem,5vw,2.5rem)] font-bold tracking-widest uppercase transition-all duration-100 ${
                    result === "LOSS"
                      ? "text-red-500 drop-shadow-[0_0_30px_#ef4444]"
                      : result === "SAFE"
                      ? "text-slate-200"
                      : "text-slate-400"
                  }`}
                  style={{ lineHeight: 1 }}
                >
                  {statusMessage}
                </div>
                {!gameOver && (
                  <p className="mt-1.5 text-xs tracking-widest text-slate-500 uppercase opacity-80">
                    SURVIVAL ODDS:{" "}
                    <span className="font-bold text-slate-200">
                      {(
                        ((6 - shotsTaken - bulletCount) / (6 - shotsTaken)) *
                        100
                      ).toFixed(0)}
                      %
                    </span>
                  </p>
                )}
              </>
            )}
          </div>

          <div className="mt-auto flex w-full shrink-0 flex-col gap-2.5 pt-2.5">
            {!gameStarted ? (
              <button
                onClick={initGame}
                className="flex h-16 w-full touch-manipulation items-center justify-center overflow-hidden rounded-xl border-2 border-slate-100/10 bg-linear-to-b from-slate-800 to-slate-900 text-[1.2rem] font-extrabold tracking-widest text-slate-50 uppercase shadow-[0_4px_0_#020617] transition-all duration-100 active:translate-y-0.5 active:shadow-[0_2px_0_#020617]"
              >
                SIT AT TABLE
              </button>
            ) : (
              <>
                <button
                  onClick={handleTrigger}
                  disabled={gameOver}
                  className={`flex h-16 w-full touch-manipulation items-center justify-center overflow-hidden rounded-xl border-2 border-red-800 bg-linear-to-b from-red-900 to-red-950 text-[1.2rem] font-extrabold tracking-widest text-red-100 uppercase shadow-[0_4px_0_#450a0a] text-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all duration-100 ${
                    gameOver ? "pointer-events-none hidden opacity-50" : "flex"
                  } active:translate-y-0.5 active:shadow-[0_2px_0_#450a0a] shadow-[0_0_30px_rgba(220,38,38,0.1),0_4px_0_#450a0a]`}
                >
                  PULL TRIGGER
                </button>

                {gameOver && (
                  <button
                    onClick={resetGame}
                    className="flex h-14 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-slate-600 bg-transparent text-[1.2rem] font-extrabold tracking-widest text-slate-400 uppercase transition-all duration-100"
                  >
                    PLAY AGAIN
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default App;

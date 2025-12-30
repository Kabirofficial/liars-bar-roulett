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

  const styles = {
    container: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background:
        result === "LOSS"
          ? "radial-gradient(circle at center, #2a0a0a 0%, #000000 100%)"
          : "radial-gradient(circle at center, #0f172a 0%, #020617 100%)",
      color: "#cbd5e1",
      fontFamily: '"Courier New", Courier, monospace',
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      transition: "background 0.2s cubic-bezier(0.4, 0, 1, 1)",
      padding: "20px",
      boxSizing: "border-box",
    },
    preloaderContainer: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "#020617",
      zIndex: 2000,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      transition: "opacity 0.5s ease",
      opacity: showPreloader ? 1 : 0,
      pointerEvents: showPreloader ? "all" : "none",
    },
    logoImage: {
      width: "150px",
      height: "150px",
      borderRadius: "50%",
      objectFit: "cover",
      border: "4px solid #334155",
      boxShadow: "0 0 30px rgba(0,0,0,0.8)",
      marginBottom: "40px",
      animation: "shake 10s infinite",
    },
    enterBtn: {
      background: "transparent",
      border: "2px solid #e2e8f0",
      color: "#e2e8f0",
      padding: "15px 40px",
      fontSize: "1.2rem",
      fontWeight: "bold",
      letterSpacing: "4px",
      cursor: "pointer",
      textTransform: "uppercase",
      transition: "all 0.2s",
      boxShadow: "0 0 15px rgba(226, 232, 240, 0.1)",
    },
    contentWrapper: {
      width: "100%",
      maxWidth: "420px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      transform: shakeScreen
        ? "translate3d(-5px, 0, 0)"
        : recoilEffect
        ? "translate3d(0, -10px, 0)"
        : "none",
      animation: shakeScreen
        ? "shake 0.3s cubic-bezier(.36,.07,.19,.97) both"
        : "none",
      transition: "transform 0.05s ease-out",
    },
    header: {
      marginBottom: "40px",
      textAlign: "center",
      zIndex: 10,
      borderBottom: "2px solid #334155",
      paddingBottom: "20px",
      width: "100%",
    },
    title: {
      fontSize: "1.8rem",
      fontWeight: "900",
      letterSpacing: "5px",
      color: "#f1f5f9",
      textShadow: "0 0 10px rgba(255,255,255,0.2)",
      margin: 0,
      textTransform: "uppercase",
    },
    screenArea: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginBottom: "60px",
      position: "relative",
      minHeight: "300px",
      justifyContent: "center",
    },
    statusText: {
      fontSize: "2rem",
      fontWeight: "700",
      textAlign: "center",
      marginBottom: "10px",
      letterSpacing: "2px",
      color:
        result === "LOSS"
          ? "#ef4444"
          : result === "SAFE"
          ? "#e2e8f0"
          : "#94a3b8",
      textShadow: result === "LOSS" ? "0 0 30px #ef4444" : "none",
      transition: "all 0.1s",
      minHeight: "2rem",
      textTransform: "uppercase",
    },
    counter: {
      fontSize: "0.9rem",
      color: "#475569",
      fontWeight: "600",
      letterSpacing: "3px",
      marginBottom: "15px",
      textTransform: "uppercase",
      border: "1px solid #334155",
      padding: "5px 10px",
      borderRadius: "4px",
    },
    controls: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      marginBottom: "20px",
    },
    button: {
      width: "100%",
      height: "64px",
      border: "2px solid rgba(255,255,255,0.1)",
      borderRadius: "4px",
      fontSize: "1.2rem",
      fontWeight: "800",
      cursor: "pointer",
      transition: "all 0.1s",
      textTransform: "uppercase",
      letterSpacing: "2px",
      position: "relative",
      overflow: "hidden",
      background: "#0f172a",
      color: "#f8fafc",
    },
    primaryBtn: {
      background: "#0f172a",
      boxShadow: "0 0 20px rgba(0,0,0,0.5)",
      "&:active": { transform: "scale(0.98)" },
    },
    dangerBtn: {
      background: "#7f1d1d",
      borderColor: "#991b1b",
      color: "#fecaca",
      boxShadow: "0 0 30px rgba(220, 38, 38, 0.2)",
      textShadow: "0 2px 4px rgba(0,0,0,0.5)",
    },
    resetBtn: {
      background: "transparent",
      border: "2px solid #475569",
      color: "#94a3b8",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      width: "100%",
      marginBottom: "30px",
      background: "rgba(0, 0, 0, 0.4)",
      padding: "30px",
      borderRadius: "8px",
      border: "1px solid #334155",
    },
    inputLabel: {
      color: "#e2e8f0",
      fontSize: "1rem",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "2px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    rangeInput: {
      width: "100%",
      height: "4px",
      background: "#334155",
      borderRadius: "0",
      outline: "none",
      appearance: "none",
      cursor: "pointer",
    },
    flashOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "#dc2626",
      opacity: flashDanger ? 0.6 : 0,
      pointerEvents: "none",
      transition: "opacity 0.05s ease-out",
      zIndex: 999,
      mixBlendMode: "multiply",
    },
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

  return (
    <>
      {showPreloader && (
        <div style={styles.preloaderContainer}>
          <img src="/logo.jpg" alt="Liar's Bar Logo" style={styles.logoImage} />
          <h1
            style={{ ...styles.title, fontSize: "2rem", marginBottom: "40px" }}
          >
            LIAR'S BAR
            <br />
            ROULETTE
          </h1>
          <button style={styles.enterBtn} onClick={enterGame}>
            ENTER BAR
          </button>
        </div>
      )}

      <div style={styles.flashOverlay} />
      <div style={styles.container}>
        <div style={styles.contentWrapper}>
          <div style={styles.header}>
            <h1 style={styles.title}>
              LIAR'S BAR
              <br />
              <span style={{ fontSize: "0.6em", color: "#94a3b8" }}>
                RUSSIAN ROULETTE
              </span>
            </h1>
          </div>

          <div style={styles.screenArea}>
            <div
              style={{
                position: "relative",
                width: "180px",
                height: "180px",
                marginBottom: "40px",
                transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: `rotate(${currentIndex * -60}deg) scale(${
                  gameStarted ? 1 : 0.9
                })`,
                opacity: gameStarted ? 1 : 0.7,
              }}
            >
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "20px",
                    height: "20px",
                    background: "#334155",
                    borderRadius: "50%",
                    transform: `rotate(${i * 60}deg) translate(70px) rotate(-${
                      i * 60
                    }deg)`,
                    marginLeft: "-10px",
                    marginTop: "-10px",
                    boxShadow:
                      i === currentIndex
                        ? "0 0 20px rgba(255,255,255,0.2)"
                        : "inset 0 0 5px rgba(0,0,0,0.5)",
                    border:
                      i === currentIndex
                        ? "2px solid #e2e8f0"
                        : "2px solid #1e293b",
                    transition: "all 0.3s",
                  }}
                />
              ))}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%, -50%) rotate(${
                    currentIndex * 60
                  }deg)`,
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  border: "4px solid #1e293b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                  fontSize: "0.9rem",
                  fontWeight: "900",
                  background: "#0f172a",
                }}
              >
                {6 - shotsTaken}
              </div>
            </div>

            {!gameStarted ? (
              <div style={{ width: "100%" }}>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>
                    LOADED ROUNDS:{" "}
                    <span style={{ color: "#ef4444", fontWeight: "bold" }}>
                      {bulletCount}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={bulletCount}
                    onChange={(e) => setBulletCount(parseInt(e.target.value))}
                    style={styles.rangeInput}
                  />
                </div>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.8rem",
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  FATAL ODDS:{" "}
                  <strong>{((bulletCount / 6) * 100).toFixed(0)}%</strong>
                </p>
              </div>
            ) : (
              <>
                <div style={styles.counter}>
                  {shotsTaken === 0 ? "TABLE SET" : `ROUND ${shotsTaken + 1}`}
                </div>
                <div style={styles.statusText}>{statusMessage}</div>
                {!gameOver && (
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: "0.7rem",
                      marginTop: "5px",
                      marginBottom: "20px",
                      textTransform: "uppercase",
                      letterSpacing: "2px",
                    }}
                  >
                    SURVIVAL ODDS:{" "}
                    <span style={{ color: "#e2e8f0" }}>
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

          <div style={styles.controls}>
            {!gameStarted ? (
              <button
                style={{ ...styles.button, ...styles.primaryBtn }}
                onClick={initGame}
              >
                SIT AT TABLE
              </button>
            ) : (
              <>
                <button
                  style={{
                    ...styles.button,
                    ...styles.dangerBtn,
                    opacity: gameOver ? 0.5 : 1,
                    cursor: gameOver ? "not-allowed" : "pointer",
                    display: gameOver ? "none" : "block",
                  }}
                  onClick={handleTrigger}
                  disabled={gameOver}
                >
                  PULL TRIGGER
                </button>

                {gameOver && (
                  <button
                    style={{ ...styles.button, ...styles.resetBtn }}
                    onClick={resetGame}
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

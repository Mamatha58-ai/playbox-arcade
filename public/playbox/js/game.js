const EMOJIS = ["🐶", "🐱", "🦊", "🐼", "🐵", "🐸", "🦁", "🐷", "🦄", "🐙", "🐝", "🦋", "🐻", "🦈", "🦩", "🐠", "🦀", "🦜", "🦒", "🐘"];

const THEMES = [
  { id: "classic", name: "Classic", icon: "🎨", cost: 0, a: "#ff72c6", b: "#6b5cff" },
  { id: "ocean", name: "Ocean Splash", icon: "🌊", cost: 40, a: "#36d1dc", b: "#5b86e5" },
  { id: "candy", name: "Candy Pop", icon: "🍬", cost: 70, a: "#f857a6", b: "#ff5858" },
  { id: "night", name: "Night Sky", icon: "🌙", cost: 100, a: "#0f2027", b: "#2c5364" },
  { id: "galaxy", name: "Galaxy", icon: "🌌", cost: 140, a: "#7f00ff", b: "#e100ff" },
  { id: "forest", name: "Forest", icon: "🌿", cost: 160, a: "#11998e", b: "#38ef7d" },
  { id: "rainbow", name: "Rainbow", icon: "🌈", cost: 190, a: "#f7971e", b: "#ffd200" },
  { id: "ice", name: "Ice World", icon: "❄️", cost: 220, a: "#4facfe", b: "#00f2fe" },
];

const LEVELS = [
  { id: 1, name: "🌱 Beginner", subtitle: "Learn the flip", rows: 2, cols: 2, time: 60, lives: 0, streak: 0 },
  { id: 2, name: "🐣 Explorer", subtitle: "Beat the clock", rows: 2, cols: 3, time: 42, lives: 0, streak: 0 },
  { id: 3, name: "🧠 Memory Master", subtitle: "Six pairs to find", rows: 3, cols: 4, time: 65, lives: 0, streak: 0 },
  { id: 4, name: "⚡ Speed Challenge", subtitle: "Eight pairs, fast", rows: 4, cols: 4, time: 52, lives: 0, streak: 0 },
  { id: 5, name: "🔥 Brain Challenge", subtitle: "Three hearts. Two misses cost one.", rows: 4, cols: 4, time: 42, lives: 3, streak: 2 },
  { id: 6, name: "👑 Ultimate Challenge", subtitle: "Ten pairs for the crown", rows: 4, cols: 5, time: 68, lives: 3, streak: 2 },
];

const ACHIEVEMENTS = [
  { id: "firstWin", icon: "🏅", name: "First Victory", detail: "Complete Level 1", test: () => (state.stars[1] || 0) > 0 },
  { id: "perfect", icon: "✨", name: "Perfect Memory", detail: "Win a level with no misses", test: () => state.perfectWin },
  { id: "speed", icon: "⚡", name: "Speed Demon", detail: "Win with over half the time left", test: () => state.speedWin },
  { id: "champion", icon: "👑", name: "Champion", detail: "Complete all six levels", test: () => Object.keys(state.stars).length >= 6 },
];

const SAVE_KEY = "playbox-save-v3";
const state = {
  coins: 0, unlocked: 1, stars: {}, theme: "classic", owned: ["classic"], sound: true, reducedMotion: false,
  achievements: {}, lastDailyDate: null, dailyStreak: 0, bestTime: {},
  screen: "home", level: null, cards: [], flipped: [], timer: null, busy: false,
  paused: false, timeLeft: 0, misses: 0, lives: 0, consecutiveMisses: 0,
  hintsLeft: 0, rewardGiven: false, lastStars: 0, lastReward: 0, lastTimeLeft: 0,
  perfectWin: false, speedWin: false,
};

function localDay() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function yesterday() {
  const day = new Date();
  day.setDate(day.getDate() - 1);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem("playbox-save-v2") || "null");
    if (saved) Object.assign(state, saved);
  } catch { /* Ignore malformed prior save data. */ }
  Object.assign(state, { screen: "home", level: null, cards: [], flipped: [], timer: null, busy: false, paused: false });
}

function persist() {
  const { screen, level, cards, flipped, timer, busy, paused, timeLeft, misses, lives, consecutiveMisses, hintsLeft, rewardGiven, lastStars, lastReward, lastTimeLeft, perfectWin, speedWin, ...saved } = state;
  localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function starGlyph(count) { return "★".repeat(count) + "☆".repeat(3 - count); }
function totalStars() { return Object.values(state.stars).reduce((sum, value) => sum + value, 0); }
function levelById(id) { return LEVELS.find((level) => level.id === id); }

function applyTheme() {
  const theme = THEMES.find((item) => item.id === state.theme) || THEMES[0];
  document.documentElement.style.setProperty("--theme-a", theme.a);
  document.documentElement.style.setProperty("--theme-b", theme.b);
  document.documentElement.dataset.reducedMotion = state.reducedMotion ? "true" : "false";
}

function updateHud() {
  document.getElementById("coinCount").textContent = state.coins;
  document.getElementById("soundIcon").textContent = state.sound ? "🔊" : "🔇";
  document.getElementById("soundBtn").setAttribute("aria-label", state.sound ? "Sound on" : "Sound off");
  document.getElementById("motionIcon").textContent = state.reducedMotion ? "🐢" : "✨";
  document.getElementById("motionBtn").setAttribute("aria-label", state.reducedMotion ? "Reduce motion on" : "Reduce motion off");
}

function toast(message, type = "note") {
  const toastEl = document.getElementById("toast");
  const icon = type === "success" ? "✨" : type === "error" ? "⚠️" : "💬";
  toastEl.hidden = false;
  toastEl.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toastEl.hidden = true; }, 1900);
}

function render() {
  applyTheme();
  updateHud();
  const root = document.getElementById("screens");
  const views = { home: homeScreen, levels: levelsScreen, shop: shopScreen, achievements: achievementsScreen, play: playScreen, win: () => resultScreen(true), lose: () => resultScreen(false) };
  root.innerHTML = views[state.screen]();
  bind();
}

function homeScreen() {
  const rewardReady = state.lastDailyDate !== localDay();
  return `<section class="screen home-screen">
    <div class="brand"><div class="logo">🎮</div><h1>Playbox</h1><p class="tagline">Flip. Match. Win!</p></div>
    <div class="profile-card"><div class="avatar">🧑‍🚀</div><div><strong>Memory Explorer</strong><span>${totalStars()} total stars · Level ${state.unlocked}/6</span></div><div class="profile-stars">★ ${totalStars()}</div></div>
    <button class="play-btn" data-go="levels">PLAY</button>
    <div class="home-actions">
      <button class="daily-btn ${rewardReady ? "ready" : ""}" data-daily="1"><span>🎁</span><span><strong>${rewardReady ? "Daily reward ready!" : "Daily reward claimed"}</strong><small>Day ${Math.max(1, state.dailyStreak)} streak · up to 75 coins</small></span><b>${rewardReady ? "Claim" : "✓"}</b></button>
      <div class="two-actions"><button class="ghost-btn" data-go="shop">🎨 Themes</button><button class="ghost-btn" data-go="achievements">🏅 Badges</button></div>
    </div>
    <div class="pwa-hint">Every win earns coins. Spend them on card themes—never on power.</div>
  </section>`;
}

function levelsScreen() {
  const chips = LEVELS.map((level) => {
    const locked = level.id > state.unlocked;
    const stars = state.stars[level.id] || 0;
    return `<button class="level-chip ${locked ? "locked" : ""}" data-level="${level.id}" ${locked ? "disabled" : ""} aria-label="${locked ? `${level.name}, locked` : `${level.name}, ${stars} stars`}">
      <span class="level-num">${locked ? "🔒" : level.id}</span><span class="level-name">${level.name.split(" ").slice(1).join(" ")}</span><div class="stars">${locked ? "" : starGlyph(stars)}</div></button>`;
  }).join("");
  return `<section class="screen"><div class="screen-title"><button class="back-btn" data-go="home">‹ Back</button><div><h2>Adventure path</h2><small>Finish a level to unlock the next</small></div></div><div class="level-path"></div><div class="levels">${chips}</div><p class="hint">${state.unlocked < 6 ? `Level ${state.unlocked + 1} waits just ahead.` : "All levels unlocked—chase your best score!"}</p></section>`;
}

function shopScreen() {
  const items = THEMES.map((theme) => {
    const owned = state.owned.includes(theme.id);
    const selected = state.theme === theme.id;
    const action = selected ? '<span class="active-badge">ACTIVE</span>' : owned ? "Use" : `${theme.cost} ●`;
    return `<button class="shop-item" data-theme="${theme.id}"><span class="theme-preview" style="background:linear-gradient(135deg,${theme.a},${theme.b})">${theme.icon}</span><span class="shop-title"><strong>${theme.name}</strong><small>${owned ? "Ready to use" : "Unlock with coins"}</small></span><span class="price">${action}</span></button>`;
  }).join("");
  return `<section class="screen"><div class="screen-title"><button class="back-btn" data-go="home">‹ Back</button><div><h2>Theme shop</h2><small>Your cards, your style</small></div></div><div class="shop-list">${items}</div></section>`;
}

function achievementsScreen() {
  const items = ACHIEVEMENTS.map((badge) => {
    const earned = Boolean(state.achievements[badge.id]);
    return `<div class="achievement ${earned ? "earned" : ""}"><span>${earned ? badge.icon : "🔒"}</span><div><strong>${badge.name}</strong><small>${badge.detail}</small></div><b>${earned ? "✓" : ""}</b></div>`;
  }).join("");
  return `<section class="screen"><div class="screen-title"><button class="back-btn" data-go="home">‹ Back</button><div><h2>Achievements</h2><small>${Object.keys(state.achievements).length}/${ACHIEVEMENTS.length} unlocked</small></div></div><div class="achievement-list">${items}</div></section>`;
}

function playScreen() {
  const level = state.level;
  const cards = state.cards.map((card, index) => `<button class="card ${card.flipped || card.matched ? "flipped" : ""} ${card.matched ? "matched" : ""} ${card.hint ? "hint-reveal" : ""}" data-i="${index}" aria-label="Card ${index + 1}"><span class="card-inner"><span class="face back">?</span><span class="face front">${card.emoji}</span></span></button>`).join("");
  const lives = level.lives ? `<div class="lives-display" id="livesDisplay" aria-label="${state.lives} lives">${"❤️".repeat(state.lives)}${"🖤".repeat(level.lives - state.lives)}</div>` : "";
  return `<section class="screen game-screen"><div class="game-title"><button class="back-btn" data-go="levels">‹</button><div><strong>${level.name}</strong><small>${level.subtitle}</small></div><button class="icon-btn pause-btn" id="pauseBtn" aria-label="Pause">⏸</button></div>
    <div class="hud"><div class="hud-pill timer-pill">⏱ <span id="timeLeft">${state.timeLeft}</span>s</div><div class="hud-pill misses-pill">↯ ${state.misses} misses</div>${lives}</div>
    <div class="board board-${level.cols}" style="grid-template-columns:repeat(${level.cols},1fr)">${cards}</div>
    <div class="game-tools"><button class="tool-btn" data-hint="1" ${state.hintsLeft ? "" : "disabled"}>💡 Hint <span>${state.hintsLeft} left · 12 ●</span></button><span>Match all pairs</span></div></section>`;
}

function resultScreen(won) {
  const level = state.level;
  const complete = won && level.id === LEVELS.length;
  const best = state.bestTime[level.id] || 0;
  const pieces = won ? Array.from({ length: 16 }, (_, i) => `<span class="confetti" style="left:${4 + (i * 13) % 92}%;top:8%;background:${["#ff4d9a", "#ffd166", "#5ce1e6", "#a78bfa"][i % 4]};--delay:${i * .06}s"></span>`).join("") : "";
  const title = complete ? "You did it!" : won ? "Level complete!" : state.timeLeft <= 0 ? "Time's up" : "Out of hearts";
  return `<section class="screen"><div class="overlay-card">${won ? `<div class="confetti-container" aria-hidden="true">${pieces}</div>` : ""}<div class="logo">${won ? (complete ? "👑" : "🏆") : "💪"}</div><h2>${title}</h2>${complete ? "<p class='complete-message'>Congratulations! You completed Playbox Match!</p>" : ""}<div class="star-row">${won ? starGlyph(state.lastStars) : "☆☆☆"}</div>
    ${won ? `<div class="result-grid"><span>⏱ Time left <b>${state.lastTimeLeft}s</b></span><span>↯ Misses <b>${state.misses}</b></span><span>● Coins <b>+${state.lastReward}</b></span><span>🏅 Best <b>${best}s</b></span></div>` : `<p>Try a different route and you’ll get it.</p>`}
    <button class="primary-btn" data-go="${won && !complete ? "next" : "levels"}">${won && !complete ? "Next level" : "Levels"}</button><div class="home-actions"><button class="ghost-btn" data-retry="1">Play again</button></div></div></section>`;
}

function bind() {
  document.querySelectorAll("[data-go]").forEach((button) => button.onclick = () => {
    AudioFx.tap(); const target = button.dataset.go;
    if (target === "next") return startLevel(state.level.id + 1);
    stopTimer(); state.screen = target; render();
  });
  document.querySelectorAll("[data-level]").forEach((button) => button.onclick = () => startLevel(Number(button.dataset.level)));
  document.querySelectorAll("[data-theme]").forEach((button) => button.onclick = () => buyOrUse(button.dataset.theme));
  document.querySelectorAll("[data-retry]").forEach((button) => button.onclick = () => startLevel(state.level.id));
  document.querySelectorAll(".card").forEach((button) => button.onclick = () => flip(Number(button.dataset.i)));
  const hint = document.querySelector("[data-hint]"); if (hint) hint.onclick = useHint;
  const daily = document.querySelector("[data-daily]"); if (daily) daily.onclick = claimDaily;
  const pause = document.getElementById("pauseBtn"); if (pause) pause.onclick = pauseGame;
}

function startLevel(id) {
  const level = levelById(id);
  if (!level || id > state.unlocked) return;
  AudioFx.tap(); stopTimer();
  const pairs = (level.rows * level.cols) / 2;
  const faces = shuffle(EMOJIS).slice(0, pairs);
  state.level = level;
  state.cards = shuffle([...faces, ...faces]).map((emoji, idNumber) => ({ id: idNumber, emoji, flipped: false, matched: false, hint: false }));
  Object.assign(state, { flipped: [], busy: false, paused: false, timeLeft: level.time, misses: 0, lives: level.lives, consecutiveMisses: 0, hintsLeft: 3, rewardGiven: false, lastStars: 0, lastReward: 0 });
  state.screen = "play"; render(); startTimer();
}

function startTimer() {
  stopTimer();
  state.timer = setInterval(() => {
    state.timeLeft -= 1;
    const time = document.getElementById("timeLeft"); if (time) time.textContent = state.timeLeft;
    const timer = document.querySelector(".timer-pill"); if (timer) timer.classList.toggle("urgent", state.timeLeft <= 10);
    if (state.timeLeft <= 0) finish(false);
  }, 1000);
}
function stopTimer() { if (state.timer) clearInterval(state.timer); state.timer = null; }

function flip(index) {
  const card = state.cards[index];
  if (state.busy || state.paused || !card || card.flipped || card.matched || card.hint) return;
  card.flipped = true; state.flipped.push(card); AudioFx.flip(); vibrate(10); renderCards();
  if (state.flipped.length < 2) return;
  state.busy = true;
  const [first, second] = state.flipped;
  if (first.emoji === second.emoji) {
    first.matched = true; second.matched = true; state.flipped = []; state.busy = false; state.consecutiveMisses = 0;
    AudioFx.match(); vibrate(25); renderCards();
    if (state.cards.every((item) => item.matched)) finish(true);
    return;
  }
  state.misses += 1; state.consecutiveMisses += 1; AudioFx.miss();
  if (state.level.lives && state.consecutiveMisses >= state.level.streak) {
    state.lives -= 1; state.consecutiveMisses = 0; renderLives();
    const lives = document.getElementById("livesDisplay"); if (lives) lives.classList.add("lives-lost");
    if (state.lives <= 0) return setTimeout(() => finish(false), 620);
  }
  setTimeout(() => { first.flipped = false; second.flipped = false; state.flipped = []; state.busy = false; renderCards(); }, 640);
}

function renderCards() {
  if (state.screen !== "play") return;
  document.querySelectorAll(".card").forEach((button) => {
    const card = state.cards[Number(button.dataset.i)];
    button.classList.toggle("flipped", card.flipped || card.matched || card.hint);
    button.classList.toggle("matched", card.matched);
    button.classList.toggle("hint-reveal", card.hint);
  });
  const misses = document.querySelector(".misses-pill"); if (misses) misses.innerHTML = `↯ ${state.misses} misses`;
}

function renderLives() {
  const lives = document.getElementById("livesDisplay");
  if (lives) lives.textContent = "❤️".repeat(state.lives) + "🖤".repeat(state.level.lives - state.lives);
}

function useHint() {
  if (state.busy || state.paused || !state.hintsLeft) return;
  if (state.coins < 12) { AudioFx.miss(); return toast("You need 12 coins for a hint.", "error"); }
  const remaining = state.cards.filter((card) => !card.matched);
  const choice = remaining[Math.floor(Math.random() * remaining.length)];
  const pair = remaining.filter((card) => card.emoji === choice.emoji);
  state.coins -= 12; state.hintsLeft -= 1; state.busy = true;
  pair.forEach((card) => { card.hint = true; });
  AudioFx.match(); updateHud(); renderCards();
  const hint = document.querySelector("[data-hint]"); if (hint) { hint.disabled = !state.hintsLeft; hint.innerHTML = `💡 Hint <span>${state.hintsLeft} left · 12 ●</span>`; }
  setTimeout(() => { pair.forEach((card) => { card.hint = false; }); state.busy = false; renderCards(); }, 850);
}

function finish(won) {
  if (state.screen !== "play") return;
  stopTimer();
  if (!won) { AudioFx.lose(); state.screen = "lose"; return render(); }
  const fraction = state.timeLeft / state.level.time;
  let stars = 1;
  if (fraction > .32 && state.misses <= 6) stars = 2;
  if (fraction > .52 && state.misses <= 2) stars = 3;
  const reward = 10 + state.level.id * 2 + stars * 5;
  state.lastStars = stars; state.lastReward = reward; state.lastTimeLeft = state.timeLeft;
  state.perfectWin = state.misses === 0; state.speedWin = fraction > .5;
  if (!state.rewardGiven) { state.coins += reward; state.rewardGiven = true; }
  state.stars[state.level.id] = Math.max(state.stars[state.level.id] || 0, stars);
  if (state.level.id === state.unlocked && state.unlocked < LEVELS.length) state.unlocked += 1;
  if (state.timeLeft > (state.bestTime[state.level.id] || 0)) state.bestTime[state.level.id] = state.timeLeft;
  awardAchievements(); persist(); AudioFx.win(); state.screen = "win"; render();
}

function awardAchievements() {
  ACHIEVEMENTS.forEach((achievement) => {
    if (!state.achievements[achievement.id] && achievement.test()) {
      state.achievements[achievement.id] = true;
      setTimeout(() => toast(`Badge unlocked: ${achievement.name}`, "success"), 500);
    }
  });
}

function claimDaily() {
  const today = localDay();
  if (state.lastDailyDate === today) return toast("Come back tomorrow for another reward.");
  state.dailyStreak = state.lastDailyDate === yesterday() ? (state.dailyStreak >= 7 ? 1 : state.dailyStreak + 1) : 1;
  const reward = state.dailyStreak === 7 ? 75 : 10 + state.dailyStreak * 5;
  state.coins += reward; state.lastDailyDate = today; persist(); AudioFx.win(); toast(`Day ${state.dailyStreak}: +${reward} coins!`, "success"); render();
}

function pauseGame() {
  if (!state.timer) return;
  stopTimer(); state.paused = true;
  const overlay = document.createElement("div"); overlay.className = "pause-overlay";
  overlay.innerHTML = `<div class="pause-card"><div class="logo">⏸</div><h2>Paused</h2><p>Your timer is safely stopped.</p><button class="primary-btn" id="resumeBtn">Resume</button><button class="ghost-btn" id="quitBtn">Leave level</button></div>`;
  document.querySelector(".phone").appendChild(overlay);
  document.getElementById("resumeBtn").onclick = () => { overlay.remove(); state.paused = false; startTimer(); };
  document.getElementById("quitBtn").onclick = () => { overlay.remove(); state.paused = false; state.screen = "levels"; render(); };
}

function buyOrUse(id) {
  const theme = THEMES.find((item) => item.id === id); if (!theme) return;
  if (state.owned.includes(id)) { state.theme = id; persist(); AudioFx.tap(); return render(); }
  if (state.coins < theme.cost) { AudioFx.miss(); return toast("Earn more coins by completing levels.", "error"); }
  state.coins -= theme.cost; state.owned.push(id); state.theme = id; persist(); AudioFx.match(); toast(`${theme.name} unlocked!`, "success"); render();
}

function vibrate(milliseconds) { if (navigator.vibrate) navigator.vibrate(milliseconds); }

document.getElementById("soundBtn").onclick = () => { state.sound = !state.sound; AudioFx.setEnabled(state.sound); persist(); updateHud(); };
document.getElementById("motionBtn").onclick = () => { state.reducedMotion = !state.reducedMotion; persist(); applyTheme(); updateHud(); };
document.addEventListener("touchmove", (event) => { if (event.touches.length > 1) event.preventDefault(); }, { passive: false });

load(); AudioFx.setEnabled(state.sound); render();

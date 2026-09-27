(() => {
  "use strict";

  /* ------------------------------------------------------------------
   * 1. CẤU HÌNH 10 MODE
   * ------------------------------------------------------------------ */
  const MODES = [
    { id: 1,  file: "data/mode1.json",  name: "Bảng tuần hoàn & Nguyên tố", icon: "⚛️", color: "#0fa968", tint: "#d3f3e4" },
    { id: 2,  file: "data/mode2.json",  name: "Công thức hóa học",          icon: "🧾", color: "#2f8fe0", tint: "#dcedfb" },
    { id: 3,  file: "data/mode3.json",  name: "Phản ứng hóa học",           icon: "🔥", color: "#f0a23b", tint: "#fdedd4" },
    { id: 4,  file: "data/mode4.json",  name: "Cân bằng phương trình",      icon: "⚖️", color: "#9b5de5", tint: "#ece0fb" },
    { id: 5,  file: "data/mode5.json",  name: "Hóa vô cơ",                  icon: "🪨", color: "#ff6b4a", tint: "#ffe4da" },
    { id: 6,  file: "data/mode6.json",  name: "Hóa hữu cơ",                 icon: "🧬", color: "#0fa968", tint: "#d3f3e4" },
    { id: 7,  file: "data/mode7.json",  name: "Dung dịch & pH",             icon: "💧", color: "#2f8fe0", tint: "#dcedfb" },
    { id: 8,  file: "data/mode8.json",  name: "Kim loại & Phi kim",         icon: "🔩", color: "#f0a23b", tint: "#fdedd4" },
    { id: 9,  file: "data/mode9.json",  name: "Hóa học đời sống",           icon: "🏠", color: "#9b5de5", tint: "#ece0fb" },
    { id: 10, file: "data/mode10.json", name: "Đố vui tổng hợp",            icon: "🎯", color: "#ff6b4a", tint: "#ffe4da" },
  ];

  const TOTAL_QUESTIONS = 40;
  const STORAGE_PREFIX = "quizdovui_used_"; // + modeId + "_" + difficulty

  /* Ngưỡng độ khó theo số thứ tự câu hỏi (đồng thời là streak,
     vì Survival: sai 1 câu là dừng lượt ngay). */
  function difficultyForIndex(n) {
    if (n <= 5) return "Easy";
    if (n <= 12) return "Medium";
    if (n <= 20) return "Hard";
    if (n <= 30) return "HSG";
    return "Hell";
  }

  const DIFF_LABEL = { Easy: "Gà", Medium: "Bình Thường", Hard: "KHó", HSG: "Bá Khí", Hell: "AURA FARMING" };
  const DIFF_CLASS = { Easy: "diff-easy", Medium: "diff-medium", Hard: "diff-hard", HSG: "diff-hsg", Hell: "diff-hell" };

  /* ------------------------------------------------------------------
   * 2. STATE
   * ------------------------------------------------------------------ */
  const state = {
    mode: null,           // mode config object
    pool: [],             // toàn bộ câu hỏi đã nạp cho mode hiện tại
    poolByDiff: {},        // { Easy: [...], Medium: [...], ... }
    queue: [],             // 40 câu đã chọn sẵn cho lượt chơi này
    qIndex: 0,             // câu hiện tại (0-based)
    streak: 0,
    correctCount: 0,
    bestStreak: 0,
    answered: false,
    practice: false,
  };

  /* ------------------------------------------------------------------
   * 3. TIỆN ÍCH: Fisher-Yates shuffle
   * ------------------------------------------------------------------ */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ------------------------------------------------------------------
   * 4. LƯU VẾT CÂU ĐÃ DÙNG (persist qua localStorage theo mode + độ khó)
   * ------------------------------------------------------------------ */
  function usedKey(modeId, difficulty) {
    return `${STORAGE_PREFIX}${modeId}_${difficulty}`;
  }

  function getUsedIds(modeId, difficulty) {
    try {
      const raw = localStorage.getItem(usedKey(modeId, difficulty));
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  function saveUsedIds(modeId, difficulty, idSet) {
    try {
      localStorage.setItem(usedKey(modeId, difficulty), JSON.stringify([...idSet]));
    } catch (e) { /* localStorage không khả dụng — bỏ qua, vẫn chơi được trong phiên này */ }
  }

  /* Bốc 1 câu ngẫu nhiên chưa dùng cho một độ khó cụ thể.
     Nếu đã dùng hết kho -> reset vòng lặp (cho phép lặp lại từ đầu). */
  function drawQuestion(modeId, difficulty, excludeIdsThisRun) {
    const bucket = state.poolByDiff[difficulty] || [];
    if (bucket.length === 0) return null;

    let usedIds = getUsedIds(modeId, difficulty);

    let candidates = bucket.filter(
      (q) => !usedIds.has(q.id) && !excludeIdsThisRun.has(q.id)
    );

    // Hết kho cho độ khó này -> reset vòng lặp, chỉ tránh trùng trong lượt hiện tại
    if (candidates.length === 0) {
      usedIds = new Set();
      candidates = bucket.filter((q) => !excludeIdsThisRun.has(q.id));
      if (candidates.length === 0) candidates = bucket.slice();
    }

    const picked = shuffle(candidates)[0];
    usedIds.add(picked.id);
    saveUsedIds(modeId, difficulty, usedIds);
    excludeIdsThisRun.add(picked.id);
    return picked;
  }

  /* Chuẩn bị hàng đợi 40 câu cho lượt chơi mới, theo đúng phân bố độ khó. */
  function buildQueue(modeId) {
    const excludeThisRun = new Set();
    const queue = [];
    for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
      const diff = difficultyForIndex(i);
      const q = drawQuestion(modeId, diff, excludeThisRun);
      if (q) queue.push({ ...q, difficulty: diff });
    }
    return queue;
  }

  /* ------------------------------------------------------------------
   * 5. NẠP DỮ LIỆU JSON THEO MODE
   * ------------------------------------------------------------------ */
  async function loadModeData(mode) {
    const res = await fetch(mode.file, { cache: "no-store" });
    if (!res.ok) throw new Error(`Không tải được ${mode.file}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  function indexPoolByDifficulty(pool) {
    const byDiff = { Easy: [], Medium: [], Hard: [], HSG: [], Hell: [] };
    pool.forEach((q) => {
      if (byDiff[q.difficulty]) byDiff[q.difficulty].push(q);
    });
    return byDiff;
  }

  /* ------------------------------------------------------------------
   * 6. DOM REFS
   * ------------------------------------------------------------------ */
  const el = {
    screenMenu: document.getElementById("screen-menu"),
    screenGame: document.getElementById("screen-game"),
    modeGrid: document.getElementById("mode-grid"),

    towerTrack: document.getElementById("tower-track"),
    streakChip: document.getElementById("streak-chip"),
    streakCount: document.getElementById("streak-count"),
    qIndexLabel: document.getElementById("question-index"),
    diffBadge: document.getElementById("difficulty-badge"),
    questionText: document.getElementById("question-text"),
    optionsGrid: document.getElementById("options-grid"),
    feedbackBar: document.getElementById("feedback-bar"),
    feedbackText: document.getElementById("feedback-text"),
    btnNext: document.getElementById("btn-next"),
    btnQuit: document.getElementById("btn-quit"),

    overlay: document.getElementById("result-overlay"),
    resultIcon: document.getElementById("result-icon"),
    resultTitle: document.getElementById("result-title"),
    resultMessage: document.getElementById("result-message"),
    resultFx: document.getElementById("result-fx"),
    statCorrect: document.getElementById("stat-correct"),
    statBestStreak: document.getElementById("stat-best-streak"),
    statDifficulty: document.getElementById("stat-difficulty"),
    btnRetry: document.getElementById("btn-retry"),
    btnMenu: document.getElementById("btn-menu"),
    btnCloseModal: document.getElementById("btn-close-modal"),
  };

  /* ------------------------------------------------------------------
   * 7. RENDER: MÀN HÌNH MENU
   * ------------------------------------------------------------------ */
  function renderModeGrid() {
    el.modeGrid.innerHTML = "";
    MODES.forEach((mode) => {
      const card = document.createElement("button");
      card.className = "mode-card";
      card.style.setProperty("--mode-color", mode.color);
      card.style.setProperty("--mode-color-tint", mode.tint);
      card.innerHTML = `
        <span class="mode-icon" style="background:${mode.tint}">${mode.icon}</span>
        <span class="mode-name">${mode.name}</span>
        <span class="mode-count">Mode ${mode.id} · tối đa ${TOTAL_QUESTIONS} câu / lượt</span>
        <span class="mode-progress"><span style="width:0%"></span></span>
      `;
      card.addEventListener("click", () => startMode(mode));
      el.modeGrid.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------
   * 8. TOWER TRACK (30 rung nhỏ hiển thị tiến trình)
   * ------------------------------------------------------------------ */
  function renderTower() {
    el.towerTrack.innerHTML = "";
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      const rung = document.createElement("span");
      rung.className = "rung";
      el.towerTrack.appendChild(rung);
    }
  }

  function updateTower() {
    const rungs = el.towerTrack.children;
    for (let i = 0; i < rungs.length; i++) {
      rungs[i].classList.remove("done", "current");
      if (i < state.qIndex) rungs[i].classList.add("done");
      else if (i === state.qIndex) rungs[i].classList.add("current");
    }
  }

  /* ------------------------------------------------------------------
   * 9. BẮT ĐẦU 1 MODE
   * ------------------------------------------------------------------ */
  async function startMode(mode) {
    state.mode = mode;
    el.questionText.textContent = "Đang tải câu hỏi…";
    showScreen("game");

    try {
      state.pool = await loadModeData(mode);
    } catch (err) {
      el.questionText.textContent = "Không tải được dữ liệu câu hỏi cho mode này. " + mode.file + ".";
      el.optionsGrid.innerHTML = "";
      return;
    }

    state.poolByDiff = indexPoolByDifficulty(state.pool);
    state.queue = buildQueue(mode.id);

    if (state.queue.length === 0) {
      el.questionText.textContent = "Kho câu hỏi của mode này đang trống." + mode.file + ".";
      el.optionsGrid.innerHTML = "";
      return;
    }

    state.qIndex = 0;
    state.streak = 0;
    state.correctCount = 0;
    state.bestStreak = 0;
    state.answered = false;

    renderTower();
    renderQuestion();
  }

  /* ------------------------------------------------------------------
   * 10. HIỂN THỊ 1 CÂU HỎI
   * ------------------------------------------------------------------ */
  function renderQuestion() {
    const total = state.queue.length;
    const q = state.queue[state.qIndex];
    state.answered = false;

    el.qIndexLabel.textContent = `Câu ${state.qIndex + 1} / ${total}`;
    el.diffBadge.textContent = DIFF_LABEL[q.difficulty] || q.difficulty;
    el.diffBadge.className = "difficulty-badge " + (DIFF_CLASS[q.difficulty] || "diff-easy");

    el.questionText.textContent = q.question;
    el.streakCount.textContent = state.streak;

    el.optionsGrid.innerHTML = "";
    const letters = ["A", "B", "C", "D"];
    q.options.forEach((optText, i) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.innerHTML = `<span class="option-letter">${letters[i] || i + 1}</span><span>${optText}</span>`;
      btn.addEventListener("click", () => handleAnswer(i, btn));
      el.optionsGrid.appendChild(btn);
    });

    el.feedbackBar.classList.remove("show", "state-correct", "state-wrong");
    updateTower();
  }

  /* ------------------------------------------------------------------
   * 11. XỬ LÝ TRẢ LỜI
   * ------------------------------------------------------------------ */
  function handleAnswer(choiceIndex, btnEl) {
    if (state.answered) return;
    state.answered = true;

    const q = state.queue[state.qIndex];
    const isCorrect = choiceIndex === q.answer;
    const buttons = [...el.optionsGrid.children];
    buttons.forEach((b) => (b.disabled = true));

    if (isCorrect) {
      btnEl.classList.add("correct");
      state.streak++;
      state.correctCount++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      el.streakCount.textContent = state.streak;
      el.streakChip.classList.remove("pulse");
      void el.streakChip.offsetWidth; // restart animation
      el.streakChip.classList.add("pulse");

      el.feedbackBar.classList.add("show", "state-correct");
      el.feedbackText.textContent = "Chính xác! " + (q.explanation || "");
    } else {
      btnEl.classList.add("wrong");
      buttons[q.answer]?.classList.add("correct");

      el.feedbackBar.classList.add("show", "state-wrong");
      el.feedbackText.textContent = `Sai rồi! Đáp án đúng: ${q.options[q.answer] || "—"}. Giải thích: ${q.explanation || "Chưa có giải thích."}`;
    }

    el.btnNext.textContent = isCorrect
      ? (state.qIndex + 1 >= state.queue.length ? "Xem kết quả 🏆" : "Câu tiếp theo →")
      : "Xem kết quả";

    el.btnNext.onclick = () => {
      if (!isCorrect) {
        finishRun();
        return;
      }
      state.qIndex++;
      if (state.qIndex >= state.queue.length) {
        finishRun();
      } else {
        renderQuestion();
      }
    };
  }

  /* ------------------------------------------------------------------
   * 12. KẾT THÚC LƯỢT CHƠI -> HIỂN THỊ KẾT QUẢ "CÀ KHỊA"
   * ------------------------------------------------------------------ */
  const RESULT_TIERS = [
    { max: 8,  icon: "🐔", shake: true,  title: "Tiếp tục luyện!", cta: "danger" },
    { max: 16, icon: "😅", shake: false, title: "Đang lên tay!", cta: "danger" },
    { max: 24, icon: "👍", shake: false, title: "Khá ổn!", cta: "ghost" },
    { max: 32, icon: "🧠", shake: false, title: "Tiến bộ rồi!", cta: "ghost" },
    { max: 39, icon: "🔥", shake: false, title: "Rất tốt!", cta: "ghost" },
    { max: 40, icon: "👑", shake: false, title: "Hoàn thành!", cta: "ghost", confetti: true },
  ];

  function pickTier(correct) {
    return RESULT_TIERS.find((t) => correct <= t.max) || RESULT_TIERS[RESULT_TIERS.length - 1];
  }

  function saveHistory(correct) {
    if (state.practice) return;
    try {
      const key = "quizdovui_history_v2";
      const history = JSON.parse(localStorage.getItem(key) || "[]");
      history.unshift({ mode: state.mode.name, correct, total: state.queue.length, date: new Date().toLocaleString("vi-VN") });
      localStorage.setItem(key, JSON.stringify(history.slice(0, 20)));
      renderHistory();
    } catch {}
  }

  function renderHistory() {
    const list = document.getElementById("historyList");
    if (!list) return;
    try {
      const history = JSON.parse(localStorage.getItem("quizdovui_history_v2") || "[]");
      list.innerHTML = history.length ? history.map(h => `<div class="history-item"><strong>${escapeHtml(h.mode)}</strong><span>${h.correct}/${h.total} câu đúng</span><small>${escapeHtml(h.date)}</small></div>`).join("") : '<div class="algebra-empty">Chưa có lịch sử. Hãy hoàn thành một lượt chơi có tính điểm.</div>';
    } catch {
      list.innerHTML = '<div class="algebra-empty">Không đọc được lịch sử trên trình duyệt.</div>';
    }
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[m]));
  }

  function finishRun() {
    const correct = state.correctCount;
    saveHistory(correct);
    const tier = pickTier(Math.min(correct, TOTAL_QUESTIONS));
    const highestDiff = state.queue[Math.min(state.qIndex, state.queue.length - 1)]?.difficulty || "Easy";

    el.resultIcon.textContent = state.practice ? "📖" : tier.icon;
    el.resultIcon.classList.toggle("shake", !state.practice && !!tier.shake);
    el.resultTitle.textContent = state.practice ? "Luyện tập hoàn tất" : tier.title;
    el.resultMessage.textContent = state.practice
      ? `Bạn vừa luyện xong ${state.queue.length} câu. Có ${correct} câu trả lời đúng trong lượt này. Điểm không được lưu.`
      : `${correct}/${state.queue.length} câu đúng.`;
    el.statCorrect.textContent = `${correct}/${state.queue.length}`;
    el.statBestStreak.textContent = state.bestStreak;
    el.statDifficulty.textContent = DIFF_LABEL[highestDiff] || highestDiff;

    el.btnRetry.className = tier.cta === "danger" ? "btn btn-danger" : "btn btn-primary";
    el.resultFx.innerHTML = "";
    if (!state.practice && tier.confetti) spawnConfetti();
    el.overlay.classList.add("show");
  }

  function spawnConfetti() {
    const colors = ["#0fa968", "#2f8fe0", "#f0a23b", "#9b5de5", "#ff6b4a"];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
      piece.style.animationDelay = Math.random() * 0.4 + "s";
      el.resultFx.appendChild(piece);
    }
  }

  /* ------------------------------------------------------------------
   * 13. ĐIỀU HƯỚNG MÀN HÌNH / RESET
   * ------------------------------------------------------------------ */
  function showScreen(name) {
    el.screenMenu.classList.toggle("active", name === "menu");
    el.screenGame.classList.toggle("active", name === "game");
  }

  function goToMenu() {
    el.overlay.classList.remove("show");
    showScreen("menu");
  }

  function retryCurrentMode() {
    el.overlay.classList.remove("show");
    if (state.mode) startMode(state.mode);
  }

  /* ------------------------------------------------------------------
   * 14. EVENT LISTENERS
   * ------------------------------------------------------------------ */
  el.btnQuit.addEventListener("click", goToMenu);
  el.btnMenu.addEventListener("click", goToMenu);
  el.btnRetry.addEventListener("click", retryCurrentMode);
  el.btnCloseModal.addEventListener("click", goToMenu);
  el.overlay.addEventListener("click", (e) => {
    if (e.target === el.overlay) goToMenu();
  });

  const practiceToggle = document.getElementById("practiceToggle");
  practiceToggle.addEventListener("click", () => {
    state.practice = !state.practice;
    practiceToggle.classList.toggle("active", state.practice);
    practiceToggle.textContent = state.practice ? "📖 Chế độ luyện tập: BẬT" : "📖 Chế độ luyện tập: TẮT";
  });
  document.getElementById("clearHistory").addEventListener("click", () => {
    localStorage.removeItem("quizdovui_history_v2");
    renderHistory();
  });

  /* ------------------------------------------------------------------
   * 15. KHỞI TẠO
   * ------------------------------------------------------------------ */
  renderModeGrid();
  renderHistory();
})();

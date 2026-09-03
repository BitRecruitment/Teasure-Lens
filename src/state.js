// Game State, Admin Auth, Live Central Server Sync & Admin-Only Private Leaderboard

const SAMPLE_TREE_PHOTO = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/></linearGradient>
    <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#451a03"/><stop offset="100%" stop-color="#78350f"/></linearGradient>
    <radialGradient id="foliage" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#15803d"/><stop offset="70%" stop-color="#166534"/><stop offset="100%" stop-color="#14532d"/></radialGradient>
  </defs>
  <rect width="400" height="300" fill="url(#sky)"/>
  <rect y="230" width="400" height="70" fill="#1e3a1e"/>
  <path d="M170 240 Q180 150 160 120 Q190 130 200 80 Q210 130 240 120 Q220 150 230 240 Z" fill="url(#trunk)"/>
  <circle cx="200" cy="85" r="75" fill="url(#foliage)"/>
  <circle cx="150" cy="95" r="55" fill="url(#foliage)"/>
  <circle cx="250" cy="95" r="55" fill="url(#foliage)"/>
  <circle cx="200" cy="50" r="45" fill="url(#foliage)"/>
  <circle cx="200" cy="180" r="22" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4"/>
  <text x="200" y="280" font-family="sans-serif" font-size="12" fill="#fbbf24" text-anchor="middle" font-weight="bold">LANDMARK: ANCIENT OAK TRUNK</text>
</svg>`);

const SAMPLE_FOUNTAIN_PHOTO = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e1b4b"/></linearGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#64748b"/><stop offset="100%" stop-color="#334155"/></linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#sky2)"/>
  <rect y="240" width="400" height="60" fill="#1e293b"/>
  <ellipse cx="200" cy="220" rx="120" ry="35" fill="url(#stone)"/>
  <ellipse cx="200" cy="216" rx="108" ry="28" fill="#0284c7" opacity="0.8"/>
  <rect x="185" y="140" width="30" height="80" rx="4" fill="url(#stone)"/>
  <ellipse cx="200" cy="140" rx="60" ry="18" fill="url(#stone)"/>
  <path d="M200 140 Q200 90 200 80 Q190 100 170 130" stroke="#38bdf8" stroke-width="2" fill="none"/>
  <path d="M200 140 Q200 90 200 80 Q210 100 230 130" stroke="#38bdf8" stroke-width="2" fill="none"/>
  <circle cx="200" cy="220" r="18" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4"/>
  <text x="200" y="280" font-family="sans-serif" font-size="12" fill="#fbbf24" text-anchor="middle" font-weight="bold">LANDMARK: STONE FOUNTAIN BASIN</text>
</svg>`);

const SAMPLE_BENCH_PHOTO = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#1f2937"/></linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#sky3)"/>
  <rect y="235" width="400" height="65" fill="#14532d"/>
  <path d="M100 190 L300 190 L290 215 L110 215 Z" fill="#78350f"/>
  <rect x="105" y="145" width="190" height="38" rx="4" fill="#92400e"/>
  <rect x="120" y="215" width="10" height="35" fill="#334155"/>
  <rect x="270" y="215" width="10" height="35" fill="#334155"/>
  <rect x="180" y="155" width="40" height="18" rx="2" fill="#f59e0b"/>
  <circle cx="200" cy="164" r="16" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="3,3"/>
  <text x="200" y="280" font-family="sans-serif" font-size="12" fill="#fbbf24" text-anchor="middle" font-weight="bold">LANDMARK: BRONZE BENCH PLAQUE</text>
</svg>`);

const DEFAULT_HUNT = {
  id: "campus-expedition",
  title: "Campus Visual Scavenger Hunt",
  description: "Point your phone camera to locate the spotted landmarks and dig up hidden treasures!",
  clues: [
    {
      id: "clue-1",
      number: 1,
      riddle: "I have no voice, but I tell stories of centuries past. Point your lens at the ancient oak trunk where two paths cross.",
      hint: "Frame the base of the tall oak tree in your camera view.",
      photoUrl: SAMPLE_TREE_PHOTO,
      photoLabel: "Ancient Oak Trunk",
      treasureName: "Brass Cartographer's Compass",
      secretMessage: "The compass reveals its golden dial! Next, scan near the stone fountain where water ripples."
    },
    {
      id: "clue-2",
      number: 2,
      riddle: "I reflect the clouds but cannot fly. I quench the thirst of wandering birds. Center the fountain basin in your camera.",
      hint: "Point camera directly at the central stone fountain.",
      photoUrl: SAMPLE_FOUNTAIN_PHOTO,
      photoLabel: "Stone Fountain Basin",
      treasureName: "Sunstone of the Ancients",
      secretMessage: "The golden gemstone warms in your palm. Seek the bronze plaque on the wooden bench."
    },
    {
      id: "clue-3",
      number: 3,
      riddle: "I offer weary travelers rest without sleep. Wooden slats facing the setting sun with a commemorative bronze plaque.",
      hint: "Align the camera with the bronze plaque on the park bench.",
      photoUrl: SAMPLE_BENCH_PHOTO,
      photoLabel: "Bronze Bench Plaque",
      treasureName: "The Grand Gilded Chalice",
      secretMessage: "You have solved all the riddles and dug up every hidden treasure! Victory is yours!"
    }
  ]
};

class GameState {
  constructor() {
    this.hunt = null;
    this.currentClueIndex = 0;
    this.unlockedTreasures = [];
    this.subscribers = [];
    this.huntChangeListeners = [];

    // Student Tracking
    this.studentId = null;
    this.studentName = "";
    this.huntStartTime = null;

    // Admin Credentials (Protected)
    this.adminUsername = "admin";
    this.adminPassword = "123";
    this.isAdminAuthenticated = false;
    this.syncInterval = null;

    this.init();
  }

  init() {
    let sid = localStorage.getItem('treasurelens_student_id');
    if (!sid) {
      sid = 'std_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('treasurelens_student_id', sid);
    }
    this.studentId = sid;

    this.studentName = localStorage.getItem('treasurelens_student_name') || "";

    const savedStartTime = localStorage.getItem('treasurelens_start_time');
    if (savedStartTime) {
      this.huntStartTime = parseInt(savedStartTime, 10);
    } else {
      this.huntStartTime = Date.now();
      localStorage.setItem('treasurelens_start_time', this.huntStartTime.toString());
    }

    const savedAdmin = localStorage.getItem('treasurelens_admin_auth');
    if (savedAdmin === 'true') {
      this.isAdminAuthenticated = true;
    }

    const savedPass = localStorage.getItem('treasurelens_admin_password');
    if (savedPass) {
      this.adminPassword = savedPass;
    }

    this.hunt = JSON.parse(JSON.stringify(DEFAULT_HUNT));

    const savedProgress = localStorage.getItem('treasurelens_progress_current');
    if (savedProgress) {
      try {
        const p = JSON.parse(savedProgress);
        this.currentClueIndex = p.index || 0;
        this.unlockedTreasures = p.unlocked || [];
      } catch (e) {
        this.currentClueIndex = 0;
      }
    }
  }

  setStudentName(name) {
    if (!name || name.trim().length === 0) return;
    this.studentName = name.trim();
    localStorage.setItem('treasurelens_student_name', this.studentName);
    this.submitStudentProgress(false);
    this.notify();
  }

  // Student silently submits progress (Name & time) to backend
  async submitStudentProgress(isFinished = false) {
    if (!this.studentName) return;

    const elapsed = Math.max(1, Math.round((Date.now() - (this.huntStartTime || Date.now())) / 1000));
    const total = this.hunt && this.hunt.clues ? this.hunt.clues.length : 1;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: this.studentId,
          name: this.studentName,
          cluesCompleted: this.currentClueIndex,
          totalClues: total,
          finished: isFinished,
          elapsedSeconds: elapsed
        })
      });
    } catch (e) {}
  }

  async fetchLiveHunt() {
    try {
      const res = await fetch('/api/hunt', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.clues && data.clues.length > 0) {
          const prevCount = this.hunt ? this.hunt.clues.length : 0;
          const isDifferent = !this.hunt || JSON.stringify(this.hunt.clues) !== JSON.stringify(data.clues);

          if (isDifferent) {
            this.hunt = data;
            if (prevCount > 0 && data.clues.length > prevCount) {
              this.notifyHuntChanged(data.clues.length);
            }
            this.notify();
          }
          return data;
        }
      }
    } catch (e) {}
    return this.hunt;
  }

  startLiveSync(intervalMs = 8000) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      this.fetchLiveHunt();
    }, intervalMs);
  }

  // Fetch Leaderboard - STRICTLY ADMIN-ONLY
  async fetchLeaderboard() {
    if (!this.isAdminAuthenticated) {
      console.warn("Unauthorized attempt to access leaderboard.");
      return [];
    }

    try {
      const res = await fetch('/api/leaderboard', {
        headers: {
          'X-Admin-Password': this.adminPassword
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return data.leaderboard || [];
      }
    } catch (e) {}
    return [];
  }

  async resetLeaderboard() {
    if (!this.isAdminAuthenticated) return false;
    try {
      const res = await fetch('/api/leaderboard/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: this.adminPassword })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async publishHuntToServer(newHunt) {
    this.hunt = newHunt;
    this.notify();

    try {
      const res = await fetch('/api/hunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: this.adminPassword,
          hunt: newHunt
        })
      });

      if (res.ok) {
        const result = await res.json();
        return { success: true, message: result.message };
      } else {
        const err = await res.json();
        return { success: false, error: err.error || "Failed to publish" };
      }
    } catch (e) {
      localStorage.setItem('treasurelens_active_hunt', JSON.stringify(newHunt));
      return { success: true, message: "Saved locally (Server offline)" };
    }
  }

  loginAdmin(username, password) {
    if (username.trim() === this.adminUsername && password.trim() === this.adminPassword) {
      this.isAdminAuthenticated = true;
      localStorage.setItem('treasurelens_admin_auth', 'true');
      this.notify();
      return { success: true };
    }
    return { success: false, error: "Invalid username or password. Default is admin / 123" };
  }

  logoutAdmin() {
    this.isAdminAuthenticated = false;
    localStorage.removeItem('treasurelens_admin_auth');
    this.notify();
  }

  changeAdminPassword(newPassword) {
    if (!newPassword || newPassword.trim().length === 0) return false;
    this.adminPassword = newPassword.trim();
    localStorage.setItem('treasurelens_admin_password', this.adminPassword);
    return true;
  }

  getCurrentClue() {
    if (!this.hunt || !this.hunt.clues) return null;
    return this.hunt.clues[this.currentClueIndex] || null;
  }

  isHuntComplete() {
    return this.hunt && this.currentClueIndex >= this.hunt.clues.length;
  }

  advanceToNextClue() {
    const current = this.getCurrentClue();
    if (current && !this.unlockedTreasures.find(t => t.id === current.id)) {
      this.unlockedTreasures.push({
        id: current.id,
        number: current.number,
        treasureName: current.treasureName,
        secretMessage: current.secretMessage,
        photoUrl: current.photoUrl,
        photoLabel: current.photoLabel,
        foundAt: new Date().toISOString()
      });
    }

    this.currentClueIndex++;
    this.saveProgress();

    const isComplete = this.isHuntComplete();
    this.submitStudentProgress(isComplete);
    this.notify();
  }

  saveProgress() {
    localStorage.setItem('treasurelens_progress_current', JSON.stringify({
      index: this.currentClueIndex,
      unlocked: this.unlockedTreasures
    }));
  }

  resetProgress() {
    this.currentClueIndex = 0;
    this.unlockedTreasures = [];
    this.huntStartTime = Date.now();
    localStorage.setItem('treasurelens_start_time', this.huntStartTime.toString());
    this.saveProgress();
    this.submitStudentProgress(false);
    this.notify();
  }

  getStudentPermanentUrl() {
    return window.location.origin + window.location.pathname;
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(cb => cb(this));
  }

  onHuntChanged(callback) {
    this.huntChangeListeners.push(callback);
    return () => {
      this.huntChangeListeners = this.huntChangeListeners.filter(cb => cb !== callback);
    };
  }

  notifyHuntChanged(totalCount) {
    this.huntChangeListeners.forEach(cb => cb(totalCount));
  }
}

export const gameState = new GameState();

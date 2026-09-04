// Admin Creator Panel: Multi-Landmark Manager + Live Student Leaderboard (Who Finished First)
import { gameState } from '../state.js';
import { soundFX } from '../audio.js';

export class CreatorView {
  constructor(container, onStartHunt, onLogout) {
    this.container = container;
    this.onStartHunt = onStartHunt;
    this.onLogout = onLogout;
    this.currentPhotoDataUrl = null;
    this.huntClues = JSON.parse(JSON.stringify(gameState.hunt.clues || []));
    this.currentSubTab = 'leaderboard'; // Default to leaderboard so teacher can watch!
    this.leaderboardInterval = null;
  }

  async mount() {
    await gameState.fetchLiveHunt();
    this.huntClues = JSON.parse(JSON.stringify(gameState.hunt.clues || []));
    const studentUrl = gameState.getStudentPermanentUrl();
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(studentUrl)}`;

    this.container.innerHTML = `
      <div class="creator-view">
        <!-- Admin Header -->
        <div class="admin-top-status-bar">
          <div class="admin-user-pill">
            <span class="status-indicator-green"></span>
            <span>Admin: <strong>${gameState.adminUsername}</strong></span>
          </div>
          <div class="admin-action-links">
            <button id="btn-show-qr" class="admin-link-btn" style="color: #38bdf8; border-color: rgba(6, 182, 212, 0.4);">📲 Student QR</button>
            <button id="btn-admin-logout" class="admin-link-btn logout">🚪 Logout</button>
          </div>
        </div>

        <!-- Admin View Switcher (Leaderboard vs Landmark Editor) -->
        <div class="admin-tab-switcher">
          <button id="tab-btn-leaderboard" class="admin-switcher-btn ${this.currentSubTab === 'leaderboard' ? 'active' : ''}">
            <span>🏆</span> Live Leaderboard
          </button>
          <button id="tab-btn-landmarks" class="admin-switcher-btn ${this.currentSubTab === 'landmarks' ? 'active' : ''}">
            <span>📍</span> Manage Landmarks (${this.huntClues.length})
          </button>
        </div>

        <!-- ================= SECTION 1: LIVE LEADERBOARD ================= -->
        <div id="section-leaderboard" style="display: ${this.currentSubTab === 'leaderboard' ? 'block' : 'none'};">
          <div class="clue-list-card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <h3 style="font-family: var(--font-serif); font-size: 1.2rem; color: var(--gold-primary);">
                  🏆 Expedition Leaderboard
                </h3>
                <p style="font-size: 0.8rem; color: var(--text-muted);">
                  Live ranking of who completed all riddles first.
                </p>
              </div>
              <div style="display: flex; gap: 6px;">
                <button id="btn-refresh-leaderboard" class="btn-outline btn-sm">🔄 Refresh</button>
                <button id="btn-reset-leaderboard" class="btn-outline btn-sm" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);">🗑️ Reset</button>
              </div>
            </div>

            <!-- Leaderboard Items Container -->
            <div id="leaderboard-items-container" class="leaderboard-container" style="margin-top: 10px;">
              <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">
                Loading live student results...
              </div>
            </div>
          </div>
        </div>

        <!-- ================= SECTION 2: LANDMARK MANAGER ================= -->
        <div id="section-landmarks" style="display: ${this.currentSubTab === 'landmarks' ? 'block' : 'none'};">
          <!-- Live Sync Status Banner -->
          <div id="publish-feedback-banner" class="publish-status-banner" style="display: none; margin-bottom: 12px;">
            <span class="pulse-dot"></span>
            <span id="publish-feedback-text">Broadcasting live to students...</span>
          </div>

          <!-- Plant New Landmark -->
          <div class="clue-list-card">
            <h3 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--gold-primary);">
              ➕ Add New Landmark Location
            </h3>

            <div class="form-group">
              <label class="form-label">
                📸 1. Landmark Photo (Snap the spot with your phone camera)
              </label>
              <input type="file" id="input-landmark-file" accept="image/*" capture="environment" style="display: none;" />

              <div id="photo-preview-box" class="photo-preview-area">
                <div id="photo-placeholder" class="photo-placeholder-content">
                  <span style="font-size: 2.2rem;">📷</span>
                  <p style="font-size: 0.82rem; color: var(--text-muted); margin: 6px 0 10px;">
                    Take a picture of the spot students should find.
                  </p>
                  <button type="button" id="btn-snap-photo" class="btn-primary" style="padding: 10px 18px;">
                    <span>📸</span> Snap / Upload Photo
                  </button>
                </div>

                <div id="photo-display-container" style="display: none; position: relative; width: 100%;">
                  <img id="photo-preview-img" class="photo-preview-thumb" alt="Landmark Preview" />
                  <button type="button" id="btn-remove-photo" class="photo-remove-btn" title="Remove Photo">✕</button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">2. Landmark Name / Location Label</label>
              <input id="input-photo-label" class="form-input" type="text" placeholder="e.g. Science Lab Entrance, Wooden Bench, Oak Tree Knot" />
            </div>

            <div class="form-group">
              <label class="form-label">3. Riddle / Clue for Students</label>
              <textarea id="input-riddle" class="form-textarea" rows="2" placeholder="e.g. Where knowledge sleeps and silence speaks... find the carved double doors."></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">4. Hint (Optional)</label>
              <input id="input-hint" class="form-input" type="text" placeholder="e.g. Near the main courtyard under the lantern" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">Treasure Relic</label>
                <input id="input-name" class="form-input" type="text" placeholder="e.g. Golden Compass" />
              </div>
              <div class="form-group">
                <label class="form-label">Secret Message</label>
                <input id="input-secret" class="form-input" type="text" placeholder="e.g. Great job! Proceed to the next riddle!" />
              </div>
            </div>

            <button id="btn-add-clue" class="btn-primary" style="margin-top: 8px; padding: 14px;">
              <span>✨</span> Add Landmark to List
            </button>
          </div>

          <!-- Clues List -->
          <div class="clue-list-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-family: var(--font-serif); font-size: 1.1rem; color: #e5e7eb;">
                📜 Active Locations (<span id="clue-count">${this.huntClues.length}</span>)
              </h3>
            </div>
            <div id="clues-container" class="clue-chip-list"></div>
          </div>

          <!-- Live Publish Card -->
          <div class="share-card">
            <h3 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--gold-primary);">
              📡 Save & Broadcast to Student Phones
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              Whenever you add or remove locations, tap Publish below. All student apps will automatically update!
            </p>

            <button id="btn-publish-live" class="btn-primary" style="width: 100%; padding: 16px; font-size: 1.05rem; box-shadow: 0 0 25px rgba(245, 158, 11, 0.5);">
              <span>📡</span> Save & Broadcast Live to Students
            </button>

            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button id="btn-preview-qr-action" class="btn-secondary" style="flex: 1;">
                <span>📲</span> Student QR Code
              </button>
              <button id="btn-copy-student-url" class="btn-secondary" style="flex: 1;">
                <span>📋</span> Copy Link
              </button>
            </div>
          </div>
        </div>

        <!-- Student QR Modal -->
        <div id="qr-modal" class="reward-modal-backdrop" style="display: none;">
          <div class="reward-card" style="max-width: 360px;">
            <h2 class="reward-title" style="font-size: 1.3rem;">📲 Student Join Code</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
              Show this QR code on your phone screen or classroom projector for students to scan and install the app!
            </p>

            <div style="background: #fff; padding: 12px; border-radius: 16px; display: inline-block; box-shadow: 0 0 25px rgba(245, 158, 11, 0.4);">
              <img src="${qrCodeUrl}" alt="Student QR Code" style="width: 220px; height: 220px; display: block;" />
            </div>

            <p style="font-family: var(--font-mono); font-size: 0.72rem; color: #fbbf24; margin: 12px 0 16px; word-break: break-all;">
              ${studentUrl}
            </p>

            <button id="btn-close-qr" class="btn-outline" style="width: 100%;">✕ Close QR Code</button>
          </div>
        </div>
      </div>
    `;

    this.renderClueList();
    this.setupListeners();
    this.startLeaderboardPolling();
  }

  formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  }

  async renderLeaderboard() {
    const container = document.getElementById('leaderboard-items-container');
    if (!container) return;

    const leaderboard = await gameState.fetchLeaderboard();

    if (!leaderboard || leaderboard.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">⏳</div>
          <p style="font-size: 0.95rem; font-weight: 600; color: #e2e8f0;">No participants yet</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">Students will appear here as soon as they start hunting!</p>
        </div>
      `;
      return;
    }

    const finishers = leaderboard.filter(item => item.finished);
    const inProgress = leaderboard.filter(item => !item.finished);

    let html = '';

    // Finishers Section
    if (finishers.length > 0) {
      html += `
        <div style="margin-bottom: 16px;">
          <h4 style="font-family: var(--font-serif); font-size: 0.95rem; color: #fbbf24; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
            🏁 Completed All Riddles (${finishers.length})
          </h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
      `;

      finishers.forEach((item, index) => {
        let badge = '🏅';
        let badgeClass = 'rank-other';
        if (index === 0) { badge = '🥇 1ST PLACE'; badgeClass = 'rank-gold'; }
        else if (index === 1) { badge = '🥈 2ND PLACE'; badgeClass = 'rank-silver'; }
        else if (index === 2) { badge = '🥉 3RD PLACE'; badgeClass = 'rank-bronze'; }
        else { badge = `#${index + 1}`; }

        html += `
          <div class="leaderboard-card ${badgeClass}">
            <div class="leaderboard-rank-pill">${badge}</div>
            <div class="leaderboard-info">
              <div class="leaderboard-name">${item.name || 'Anonymous Student'}</div>
              <div class="leaderboard-meta">
                <span>⏱️ Time: <strong>${this.formatDuration(item.elapsedSeconds)}</strong></span>
                <span>• Finished at: <strong>${item.finishTime || 'Just now'}</strong></span>
              </div>
            </div>
            <div class="leaderboard-status-badge">COMPLETED 🏆</div>
          </div>
        `;
      });

      html += `</div></div>`;
    }

    // Active in Progress Section
    if (inProgress.length > 0) {
      html += `
        <div>
          <h4 style="font-family: var(--font-serif); font-size: 0.95rem; color: #38bdf8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
            🏃 Currently Hunting (${inProgress.length})
          </h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
      `;

      inProgress.forEach(item => {
        const total = item.totalClues || (gameState.hunt.clues ? gameState.hunt.clues.length : 1);
        const current = (item.cluesCompleted || 0) + 1;
        html += `
          <div class="leaderboard-card in-progress">
            <div class="leaderboard-info">
              <div class="leaderboard-name">${item.name || 'Anonymous Student'}</div>
              <div class="leaderboard-meta">
                <span>🎯 On Riddle: <strong>${Math.min(current, total)} of ${total}</strong></span>
                <span>• Last active: ${item.lastActive || 'Active'}</span>
              </div>
            </div>
            <div class="leaderboard-progress-pill">${item.cluesCompleted || 0}/${total} Found</div>
          </div>
        `;
      });

      html += `</div></div>`;
    }

    container.innerHTML = html;
  }

  startLeaderboardPolling() {
    this.renderLeaderboard();
    if (this.leaderboardInterval) clearInterval(this.leaderboardInterval);
    this.leaderboardInterval = setInterval(() => {
      if (this.currentSubTab === 'leaderboard') {
        this.renderLeaderboard();
      }
    }, 4500);
  }

  compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 640;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
        callback(compressedDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async broadcastHunt(silent = false) {
    const feedbackBanner = document.getElementById('publish-feedback-banner');
    const feedbackText = document.getElementById('publish-feedback-text');

    const newHunt = {
      id: "live-hunt-" + Date.now(),
      title: "Campus Visual Scavenger Hunt",
      description: "Find spotted landmarks with your phone camera!",
      clues: this.huntClues.map((c, i) => ({ ...c, number: i + 1 }))
    };

    const result = await gameState.publishHuntToServer(newHunt);

    if (feedbackBanner && feedbackText) {
      feedbackBanner.style.display = 'flex';
      if (result.success) {
        if (!silent) soundFX.playMatchSuccess();
        feedbackText.textContent = `✅ LIVE! Saved & Broadcasted to all student apps (${newHunt.clues.length} landmarks)!`;
        feedbackBanner.style.borderColor = '#10b981';
      } else {
        feedbackText.textContent = `⚠️ Server notice: ${result.error || result.message}`;
        feedbackBanner.style.borderColor = '#f59e0b';
      }
      setTimeout(() => { if (feedbackBanner) feedbackBanner.style.display = 'none'; }, 4500);
    }
    return result;
  }

  renderClueList() {
    const listEl = document.getElementById('clues-container');
    const countEl = document.getElementById('clue-count');
    if (countEl) countEl.textContent = this.huntClues.length;
    if (!listEl) return;

    if (this.huntClues.length === 0) {
      listEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No landmarks configured. Snap a photo above!</p>`;
      return;
    }

    listEl.innerHTML = this.huntClues.map((clue, idx) => `
      <div class="clue-chip">
        ${clue.photoUrl ? `
          <img src="${clue.photoUrl}" class="clue-chip-img" alt="Landmark" />
        ` : `
          <div class="clue-chip-img-placeholder">📷</div>
        `}
        <div class="clue-chip-info">
          <span class="clue-chip-num">Landmark #${idx + 1}: ${clue.photoLabel || clue.treasureName || 'Spot'}</span>
          <span class="clue-chip-text">"${clue.riddle}"</span>
          <span style="font-size: 0.75rem; color: #fbbf24;">💎 Relic: ${clue.treasureName || 'Treasure'}</span>
        </div>
        <button class="clue-chip-del" data-del-idx="${idx}" title="Delete Landmark">🗑️</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.clue-chip-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-del-idx'), 10);
        this.huntClues.splice(idx, 1);
        this.renderClueList();
        await this.broadcastHunt();
      });
    });
  }

  setupListeners() {
    const tabLeaderboard = document.getElementById('tab-btn-leaderboard');
    const tabLandmarks = document.getElementById('tab-btn-landmarks');
    const sectionLeaderboard = document.getElementById('section-leaderboard');
    const sectionLandmarks = document.getElementById('section-landmarks');
    const btnRefreshLeaderboard = document.getElementById('btn-refresh-leaderboard');
    const btnResetLeaderboard = document.getElementById('btn-reset-leaderboard');

    // Subtab Switcher
    if (tabLeaderboard && tabLandmarks) {
      tabLeaderboard.addEventListener('click', () => {
        soundFX.playClick();
        this.currentSubTab = 'leaderboard';
        tabLeaderboard.classList.add('active');
        tabLandmarks.classList.remove('active');
        sectionLeaderboard.style.display = 'block';
        sectionLandmarks.style.display = 'none';
        this.renderLeaderboard();
      });

      tabLandmarks.addEventListener('click', () => {
        soundFX.playClick();
        this.currentSubTab = 'landmarks';
        tabLandmarks.classList.add('active');
        tabLeaderboard.classList.remove('active');
        sectionLandmarks.style.display = 'block';
        sectionLeaderboard.style.display = 'none';
      });
    }

    if (btnRefreshLeaderboard) {
      btnRefreshLeaderboard.addEventListener('click', () => {
        soundFX.playClick();
        this.renderLeaderboard();
      });
    }

    if (btnResetLeaderboard) {
      btnResetLeaderboard.addEventListener('click', async () => {
        if (confirm("Reset the leaderboard for a new round? This clears all student completion times.")) {
          soundFX.playClick();
          await gameState.resetLeaderboard();
          this.renderLeaderboard();
        }
      });
    }

    const btnAddClue = document.getElementById('btn-add-clue');
    const btnPublish = document.getElementById('btn-publish-live');
    const btnShowQr = document.getElementById('btn-show-qr');
    const btnPreviewQrAction = document.getElementById('btn-preview-qr-action');
    const btnCloseQr = document.getElementById('btn-close-qr');
    const qrModal = document.getElementById('qr-modal');
    const btnCopyUrl = document.getElementById('btn-copy-student-url');
    const fileInput = document.getElementById('input-landmark-file');
    const snapBtn = document.getElementById('btn-snap-photo');
    const removePhotoBtn = document.getElementById('btn-remove-photo');
    const previewImg = document.getElementById('photo-preview-img');
    const placeholder = document.getElementById('photo-placeholder');
    const displayContainer = document.getElementById('photo-display-container');
    const logoutBtn = document.getElementById('btn-admin-logout');
    const feedbackBanner = document.getElementById('publish-feedback-banner');
    const feedbackText = document.getElementById('publish-feedback-text');

    const showQR = () => {
      soundFX.playClick();
      if (qrModal) qrModal.style.display = 'flex';
    };
    if (btnShowQr) btnShowQr.addEventListener('click', showQR);
    if (btnPreviewQrAction) btnPreviewQrAction.addEventListener('click', showQR);
    if (btnCloseQr) {
      btnCloseQr.addEventListener('click', () => {
        if (qrModal) qrModal.style.display = 'none';
      });
    }

    if (btnCopyUrl) {
      btnCopyUrl.addEventListener('click', () => {
        const url = gameState.getStudentPermanentUrl();
        navigator.clipboard.writeText(url).then(() => {
          btnCopyUrl.textContent = '✅ Copied!';
          soundFX.playClick();
          setTimeout(() => { btnCopyUrl.textContent = '📋 Copy Link'; }, 2000);
        });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        soundFX.playClick();
        gameState.logoutAdmin();
        if (this.onLogout) this.onLogout();
      });
    }

    if (snapBtn && fileInput) {
      snapBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.compressImage(file, (compressedDataUrl) => {
            this.currentPhotoDataUrl = compressedDataUrl;
            previewImg.src = compressedDataUrl;
            placeholder.style.display = 'none';
            displayContainer.style.display = 'block';
            soundFX.playClick();
          });
        }
      });
    }

    if (removePhotoBtn) {
      removePhotoBtn.addEventListener('click', () => {
        this.currentPhotoDataUrl = null;
        fileInput.value = '';
        displayContainer.style.display = 'none';
        placeholder.style.display = 'flex';
      });
    }

    // Add Landmark (Auto-Saves & Broadcasts Immediately!)
    if (btnAddClue) {
      btnAddClue.addEventListener('click', async () => {
        const riddleText = document.getElementById('input-riddle').value.trim();
        const hintText = document.getElementById('input-hint').value.trim();
        const photoLabel = document.getElementById('input-photo-label').value.trim();
        const nameText = document.getElementById('input-name').value.trim() || "Campus Relic";
        const secretText = document.getElementById('input-secret').value.trim() || "Great work finding this spot!";

        if (!this.currentPhotoDataUrl) {
          alert('Please snap or upload a photo of the landmark spot.');
          return;
        }

        if (!riddleText) {
          alert('Please enter a riddle or clue text for students.');
          return;
        }

        const newClue = {
          id: `clue-${Date.now()}`,
          number: this.huntClues.length + 1,
          riddle: riddleText,
          hint: hintText,
          photoUrl: this.currentPhotoDataUrl,
          photoLabel: photoLabel || "Target Landmark",
          treasureName: nameText,
          secretMessage: secretText
        };

        this.huntClues.push(newClue);
        soundFX.playClick();

        document.getElementById('input-riddle').value = '';
        document.getElementById('input-hint').value = '';
        document.getElementById('input-photo-label').value = '';
        document.getElementById('input-name').value = '';
        document.getElementById('input-secret').value = '';
        this.currentPhotoDataUrl = null;
        if (fileInput) fileInput.value = '';
        if (displayContainer) displayContainer.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';

        this.renderClueList();

        // Automatically Save & Broadcast live to all students!
        btnAddClue.disabled = true;
        btnAddClue.innerHTML = `<span>⏳</span> Uploading to Cloud...`;
        await this.broadcastHunt();
        btnAddClue.disabled = false;
        btnAddClue.innerHTML = `<span>➕</span> Add Landmark to Hunt`;
      });
    }

    // Manual Broadcast button
    if (btnPublish) {
      btnPublish.addEventListener('click', async () => {
        soundFX.playClick();
        if (this.huntClues.length === 0) {
          alert('Please add at least one landmark before publishing.');
          return;
        }

        btnPublish.disabled = true;
        btnPublish.innerHTML = `<span>⏳</span> Broadcasting to server...`;
        await this.broadcastHunt();
        btnPublish.disabled = false;
        btnPublish.innerHTML = `<span>📡</span> Save & Broadcast Live to Students`;
      });
    }
  }

  unmount() {
    if (this.leaderboardInterval) {
      clearInterval(this.leaderboardInterval);
      this.leaderboardInterval = null;
    }
    this.container.innerHTML = '';
  }
}

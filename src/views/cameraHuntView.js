// Pure Live-Camera Hunt View: Production Ready (No Test Buttons, Riddle-Only Exploration)
import { CameraManager } from '../ar/camera.js';
import { ARDigScene } from '../ar/scene.js';
import { visualMatcher } from '../vision/matcher.js';
import { gameState } from '../state.js';
import { soundFX } from '../audio.js';

export class CameraHuntView {
  constructor(container, onVictory) {
    this.container = container;
    this.onVictory = onVictory;
    this.cameraManager = null;
    this.arScene = null;
    this.scanInterval = null;
    this.currentClue = null;
    this.isLockedOn = false;
    this.unsubscribeHunt = null;
  }

  async mount() {
    this.currentClue = gameState.getCurrentClue();
    const totalClues = gameState.hunt.clues.length;
    const hasPhoto = Boolean(this.currentClue && this.currentClue.photoUrl);
    const hasName = Boolean(gameState.studentName);

    // AI Vision loads reference photo silently in background (invisible to student)
    if (hasPhoto) {
      visualMatcher.loadReferenceImage(this.currentClue.photoUrl);
    }

    this.container.innerHTML = `
      <div class="camera-hunt-view">
        <!-- Live Video Camera Feed -->
        <video id="live-camera-feed" class="ar-video-feed" playsinline muted autoplay></video>

        <!-- Three.js 3D WebGL Overlay Canvas -->
        <canvas id="live-ar-canvas" class="ar-canvas" style="opacity: 0.15;"></canvas>

        <!-- Live Teacher Update Toast -->
        <div id="live-update-toast" class="live-update-toast" style="display: none;">
          <span class="pulse-dot"></span>
          <span id="live-toast-text">📢 Expedition updated by admin!</span>
        </div>

        <!-- Student Name Prompt Modal -->
        <div id="student-name-modal" class="reward-modal-backdrop" style="display: ${hasName ? 'none' : 'flex'};">
          <div class="reward-card" style="max-width: 350px;">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">🧭</div>
            <h2 class="reward-title" style="font-size: 1.3rem;">Join Expedition</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
              Enter your name or team name so your teacher can see who completes the hunt first!
            </p>

            <div class="form-group" style="text-align: left; margin-bottom: 16px;">
              <input id="input-student-name" class="form-input" type="text" placeholder="e.g. Alex M. or Team Falcon" maxlength="30" />
            </div>

            <button id="btn-start-with-name" class="btn-primary" style="width: 100%; padding: 14px;">
              <span>🚀</span> Start Scavenger Hunt
            </button>
          </div>
        </div>

        <!-- Tactical HUD Overlay (Riddle-Driven Only) -->
        <div class="camera-hud-container">
          <!-- Top Row: Riddle Card (No Photo Guide) -->
          <div class="hunt-top-bar" style="width: 100%;">
            <div class="riddle-tactical-card" style="width: 100%;">
              <div class="riddle-top-meta">
                <span class="badge-tag" id="badge-clue-counter">Riddle ${this.currentClue.number} of ${totalClues}</span>
                <button type="button" id="btn-player-name-tag" class="riddle-audio-status" style="background: transparent; border: none; cursor: pointer;">
                  <span class="pulse-dot-cyan"></span>
                  <span id="label-player-name">${gameState.studentName || 'Explorer'} ✎</span>
                </button>
              </div>

              <div class="riddle-text-sm" style="font-size: 1rem; line-height: 1.5; margin: 4px 0;">
                "${this.currentClue.riddle}"
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                ${this.currentClue.hint ? `
                  <button type="button" id="btn-toggle-hint" class="hint-mini-btn">💡 Show Hint</button>
                ` : `<span></span>`}
                <button type="button" id="btn-toggle-sens" class="hint-mini-btn" style="color: #38bdf8;">
                  ⚙️ Mode: <span id="label-sens-mode">Lenient</span>
                </button>
              </div>

              <span id="hint-text-box" class="hint-text-collapsed" style="display: none; margin-top: 6px;">
                ${this.currentClue.hint || ''}
              </span>
            </div>
          </div>

          <!-- Center Optical Reticle -->
          <div id="optical-reticle" class="optical-reticle-box">
            <div class="bracket-top-left"></div>
            <div class="bracket-top-right"></div>
            <div class="bracket-bottom-left"></div>
            <div class="bracket-bottom-right"></div>
            <div class="reticle-center-cross"></div>
            <div id="reticle-signal-badge" class="reticle-signal-tag">
              SCANNING ENVIRONMENT...
            </div>
          </div>

          <!-- Prominent "I'M HERE! SCAN LANDMARK" Action Button -->
          <div style="align-self: center; width: 100%; max-width: 280px; text-align: center; margin-top: -10px;">
            <button id="btn-instant-scan-target" class="btn-primary" style="width: 100%; padding: 13px 16px; font-size: 0.95rem; border-radius: 30px; box-shadow: 0 0 25px rgba(245, 158, 11, 0.6); background: linear-gradient(135deg, #f59e0b, #ea580c);">
              <span>🎯</span> I'M HERE! SCAN LANDMARK
            </button>
          </div>

          <!-- Bottom Tactical HUD -->
          <div class="hunt-bottom-bar">
            <!-- Signal Meter -->
            <div class="signal-meter-card">
              <div class="signal-meter-header">
                <div class="signal-label-group">
                  <span id="signal-icon">📡</span>
                  <span id="signal-state-text" class="signal-state-text">SEARCHING BY RIDDLE</span>
                </div>
                <div id="signal-pct-text" class="signal-pct-text">0%</div>
              </div>

              <div class="signal-meter-track">
                <div id="signal-meter-fill" class="signal-meter-fill" style="width: 10%;"></div>
              </div>

              <div class="signal-meter-sub">
                <span>Solve the riddle, aim camera at the spot, or tap "SCAN LANDMARK"</span>
              </div>
            </div>

            <!-- Shovel Excavation Panel -->
            <div id="shovel-excavation-panel" class="shovel-action-panel" style="display: none;">
              <div class="dig-progress-box">
                <div class="dig-progress-label">
                  <span>Excavation Depth</span>
                  <span id="hunt-dig-pct">0%</span>
                </div>
                <div class="dig-progress-track">
                  <div id="hunt-dig-bar" class="dig-progress-bar"></div>
                </div>
              </div>

              <button id="hunt-shovel-btn" class="ar-shovel-btn" aria-label="Dig with Shovel">
                ⛏️
              </button>
            </div>
          </div>
        </div>

        <!-- Reward Modal -->
        <div id="hunt-reward-modal" class="reward-modal-backdrop" style="display: none;">
          <div class="reward-card">
            <div class="reward-icon-burst">👑</div>
            <h2 class="reward-title">Treasure Unearthed!</h2>
            <div id="hunt-reward-item" class="reward-secret-box">Ancient Treasure</div>
            <p id="hunt-reward-msg" class="reward-desc">Secret message goes here</p>
            <button id="hunt-next-clue-btn" class="btn-primary" style="width: 100%;">
              <span>Next Consecutive Riddle</span> ➔
            </button>
          </div>
        </div>
      </div>
    `;

    // References
    const videoEl = document.getElementById('live-camera-feed');
    const canvasEl = document.getElementById('live-ar-canvas');
    const reticleBox = document.getElementById('optical-reticle');
    const reticleBadge = document.getElementById('reticle-signal-badge');
    const signalStateText = document.getElementById('signal-state-text');
    const signalPctText = document.getElementById('signal-pct-text');
    const signalMeterFill = document.getElementById('signal-meter-fill');
    const signalIcon = document.getElementById('signal-icon');
    const shovelPanel = document.getElementById('shovel-excavation-panel');
    const shovelBtn = document.getElementById('hunt-shovel-btn');
    const digBar = document.getElementById('hunt-dig-bar');
    const digPct = document.getElementById('hunt-dig-pct');
    const btnToggleHint = document.getElementById('btn-toggle-hint');
    const hintTextBox = document.getElementById('hint-text-box');
    const btnToggleSens = document.getElementById('btn-toggle-sens');
    const labelSensMode = document.getElementById('label-sens-mode');
    const btnScanTarget = document.getElementById('btn-instant-scan-target');
    const rewardModal = document.getElementById('hunt-reward-modal');
    const rewardItem = document.getElementById('hunt-reward-item');
    const rewardMsg = document.getElementById('hunt-reward-msg');
    const rewardNextBtn = document.getElementById('hunt-next-clue-btn');
    const liveToast = document.getElementById('live-update-toast');
    const liveToastText = document.getElementById('live-toast-text');
    const clueCounterBadge = document.getElementById('badge-clue-counter');
    const nameModal = document.getElementById('student-name-modal');
    const inputName = document.getElementById('input-student-name');
    const btnStartWithName = document.getElementById('btn-start-with-name');
    const btnPlayerNameTag = document.getElementById('btn-player-name-tag');
    const labelPlayerName = document.getElementById('label-player-name');

    // Name registration
    const handleNameSubmit = () => {
      const name = inputName.value.trim();
      if (name) {
        gameState.setStudentName(name);
        if (labelPlayerName) labelPlayerName.textContent = `${name} ✎`;
        nameModal.style.display = 'none';
        soundFX.playClick();
      } else {
        alert("Please enter a name or team identifier.");
      }
    };

    if (btnStartWithName) btnStartWithName.addEventListener('click', handleNameSubmit);
    if (inputName) {
      inputName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleNameSubmit();
      });
    }

    if (btnPlayerNameTag) {
      btnPlayerNameTag.addEventListener('click', () => {
        const newName = prompt("Edit your name / team name:", gameState.studentName);
        if (newName && newName.trim().length > 0) {
          gameState.setStudentName(newName.trim());
          if (labelPlayerName) labelPlayerName.textContent = `${newName.trim()} ✎`;
        }
      });
    }

    // Toggle Sensitivity
    if (btnToggleSens && labelSensMode) {
      const modes = ['lenient', 'balanced', 'strict'];
      let currentIdx = 0;
      btnToggleSens.addEventListener('click', () => {
        currentIdx = (currentIdx + 1) % modes.length;
        const selected = modes[currentIdx];
        visualMatcher.setSensitivity(selected);
        labelSensMode.textContent = selected.charAt(0).toUpperCase() + selected.slice(1);
        soundFX.playClick();
      });
    }

    // Initialize Camera & AR
    this.cameraManager = new CameraManager(videoEl);
    await this.cameraManager.start();

    this.arScene = new ARDigScene(canvasEl);

    // Sync student progress
    gameState.submitStudentProgress(false);

    // Live sync listener
    this.unsubscribeHunt = gameState.onHuntChanged((newTotal) => {
      if (liveToast && liveToastText) {
        liveToastText.textContent = `📢 Admin added new locations! Total: ${newTotal}`;
        liveToast.style.display = 'flex';
        setTimeout(() => { liveToast.style.display = 'none'; }, 4000);
      }
      if (clueCounterBadge) {
        clueCounterBadge.textContent = `Riddle ${this.currentClue.number} of ${newTotal}`;
      }
    });

    if (btnToggleHint && hintTextBox) {
      btnToggleHint.addEventListener('click', () => {
        soundFX.playClick();
        const isOpen = hintTextBox.style.display === 'block';
        hintTextBox.style.display = isOpen ? 'none' : 'block';
        btnToggleHint.textContent = isOpen ? '💡 Show Hint' : '✕ Hide Hint';
      });
    }

    // Background Analysis Loop
    this.startFrameAnalysisLoop(videoEl, {
      canvasEl,
      reticleBox,
      reticleBadge,
      signalStateText,
      signalPctText,
      signalMeterFill,
      signalIcon,
      shovelPanel
    });

    // 1-Tap "I'M HERE! SCAN LANDMARK" Button
    if (btnScanTarget) {
      btnScanTarget.addEventListener('click', async () => {
        soundFX.playClick();
        btnScanTarget.disabled = true;
        btnScanTarget.innerHTML = `<span>⏳</span> Analyzing Landmark...`;

        const res = await visualMatcher.verifyInstantScan(videoEl);

        btnScanTarget.disabled = false;
        btnScanTarget.innerHTML = `<span>🎯</span> I'M HERE! SCAN LANDMARK`;

        if (res.success || res.score >= 50) {
          visualMatcher.setManualBoost(95);
        } else {
          reticleBadge.textContent = `⚠️ Match ${res.score}% - Aim camera closer to the spot!`;
          if (navigator.vibrate) navigator.vibrate(100);
          setTimeout(() => {
            reticleBadge.textContent = 'SCANNING ENVIRONMENT...';
          }, 2500);
        }
      });
    }

    const handleDig = () => {
      if (!this.isLockedOn) return;

      soundFX.playShovelDig();
      if (navigator.vibrate) navigator.vibrate(45);

      const result = this.arScene.performDig();
      const pct = Math.round(result.progress * 100);

      digBar.style.width = `${pct}%`;
      digPct.textContent = `${pct}%`;

      if (result.completed) {
        soundFX.stopVisualBeep();
        soundFX.playChestUnlock();

        if (window.confetti) {
          window.confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        }

        setTimeout(() => {
          rewardItem.textContent = this.currentClue.treasureName || "Ancient Relic";
          rewardMsg.textContent = this.currentClue.secretMessage || "You spotted the landmark and dug up the treasure!";
          rewardModal.style.display = 'flex';
        }, 1100);
      }
    };

    shovelBtn.addEventListener('click', handleDig);
    canvasEl.addEventListener('pointerdown', (e) => {
      if (this.isLockedOn && e.target !== shovelBtn) {
        handleDig();
      }
    });

    rewardNextBtn.addEventListener('click', () => {
      soundFX.playClick();
      gameState.advanceToNextClue();
      this.unmount();

      if (gameState.isHuntComplete()) {
        if (this.onVictory) this.onVictory();
      } else {
        this.mount();
      }
    });
  }

  startFrameAnalysisLoop(videoEl, elements) {
    this.stopFrameAnalysisLoop();

    this.scanInterval = setInterval(() => {
      if (this.isLockedOn) return;

      const score = visualMatcher.compareLiveFrame(videoEl);

      elements.signalPctText.textContent = `${score}%`;
      elements.signalMeterFill.style.width = `${Math.max(8, score)}%`;

      soundFX.updateVisualBeep(score);

      if (score >= 85) {
        this.isLockedOn = true;
        soundFX.playMatchSuccess();

        elements.reticleBox.className = 'optical-reticle-box reticle-locked';
        elements.reticleBadge.textContent = '🎯 LANDMARK CONFIRMED! LOCK ACQUIRED!';
        elements.signalStateText.textContent = 'LANDMARK LOCKED! DIG IN AR!';
        elements.signalStateText.style.color = '#34d399';
        elements.signalIcon.textContent = '✨';
        elements.canvasEl.style.opacity = '1.0';
        elements.shovelPanel.style.display = 'flex';

        if (navigator.vibrate) navigator.vibrate([60, 40, 100]);
      } else if (score >= 60) {
        elements.reticleBox.className = 'optical-reticle-box reticle-hot';
        elements.reticleBadge.textContent = `🔥 TARGET IN SIGHT (${score}%)`;
        elements.signalStateText.textContent = 'HOT! HOLD STEADY ON TARGET!';
        elements.signalStateText.style.color = '#f59e0b';
        elements.signalIcon.textContent = '🔥';
        elements.canvasEl.style.opacity = '0.4';
      } else if (score >= 35) {
        elements.reticleBox.className = 'optical-reticle-box reticle-warm';
        elements.reticleBadge.textContent = `📡 FAINT SIGNAL DETECTED (${score}%)`;
        elements.signalStateText.textContent = 'DETECTOR BEEPING...';
        elements.signalStateText.style.color = '#06b6d4';
        elements.signalIcon.textContent = '⚡';
        elements.canvasEl.style.opacity = '0.2';
      } else {
        elements.reticleBox.className = 'optical-reticle-box';
        elements.reticleBadge.textContent = 'SCANNING ENVIRONMENT...';
        elements.signalStateText.textContent = 'SEARCHING BY RIDDLE';
        elements.signalStateText.style.color = '#94a3b8';
        elements.signalIcon.textContent = '📡';
        elements.canvasEl.style.opacity = '0.1';
      }
    }, 150);
  }

  stopFrameAnalysisLoop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    soundFX.stopVisualBeep();
  }

  unmount() {
    this.stopFrameAnalysisLoop();
    if (this.unsubscribeHunt) {
      this.unsubscribeHunt = null;
    }
    if (this.cameraManager) {
      this.cameraManager.stop();
      this.cameraManager = null;
    }
    if (this.arScene) {
      this.arScene.destroy();
      this.arScene = null;
    }
    this.container.innerHTML = '';
  }
}

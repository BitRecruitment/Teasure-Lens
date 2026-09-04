// Professional Live-Camera AR Expedition View
// Continuous camera streaming between riddles, instant sensor reset, & professional UI
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
    this.domElements = {};
  }

  async mount() {
    if (gameState.isHuntComplete() && gameState.unlockedTreasures && gameState.unlockedTreasures.length > 0) {
      if (this.onVictory) {
        this.onVictory();
        return;
      }
    }

    this.currentClue = gameState.getCurrentClue();
    if (!this.currentClue && gameState.hunt && gameState.hunt.clues && gameState.hunt.clues.length > 0) {
      gameState.currentClueIndex = 0;
      this.currentClue = gameState.getCurrentClue();
    }

    if (!this.currentClue) {
      this.currentClue = {
        number: 1,
        riddle: "Waiting for landmarks... Admin can add riddles in the Admin panel!",
        hint: ""
      };
    }

    const totalClues = (gameState.hunt && gameState.hunt.clues) ? Math.max(1, gameState.hunt.clues.length) : 1;
    const hasPhoto = Boolean(this.currentClue && this.currentClue.photoUrl);
    const hasName = Boolean(gameState.studentName);


    // AI Vision loads reference photo silently in background
    if (hasPhoto) {
      visualMatcher.loadReferenceImage(this.currentClue.photoUrl);
    }

    this.container.innerHTML = `
      <div class="camera-hunt-view">
        <!-- Live Video Camera Feed -->
        <video id="live-camera-feed" class="ar-video-feed" playsinline webkit-playsinline muted autoplay></video>

        <!-- Three.js 3D WebGL Overlay Canvas -->
        <canvas id="live-ar-canvas" class="ar-canvas" style="opacity: 0.15;"></canvas>

        <!-- Dynamic Floating Notifications (Admin updates & Calibrations) -->
        <div id="live-update-toast" class="live-update-toast" style="display: none;">
          <span class="pulse-dot"></span>
          <span id="live-toast-text">Expedition updated</span>
        </div>

        <!-- Student Name Registration Modal -->
        <div id="student-name-modal" class="reward-modal-backdrop" style="display: ${hasName ? 'none' : 'flex'};">
          <div class="reward-card">
            <div class="reward-icon-burst">🧭</div>
            <h2 class="reward-title">Expedition Registry</h2>
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.5;">
              Enter your explorer or team name to record your finish time on the official leaderboard.
            </p>

            <div class="form-group" style="text-align: left; margin-bottom: 18px;">
              <input id="input-student-name" class="form-input" type="text" placeholder="e.g. Alex M. or Team Falcon" maxlength="30" autocomplete="off" />
            </div>

            <button id="btn-start-with-name" class="btn-primary" style="width: 100%; padding: 14px; font-size: 1rem;">
              <span>🚀</span> Begin Expedition
            </button>
          </div>
        </div>

        <!-- Professional Tactical HUD Overlay -->
        <div class="camera-hud-container">
          <!-- Top Dock: High-Contrast Riddle Tactical Card -->
          <div class="hunt-top-bar">
            <div class="riddle-tactical-card">
              <div class="riddle-top-meta">
                <span class="badge-tag" id="badge-clue-counter">Riddle ${this.currentClue.number} of ${totalClues}</span>
                <button type="button" id="btn-player-name-tag" class="riddle-audio-status" aria-label="Edit Name">
                  <span class="pulse-dot-cyan"></span>
                  <span id="label-player-name">${gameState.studentName || 'Explorer'} ✎</span>
                </button>
              </div>

              <div id="riddle-text-display" class="riddle-text-sm">
                "${this.currentClue.riddle}"
              </div>

              <div class="riddle-card-footer">
                ${this.currentClue.hint ? `
                  <button type="button" id="btn-toggle-hint" class="hint-mini-btn">💡 Show Hint</button>
                ` : `<span></span>`}
                <button type="button" id="btn-toggle-sens" class="hint-mini-btn sens-pill">
                  ⚙️ Mode: <strong id="label-sens-mode">Lenient</strong>
                </button>
              </div>

              <div id="hint-text-box" class="hint-text-collapsed" style="display: none;">
                ${this.currentClue.hint || ''}
              </div>
            </div>
          </div>

          <!-- Center Optical Reticle with Target Indicator -->
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

          <!-- Primary Scan Action Trigger -->
          <div class="scan-action-wrapper">
            <button id="btn-instant-scan-target" class="btn-scan-action">
              <span class="scan-btn-icon">🎯</span>
              <span class="scan-btn-label">SCAN LANDMARK</span>
            </button>
          </div>

          <!-- Bottom Control Dock: Signal Meter, Shovel, & Dedicated Lower Reset Button -->
          <div class="hunt-bottom-bar">
            <!-- Real-Time Signal Meter -->
            <div class="signal-meter-card">
              <div class="signal-meter-header">
                <div class="signal-label-group">
                  <span id="signal-icon">📡</span>
                  <span id="signal-state-text" class="signal-state-text">SEARCHING BY RIDDLE</span>
                </div>
                <div id="signal-pct-text" class="signal-pct-text">0%</div>
              </div>

              <div class="signal-meter-track">
                <div id="signal-meter-fill" class="signal-meter-fill" style="width: 8%;"></div>
              </div>

              <div class="signal-meter-sub">
                <span>Aim camera at the landmark or tap "SCAN LANDMARK"</span>
              </div>
            </div>

            <!-- Shovel Excavation Panel (Unlocked on Landmark Match) -->
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

            <!-- Dedicated Lower Reset Button (Camera Stalls / Sensor Calibrations) -->
            <div class="lower-reset-container">
              <button id="btn-reset-camera" class="btn-lower-reset" aria-label="Reset Camera and Sensors">
                <span class="reset-icon">🔄</span>
                <span>Reset Camera & Sensors</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Reward Modal (Unlocking Next Riddle) -->
        <div id="hunt-reward-modal" class="reward-modal-backdrop" style="display: none;">
          <div class="reward-card">
            <div class="reward-icon-burst">👑</div>
            <h2 class="reward-title">Treasure Unearthed!</h2>
            <div id="hunt-reward-item" class="reward-secret-box">Ancient Treasure</div>
            <p id="hunt-reward-msg" class="reward-desc">Secret message goes here</p>
            <button id="hunt-next-clue-btn" class="btn-primary" style="width: 100%; padding: 14px; font-size: 1rem;">
              <span>Next Consecutive Riddle</span> ➔
            </button>
          </div>
        </div>
      </div>
    `;

    // Cache DOM Elements
    this.domElements = {
      videoEl: document.getElementById('live-camera-feed'),
      canvasEl: document.getElementById('live-ar-canvas'),
      reticleBox: document.getElementById('optical-reticle'),
      reticleBadge: document.getElementById('reticle-signal-badge'),
      signalStateText: document.getElementById('signal-state-text'),
      signalPctText: document.getElementById('signal-pct-text'),
      signalMeterFill: document.getElementById('signal-meter-fill'),
      signalIcon: document.getElementById('signal-icon'),
      shovelPanel: document.getElementById('shovel-excavation-panel'),
      shovelBtn: document.getElementById('hunt-shovel-btn'),
      digBar: document.getElementById('hunt-dig-bar'),
      digPct: document.getElementById('hunt-dig-pct'),
      btnToggleHint: document.getElementById('btn-toggle-hint'),
      hintTextBox: document.getElementById('hint-text-box'),
      btnToggleSens: document.getElementById('btn-toggle-sens'),
      labelSensMode: document.getElementById('label-sens-mode'),
      btnScanTarget: document.getElementById('btn-instant-scan-target'),
      btnResetCamera: document.getElementById('btn-reset-camera'),
      rewardModal: document.getElementById('hunt-reward-modal'),
      rewardItem: document.getElementById('hunt-reward-item'),
      rewardMsg: document.getElementById('hunt-reward-msg'),
      rewardNextBtn: document.getElementById('hunt-next-clue-btn'),
      liveToast: document.getElementById('live-update-toast'),
      liveToastText: document.getElementById('live-toast-text'),
      clueCounterBadge: document.getElementById('badge-clue-counter'),
      riddleTextDisplay: document.getElementById('riddle-text-display'),
      nameModal: document.getElementById('student-name-modal'),
      inputName: document.getElementById('input-student-name'),
      btnStartWithName: document.getElementById('btn-start-with-name'),
      btnPlayerNameTag: document.getElementById('btn-player-name-tag'),
      labelPlayerName: document.getElementById('label-player-name')
    };

    const {
      videoEl, canvasEl, shovelBtn,
      btnToggleHint, hintTextBox, btnToggleSens, labelSensMode,
      btnScanTarget, btnResetCamera, rewardNextBtn,
      nameModal, inputName, btnStartWithName, btnPlayerNameTag, labelPlayerName
    } = this.domElements;

    // Student Name Handling
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
        const newName = prompt("Edit your explorer / team name:", gameState.studentName);
        if (newName && newName.trim().length > 0) {
          gameState.setStudentName(newName.trim());
          if (labelPlayerName) labelPlayerName.textContent = `${newName.trim()} ✎`;
        }
      });
    }

    // Toggle Sensitivity Mode
    if (btnToggleSens && labelSensMode) {
      const modes = ['lenient', 'balanced', 'strict'];
      let currentIdx = 0;
      btnToggleSens.addEventListener('click', () => {
        currentIdx = (currentIdx + 1) % modes.length;
        const selected = modes[currentIdx];
        visualMatcher.setSensitivity(selected);
        labelSensMode.textContent = selected.charAt(0).toUpperCase() + selected.slice(1);
        soundFX.playClick();
        this.showToast(`Mode switched to: ${selected.toUpperCase()}`);
      });
    }

    // Initialize Camera Stream & Three.js AR Scene
    this.cameraManager = new CameraManager(videoEl);
    await this.cameraManager.start();

    this.arScene = new ARDigScene(canvasEl);

    // Initial student progress sync
    gameState.submitStudentProgress(false);

    // Live sync listener for teacher landmark updates
    this.unsubscribeHunt = gameState.onHuntChanged((newTotal) => {
      this.showToast(`📢 Admin updated landmarks! Total: ${newTotal}`);
      if (this.domElements.clueCounterBadge) {
        this.domElements.clueCounterBadge.textContent = `Riddle ${this.currentClue.number} of ${newTotal}`;
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

    // Start Real-Time Background Frame Analysis Loop
    this.startFrameAnalysisLoop(videoEl);

    // 1-Tap "SCAN LANDMARK" Button
    if (btnScanTarget) {
      btnScanTarget.addEventListener('click', async () => {
        soundFX.playClick();
        btnScanTarget.disabled = true;
        btnScanTarget.classList.add('scanning');
        btnScanTarget.innerHTML = `<span class="scan-btn-icon spin">⏳</span><span class="scan-btn-label">ANALYZING SPOT...</span>`;

        const res = await visualMatcher.verifyInstantScan(videoEl);

        btnScanTarget.disabled = false;
        btnScanTarget.classList.remove('scanning');
        btnScanTarget.innerHTML = `<span class="scan-btn-icon">🎯</span><span class="scan-btn-label">SCAN LANDMARK</span>`;

        if (res.success || res.score >= 50) {
          visualMatcher.setManualBoost(95);
        } else {
          this.domElements.reticleBadge.textContent = `⚠️ Match ${res.score}% - Aim closer to the landmark!`;
          if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
          setTimeout(() => {
            if (!this.isLockedOn) {
              this.domElements.reticleBadge.textContent = 'SCANNING ENVIRONMENT...';
            }
          }, 2500);
        }
      });
    }

    // Dedicated Lower Reset Button (Camera Stalls / Sensors Reset)
    if (btnResetCamera) {
      btnResetCamera.addEventListener('click', async () => {
        soundFX.playClick();
        if (navigator.vibrate) navigator.vibrate(35);

        btnResetCamera.classList.add('rotating');
        btnResetCamera.innerHTML = `<span class="reset-icon spin">🔄</span><span>Calibrating Sensors...</span>`;

        // 1. Re-verify & restart camera stream if phone OS paused it
        const cameraOk = await this.cameraManager.restart();

        // 2. Reset excavation & visual states
        this.isLockedOn = false;
        canvasEl.style.opacity = '0.15';
        this.domElements.shovelPanel.style.display = 'none';
        visualMatcher.setManualBoost(0);

        // 3. Reload current clue reference photo
        if (this.currentClue && this.currentClue.photoUrl) {
          visualMatcher.loadReferenceImage(this.currentClue.photoUrl);
        }

        // 4. Reset 3D excavation scene
        if (this.arScene) {
          this.arScene.resetDigState();
        }

        soundFX.stopVisualBeep();

        setTimeout(() => {
          btnResetCamera.classList.remove('rotating');
          btnResetCamera.innerHTML = `<span class="reset-icon">🔄</span><span>Reset Camera & Sensors</span>`;
          this.showToast(cameraOk ? "✓ Camera & Sensors Calibrated!" : "✓ Sensors Reset & Calibrated");
        }, 300);
      });
    }

    // Excavation Digging
    const handleDig = () => {
      if (!this.isLockedOn) return;

      soundFX.playShovelDig();
      if (navigator.vibrate) navigator.vibrate(45);

      const result = this.arScene.performDig();
      const pct = Math.round(result.progress * 100);

      this.domElements.digBar.style.width = `${pct}%`;
      this.domElements.digPct.textContent = `${pct}%`;

      if (result.completed) {
        soundFX.stopVisualBeep();
        soundFX.playChestUnlock();

        if (window.confetti) {
          window.confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        }

        setTimeout(() => {
          this.domElements.rewardItem.textContent = this.currentClue.treasureName || "Ancient Relic";
          this.domElements.rewardMsg.textContent = this.currentClue.secretMessage || "You spotted the landmark and dug up the treasure!";
          this.domElements.rewardModal.style.display = 'flex';
        }, 1100);
      }
    };

    shovelBtn.addEventListener('click', handleDig);
    canvasEl.addEventListener('pointerdown', (e) => {
      if (this.isLockedOn && e.target !== shovelBtn) {
        handleDig();
      }
    });

    // Smooth Continuous Riddle Progression (Zero Camera Restart!)
    rewardNextBtn.addEventListener('click', () => {
      soundFX.playClick();
      this.advanceToNextRiddle();
    });
  }

  // Smooth continuous transition to the next riddle without freezing camera
  advanceToNextRiddle() {
    gameState.advanceToNextClue();

    if (gameState.isHuntComplete()) {
      this.unmount();
      if (this.onVictory) this.onVictory();
      return;
    }

    this.currentClue = gameState.getCurrentClue();
    const totalClues = gameState.hunt.clues.length;

    // 1. Hide Reward Modal
    this.domElements.rewardModal.style.display = 'none';

    // 2. Reset excavation states smoothly without destroying Three.js
    this.isLockedOn = false;
    this.domElements.canvasEl.style.opacity = '0.15';
    this.domElements.shovelPanel.style.display = 'none';
    this.domElements.digBar.style.width = '0%';
    this.domElements.digPct.textContent = '0%';
    if (this.arScene) {
      this.arScene.resetDigState();
    }

    // 3. Reset matcher & load new reference photo in background
    visualMatcher.setManualBoost(0);
    if (this.currentClue && this.currentClue.photoUrl) {
      visualMatcher.loadReferenceImage(this.currentClue.photoUrl);
    }

    // 4. Update HUD Riddle text & Hint
    this.domElements.clueCounterBadge.textContent = `Riddle ${this.currentClue.number} of ${totalClues}`;
    this.domElements.riddleTextDisplay.textContent = `"${this.currentClue.riddle}"`;
    this.domElements.hintTextBox.textContent = this.currentClue.hint || '';
    this.domElements.hintTextBox.style.display = 'none';

    if (this.domElements.btnToggleHint) {
      this.domElements.btnToggleHint.style.display = this.currentClue.hint ? 'inline-block' : 'none';
      this.domElements.btnToggleHint.textContent = '💡 Show Hint';
    }

    // 5. Reset Reticle & Signal
    this.domElements.reticleBox.className = 'optical-reticle-box';
    this.domElements.reticleBadge.textContent = 'SCANNING ENVIRONMENT...';
    this.domElements.signalStateText.textContent = 'SEARCHING BY RIDDLE';
    this.domElements.signalStateText.style.color = '#94a3b8';
    this.domElements.signalIcon.textContent = '📡';
    this.domElements.signalPctText.textContent = '0%';
    this.domElements.signalMeterFill.style.width = '8%';
    soundFX.stopVisualBeep();

    // 6. Ensure camera stream remains live and active
    this.cameraManager.ensureRunning();

    // 7. Toast feedback
    this.showToast(`Riddle ${this.currentClue.number} Activated!`);
  }

  showToast(message) {
    if (this.domElements.liveToast && this.domElements.liveToastText) {
      this.domElements.liveToastText.textContent = message;
      this.domElements.liveToast.style.display = 'flex';
      setTimeout(() => {
        if (this.domElements.liveToast) {
          this.domElements.liveToast.style.display = 'none';
        }
      }, 3500);
    }
  }

  startFrameAnalysisLoop(videoEl) {
    this.stopFrameAnalysisLoop();

    this.scanInterval = setInterval(() => {
      if (this.isLockedOn) return;

      const score = visualMatcher.compareLiveFrame(videoEl);

      this.domElements.signalPctText.textContent = `${score}%`;
      this.domElements.signalMeterFill.style.width = `${Math.max(8, score)}%`;

      soundFX.updateVisualBeep(score);

      if (score >= 85) {
        this.isLockedOn = true;
        soundFX.playMatchSuccess();

        this.domElements.reticleBox.className = 'optical-reticle-box reticle-locked';
        this.domElements.reticleBadge.textContent = '🎯 LANDMARK CONFIRMED! LOCK ACQUIRED!';
        this.domElements.signalStateText.textContent = 'LANDMARK LOCKED! DIG IN AR!';
        this.domElements.signalStateText.style.color = '#34d399';
        this.domElements.signalIcon.textContent = '✨';
        this.domElements.canvasEl.style.opacity = '1.0';
        this.domElements.shovelPanel.style.display = 'flex';

        if (navigator.vibrate) navigator.vibrate([60, 40, 100]);
      } else if (score >= 60) {
        this.domElements.reticleBox.className = 'optical-reticle-box reticle-hot';
        this.domElements.reticleBadge.textContent = `🔥 TARGET IN SIGHT (${score}%)`;
        this.domElements.signalStateText.textContent = 'HOT! HOLD STEADY ON TARGET!';
        this.domElements.signalStateText.style.color = '#f59e0b';
        this.domElements.signalIcon.textContent = '🔥';
        this.domElements.canvasEl.style.opacity = '0.4';
      } else if (score >= 35) {
        this.domElements.reticleBox.className = 'optical-reticle-box reticle-warm';
        this.domElements.reticleBadge.textContent = `📡 FAINT SIGNAL DETECTED (${score}%)`;
        this.domElements.signalStateText.textContent = 'DETECTOR BEEPING...';
        this.domElements.signalStateText.style.color = '#06b6d4';
        this.domElements.signalIcon.textContent = '⚡';
        this.domElements.canvasEl.style.opacity = '0.2';
      } else {
        this.domElements.reticleBox.className = 'optical-reticle-box';
        this.domElements.reticleBadge.textContent = 'SCANNING ENVIRONMENT...';
        this.domElements.signalStateText.textContent = 'SEARCHING BY RIDDLE';
        this.domElements.signalStateText.style.color = '#94a3b8';
        this.domElements.signalIcon.textContent = '📡';
        this.domElements.canvasEl.style.opacity = '0.1';
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
      this.cameraManager.destroy();
      this.cameraManager = null;
    }
    if (this.arScene) {
      this.arScene.destroy();
      this.arScene = null;
    }
    this.container.innerHTML = '';
  }
}

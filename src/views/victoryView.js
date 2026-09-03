// Student Victory View: Strictly Private Submission (No Admin Access for Students)
import { gameState } from '../state.js';
import { soundFX } from '../audio.js';

export class VictoryView {
  constructor(container, onRestart) {
    this.container = container;
    this.onRestart = onRestart;
  }

  mount() {
    if (window.confetti) {
      window.confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    }

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - (gameState.huntStartTime || Date.now())) / 1000));
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    // Transmit final completion privately to Teacher's server
    gameState.submitStudentProgress(true);

    this.container.innerHTML = `
      <div class="victory-view">
        <div class="victory-trophy">👑</div>
        <h1 class="victory-title">Expedition Complete!</h1>
        <p style="font-size: 0.95rem; color: #e2e8f0; max-width: 360px;">
          Outstanding work, <strong>${gameState.studentName || 'Explorer'}</strong>! You spotted every hidden landmark and excavated all treasures!
        </p>

        <!-- Time Badge -->
        <div style="background: rgba(245, 158, 11, 0.15); border: 2px solid var(--gold-primary); border-radius: 16px; padding: 16px 20px; margin: 10px 0; text-align: center; box-shadow: 0 0 25px rgba(245, 158, 11, 0.4);">
          <div style="font-size: 0.78rem; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.08em;">Your Total Time</div>
          <div style="font-family: var(--font-mono); font-size: 2.2rem; font-weight: 800; color: #fff; margin: 4px 0;">${timeStr}</div>
          <div style="font-size: 0.76rem; color: #34d399; font-weight: 600;">
            ✓ Results sent privately to your teacher!
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px; margin-top: 14px;">
          <button id="btn-replay" class="btn-primary" style="padding: 14px; font-size: 1rem;">
            <span>🔄</span> Play Again
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay').addEventListener('click', () => {
      soundFX.playClick();
      gameState.resetProgress();
      if (this.onRestart) this.onRestart();
    });
  }

  unmount() {
    this.container.innerHTML = '';
  }
}

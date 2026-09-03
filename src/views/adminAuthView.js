// Admin Authentication View (Password Protected Gate)
import { gameState } from '../state.js';
import { soundFX } from '../audio.js';

export class AdminAuthView {
  constructor(container, onSuccess, onCancel) {
    this.container = container;
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;
  }

  mount() {
    this.container.innerHTML = `
      <div class="admin-auth-wrapper">
        <div class="admin-auth-card">
          <div class="admin-badge-icon">🛡️</div>
          <h2 class="admin-auth-title">Admin Gate</h2>
          <p class="admin-auth-subtitle">
            Restricted to hunt creators. Sign in to place landmarks, snap location photos, and manage riddles.
          </p>

          <form id="admin-login-form" class="admin-form">
            <div id="admin-error-box" class="admin-error-box" style="display: none;"></div>

            <div class="form-group">
              <label class="form-label" for="admin-user-input">Username</label>
              <input 
                id="admin-user-input" 
                class="form-input" 
                type="text" 
                value="admin" 
                autocomplete="username" 
                required 
              />
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="form-label" for="admin-pass-input">Password</label>
                <span style="font-size: 0.75rem; color: var(--gold-primary);">Default: 123</span>
              </div>
              <div class="password-input-wrap">
                <input 
                  id="admin-pass-input" 
                  class="form-input" 
                  type="password" 
                  placeholder="Enter admin password" 
                  autocomplete="current-password" 
                  required 
                />
                <button type="button" id="toggle-pass-visibility" class="btn-icon-eye" title="Show password">👁️</button>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0 10px;">
              <input type="checkbox" id="remember-admin" checked style="accent-color: var(--gold-primary);" />
              <label for="remember-admin" style="font-size: 0.85rem; color: var(--text-muted); cursor: pointer;">
                Remember session on this device
              </label>
            </div>

            <button type="submit" id="admin-submit-btn" class="btn-primary" style="width: 100%; padding: 14px;">
              <span>⚡</span> Access Admin Panel
            </button>

            <button type="button" id="admin-cancel-btn" class="btn-outline" style="width: 100%; margin-top: 8px;">
              ← Back to Explorer Hunt
            </button>
          </form>

          <div class="admin-card-footer">
            <span>TreasureLens Security Console v2.0</span>
          </div>
        </div>
      </div>
    `;

    const form = document.getElementById('admin-login-form');
    const userInput = document.getElementById('admin-user-input');
    const passInput = document.getElementById('admin-pass-input');
    const errorBox = document.getElementById('admin-error-box');
    const toggleEye = document.getElementById('toggle-pass-visibility');
    const cancelBtn = document.getElementById('admin-cancel-btn');

    // Toggle password visibility
    toggleEye.addEventListener('click', () => {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleEye.textContent = '🙈';
      } else {
        passInput.type = 'password';
        toggleEye.textContent = '👁️';
      }
    });

    // Form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      soundFX.playClick();

      const user = userInput.value;
      const pass = passInput.value;

      const result = gameState.loginAdmin(user, pass);
      if (result.success) {
        soundFX.playMatchSuccess();
        if (this.onSuccess) this.onSuccess();
      } else {
        errorBox.textContent = result.error || "Access Denied.";
        errorBox.style.display = 'block';
        passInput.value = '';
        passInput.focus();
      }
    });

    // Cancel
    cancelBtn.addEventListener('click', () => {
      soundFX.playClick();
      if (this.onCancel) this.onCancel();
    });

    // Focus password
    setTimeout(() => {
      if (passInput) passInput.focus();
    }, 150);
  }

  unmount() {
    this.container.innerHTML = '';
  }
}

// Main Application Controller & View Router (Live Campus Auto-Sync)
import { gameState } from './state.js';
import { soundFX } from './audio.js';
import { CameraHuntView } from './views/cameraHuntView.js';
import { AdminAuthView } from './views/adminAuthView.js';
import { CreatorView } from './views/creatorView.js';
import { VictoryView } from './views/victoryView.js';

class App {
  constructor() {
    this.currentViewName = 'hunt';
    this.currentViewInstance = null;
    this.container = document.getElementById('view-container');

    this.init();
  }

  async init() {
    this.setupNav();

    // Fetch live hunt from server on startup (students auto-receive teacher's published spots!)
    await gameState.fetchLiveHunt();
    gameState.startLiveSync();

    if (gameState.isHuntComplete()) {
      this.switchView('victory');
    } else {
      this.switchView('hunt');
    }
  }

  setupNav() {
    const playBtn = document.getElementById('nav-play-btn');
    const adminBtn = document.getElementById('nav-create-btn');

    playBtn.addEventListener('click', () => {
      soundFX.playClick();
      playBtn.classList.add('active');
      adminBtn.classList.remove('active');

      if (gameState.isHuntComplete()) {
        this.switchView('victory');
      } else {
        this.switchView('hunt');
      }
    });

    adminBtn.addEventListener('click', () => {
      soundFX.playClick();
      adminBtn.classList.add('active');
      playBtn.classList.remove('active');

      if (gameState.isAdminAuthenticated) {
        this.switchView('creator');
      } else {
        this.switchView('admin-login');
      }
    });
  }

  switchView(viewName) {
    if (this.currentViewInstance && typeof this.currentViewInstance.unmount === 'function') {
      this.currentViewInstance.unmount();
    }

    this.currentViewName = viewName;

    switch (viewName) {
      case 'hunt':
        this.currentViewInstance = new CameraHuntView(
          this.container,
          () => this.switchView('victory')
        );
        this.currentViewInstance.mount();
        break;

      case 'admin-login':
        this.currentViewInstance = new AdminAuthView(
          this.container,
          () => this.switchView('creator'),
          () => {
            document.getElementById('nav-play-btn').classList.add('active');
            document.getElementById('nav-create-btn').classList.remove('active');
            this.switchView('hunt');
          }
        );
        this.currentViewInstance.mount();
        break;

      case 'creator':
        this.currentViewInstance = new CreatorView(
          this.container,
          () => {
            document.getElementById('nav-play-btn').classList.add('active');
            document.getElementById('nav-create-btn').classList.remove('active');
            this.switchView('hunt');
          },
          () => {
            document.getElementById('nav-play-btn').classList.add('active');
            document.getElementById('nav-create-btn').classList.remove('active');
            this.switchView('hunt');
          }
        );
        this.currentViewInstance.mount();
        break;

      case 'victory':
        this.currentViewInstance = new VictoryView(
          this.container,
          () => this.switchView('hunt'),
          () => {
            document.getElementById('nav-create-btn').classList.add('active');
            document.getElementById('nav-play-btn').classList.remove('active');
            if (gameState.isAdminAuthenticated) {
              this.switchView('creator');
            } else {
              this.switchView('admin-login');
            }
          }
        );
        this.currentViewInstance.mount();
        break;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});

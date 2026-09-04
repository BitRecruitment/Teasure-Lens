// Camera Stream Manager for WebAR (Environment / Rear Camera)
// Enhanced for continuous operation, background wakeups, and instant hardware recovery

export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.isSimulated = false;
    this.isStarting = false;

    // Auto-resume camera if phone was locked or student switched tabs
    this.onVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && this.video && this.video.paused) {
        try {
          await this.video.play();
        } catch (e) {
          await this.restart();
        }
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  async start() {
    if (this.isStarting) return;
    this.isStarting = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera API unavailable. Falling back to simulated view.');
      this.startSimulatedFeed();
      this.isStarting = false;
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera on phone
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('webkit-playsinline', '');
      this.video.muted = true;

      await this.video.play();
      this.isSimulated = false;
      this.video.style.display = 'block';
    } catch (err) {
      console.warn('Could not start live camera feed, trying fallback:', err.message);
      // Fallback: try basic video constraint without facingMode if phone driver glitched
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.video.srcObject = this.stream;
        await this.video.play();
        this.isSimulated = false;
      } catch (err2) {
        this.startSimulatedFeed();
      }
    } finally {
      this.isStarting = false;
    }
  }

  // Check if camera stream is active and alive; if suspended, resume or restart
  async ensureRunning() {
    if (this.isSimulated) return false;

    const streamActive = this.stream && this.stream.active && this.stream.getVideoTracks().some(t => t.readyState === 'live');
    const videoPlaying = this.video && !this.video.paused && this.video.readyState >= 2;

    if (streamActive && videoPlaying) {
      return true;
    }

    if (streamActive && this.video) {
      try {
        await this.video.play();
        if (this.video.readyState >= 2) return true;
      } catch (e) {}
    }

    return await this.restart();
  }

  // Clean hardware restart without crashing mobile GPU driver
  async restart() {
    this.stop();
    // Allow phone driver 120ms to cleanly release hardware buffer
    await new Promise(res => setTimeout(res, 120));
    await this.start();
    return !this.isSimulated && this.video && this.video.readyState >= 2;
  }

  startSimulatedFeed() {
    this.isSimulated = true;
    if (this.video) {
      this.video.style.display = 'none';
    }
  }

  stop() {
    if (this.stream) {
      try {
        this.stream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  destroy() {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.stop();
  }
}

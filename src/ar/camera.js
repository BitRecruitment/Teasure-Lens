// Camera Stream Manager for WebAR (Environment / Rear Camera)

export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.isSimulated = false;
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera API unavailable. Falling back to simulated view.');
      this.startSimulatedFeed();
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
      await this.video.play();
      this.isSimulated = false;
    } catch (err) {
      console.warn('Could not start live camera feed (permission denied or no camera):', err.message);
      this.startSimulatedFeed();
    }
  }

  // Graceful fallback if testing without a physical webcam
  startSimulatedFeed() {
    this.isSimulated = true;
    // Create animated canvas backdrop simulating real grass/ground
    this.video.style.display = 'none';
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }
}

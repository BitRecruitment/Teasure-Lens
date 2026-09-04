// Advanced Multi-Modal Vision & Deep AI Matcher for TreasureLens AR
// Combines:
// 1. 64x64 High-Resolution Analysis Grid (4x more spatial detail)
// 2. Gaussian Center-Weighted Saliency Masking (focuses on subject, suppresses background noise)
// 3. Multi-Scale Spatial Pyramid Search (scale & distance invariance: 0.82x, 1.0x, 1.20x)
// 4. Illumination-Invariant Zero-Mean Normalized Cross-Correlation (ZNCC)
// 5. Sobel Edge Gradient & Directional Silhouette Overlap
// 6. HSV Perceptual Color Distribution Matching (prevents false positives on wrong surfaces)
// 7. TensorFlow.js MobileNet V2 Deep Neural Feature Embedding Cosine Similarity

export class RobustVisionMatcher {
  constructor() {
    this.GRID_SIZE = 64; // 64x64 analysis grid (4,096 structural cells)
    this.AI_SIZE = 224;   // 224x224 for MobileNet neural network

    // Reference photo canvases
    this.refCanvas = document.createElement('canvas');
    this.refCanvas.width = this.GRID_SIZE;
    this.refCanvas.height = this.GRID_SIZE;
    this.refCtx = this.refCanvas.getContext('2d', { willReadFrequently: true });

    // Live camera video canvases
    this.liveCanvas = document.createElement('canvas');
    this.liveCanvas.width = this.GRID_SIZE;
    this.liveCanvas.height = this.GRID_SIZE;
    this.liveCtx = this.liveCanvas.getContext('2d', { willReadFrequently: true });

    // Dedicated AI canvas for MobileNet
    this.aiCanvas = document.createElement('canvas');
    this.aiCanvas.width = this.AI_SIZE;
    this.aiCanvas.height = this.AI_SIZE;
    this.aiCtx = this.aiCanvas.getContext('2d', { willReadFrequently: true });

    // Precomputed 64x64 Gaussian Center Saliency Weights
    this.saliencyWeights = this.buildGaussianSaliencyWeights(this.GRID_SIZE);

    this.referenceData = null;       // Precomputed multi-feature descriptor
    this.currentScore = 0;
    this.manualBoost = 0;
    this.lastAiScore = 0;
    this.lastAiEvalTime = 0;
    this.isAiEvaluating = false;

    // Sensitivity profiles: 'lenient' (outdoors/shadows), 'balanced', 'strict'
    this.sensitivity = 'lenient';
    this.thresholds = {
      lenient: 55,   // Forgiving for bright sunlight, moving shadows, slight angle tilts
      balanced: 65,  // Standard
      strict: 75     // Exact framing
    };

    // Deep Neural Network Model State
    this.aiModel = null;
    this.refAiEmbedding = null;
    this.pendingAiUrl = null;

    this.initDeepAI();
  }

  // Precompute 2D Gaussian Center Mask (sigma = 22.0)
  buildGaussianSaliencyWeights(size) {
    const weights = new Float32Array(size * size);
    const cx = (size - 1) / 2.0;
    const cy = (size - 1) / 2.0;
    const sigma = size * 0.35;
    const twoSigmaSq = 2.0 * sigma * sigma;

    let sum = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const distSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        const w = Math.exp(-distSq / twoSigmaSq);
        weights[y * size + x] = w;
        sum += w;
      }
    }
    // Normalize to average weight = 1.0
    const normFactor = (size * size) / sum;
    for (let i = 0; i < weights.length; i++) {
      weights[i] *= normFactor;
    }
    return weights;
  }

  // Asynchronous MobileNet Deep AI Model Loader
  async initDeepAI() {
    try {
      if (typeof window !== 'undefined' && window.tf && window.mobilenet) {
        await window.tf.ready();
        this.aiModel = await window.mobilenet.load({ version: 2, alpha: 0.5 });
        console.log(" [Vision AI] MobileNet V2 Deep Neural Extractor loaded successfully!");
        if (this.pendingAiUrl) {
          this.extractAiEmbedding(this.pendingAiUrl);
          this.pendingAiUrl = null;
        }
      }
    } catch (e) {
      console.warn(" [Vision AI] Deep Neural Extractor fallback: using Multi-Scale ZNCC + HOG + Color.");
    }
  }

  // Extract high-level semantic embedding vector from reference photo
  async extractAiEmbedding(imgUrl) {
    if (!this.aiModel || !window.tf) {
      this.pendingAiUrl = imgUrl;
      return;
    }
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        try {
          this.aiCtx.drawImage(img, 0, 0, this.AI_SIZE, this.AI_SIZE);
          const tensor = window.tf.browser.fromPixels(this.aiCanvas);
          const activation = this.aiModel.infer(tensor, true);
          const raw = await activation.data();
          this.refAiEmbedding = this.normalizeVector(raw);
          tensor.dispose();
          activation.dispose();
          console.log(" [Vision AI] Reference deep embedding generated (dim:", this.refAiEmbedding.length, ")");
        } catch (err) {
          console.warn(" [Vision AI] Embedding computation error:", err);
        }
      };
      img.src = imgUrl;
    } catch (e) {}
  }

  // Pre-process reference landmark image with multi-modal descriptors
  loadReferenceImage(imageUrl) {
    if (!imageUrl) {
      this.referenceData = null;
      this.refAiEmbedding = null;
      return;
    }

    this.extractAiEmbedding(imageUrl);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.refCtx.drawImage(img, 0, 0, this.GRID_SIZE, this.GRID_SIZE);
      const imgData = this.refCtx.getImageData(0, 0, this.GRID_SIZE, this.GRID_SIZE);
      this.referenceData = this.computeMultiFeatureDescriptor(imgData);
    };
    img.src = imageUrl;
  }

  // Compute Multi-Modal Descriptor: Luminance, Gradients, and HSV Color Histogram
  computeMultiFeatureDescriptor(imageData) {
    const data = imageData.data;
    const size = this.GRID_SIZE;
    const totalPixels = size * size;
    const gray = new Float32Array(totalPixels);
    const weights = this.saliencyWeights;

    // 1. Perceptual Luminance + Center-Weighted Mean
    let weightedSum = 0;
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[j] = lum;
      weightedSum += lum * weights[j];
    }
    const mean = weightedSum / totalPixels;

    // Center-Weighted Standard Deviation
    let varianceSum = 0;
    for (let j = 0; j < totalPixels; j++) {
      const diff = gray[j] - mean;
      varianceSum += diff * diff * weights[j];
    }
    const stdDev = Math.sqrt(varianceSum / totalPixels) || 1.0;

    // Zero-Mean Normalized Luminance Vector
    const normalized = new Float32Array(totalPixels);
    for (let j = 0; j < totalPixels; j++) {
      normalized[j] = (gray[j] - mean) / stdDev;
    }

    // 2. Sobel Edge Gradients (3x3 Kernel)
    const edgeMag = new Float32Array(totalPixels);
    const edgeDir = new Float32Array(totalPixels);

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = y * size + x;
        // Horizontal gradient (dx)
        const gx =
          -gray[idx - size - 1] + gray[idx - size + 1] +
          -2 * gray[idx - 1] + 2 * gray[idx + 1] +
          -gray[idx + size - 1] + gray[idx + size + 1];

        // Vertical gradient (dy)
        const gy =
          -gray[idx - size - 1] - 2 * gray[idx - size] - gray[idx - size + 1] +
          gray[idx + size - 1] + 2 * gray[idx + size] + gray[idx + size + 1];

        edgeMag[idx] = Math.sqrt(gx * gx + gy * gy) * weights[idx];
        edgeDir[idx] = Math.atan2(gy, gx);
      }
    }

    // 3. HSV Color Profile Histogram (12 Hue bins + 4 Saturation bins = 16 bins)
    const colorHist = new Float32Array(16);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const r = data[i] / 255.0;
      const g = data[i + 1] / 255.0;
      const b = data[i + 2] / 255.0;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;

      let h = 0;
      if (delta > 1e-4) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = h * 60;
        if (h < 0) h += 360;
      }

      const s = max === 0 ? 0 : delta / max;
      const w = weights[j];

      // If sufficiently saturated, bucket by hue (bins 0-11); else bucket by low-saturation (bins 12-15)
      if (s > 0.18) {
        const hueBin = Math.min(11, Math.floor(h / 30));
        colorHist[hueBin] += w * s;
      } else {
        const satBin = 12 + Math.min(3, Math.floor(max * 4));
        colorHist[satBin] += w * (1.0 - s);
      }
    }
    // Normalize color histogram
    let histSum = 0;
    for (let k = 0; k < 16; k++) histSum += colorHist[k];
    if (histSum > 0) {
      for (let k = 0; k < 16; k++) colorHist[k] /= histSum;
    }

    return {
      normalized,
      edgeMag,
      edgeDir,
      colorHist,
      mean,
      stdDev
    };
  }

  // Center-Weighted Zero-Mean Normalized Cross Correlation
  computeWeightedZNCC(normA, normB) {
    let dot = 0;
    const len = normA.length;
    const weights = this.saliencyWeights;

    for (let i = 0; i < len; i++) {
      dot += normA[i] * normB[i] * weights[i];
    }
    return dot / len;
  }

  // Structural Silhouette & Edge Similarity
  computeEdgeSimilarity(magA, dirA, magB, dirB) {
    let dot = 0;
    let sumA = 0;
    let sumB = 0;
    const len = magA.length;

    for (let i = 0; i < len; i++) {
      const mA = magA[i];
      const mB = magB[i];
      if (mA > 5.0 && mB > 5.0) {
        // Alignment between gradient vectors
        const angleDiff = Math.cos(dirA[i] - dirB[i]);
        const weight = Math.max(0, angleDiff);
        dot += mA * mB * weight;
      }
      sumA += mA * mA;
      sumB += mB * mB;
    }

    const denom = Math.sqrt(sumA * sumB);
    if (denom < 1e-4) return 0.5;
    return Math.min(1.0, dot / denom);
  }

  // Color Histogram Intersection (Bhattacharyya Coefficient)
  computeColorSimilarity(histA, histB) {
    let bhattacharyya = 0;
    for (let i = 0; i < histA.length; i++) {
      bhattacharyya += Math.sqrt(histA[i] * histB[i]);
    }
    return Math.max(0, Math.min(1.0, bhattacharyya));
  }

  normalizeVector(vec) {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
    const mag = Math.sqrt(sumSq) || 1e-7;
    const res = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i++) res[i] = vec[i] / mag;
    return res;
  }

  computeCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return Math.max(0, Math.min(1.0, dot));
  }

  // Real-Time Frame Comparison with Multi-Scale Pyramid Analysis
  compareLiveFrame(videoElement) {
    if (this.manualBoost > 0) {
      this.currentScore = this.manualBoost;
      return this.currentScore;
    }

    if (!this.referenceData || !videoElement || videoElement.readyState < 2) {
      return this.currentScore;
    }

    try {
      const vw = videoElement.videoWidth || 640;
      const vh = videoElement.videoHeight || 480;
      const minDim = Math.min(vw, vh);

      // Multi-Scale Pyramid Evaluation:
      // Test 3 scales to handle standing closer (0.85x), standard (1.0x), and further away (1.18x)
      const scales = [1.0, 0.85, 1.18];
      let bestScaleScore = 0;

      for (let s = 0; s < scales.length; s++) {
        const cropSize = Math.floor(minDim * scales[s]);
        const sx = Math.max(0, Math.min(vw - cropSize, (vw - cropSize) / 2));
        const sy = Math.max(0, Math.min(vh - cropSize, (vh - cropSize) / 2));

        this.liveCtx.drawImage(videoElement, sx, sy, cropSize, cropSize, 0, 0, this.GRID_SIZE, this.GRID_SIZE);
        const liveImgData = this.liveCtx.getImageData(0, 0, this.GRID_SIZE, this.GRID_SIZE);

        // Low variance check (pitch dark / finger over lens)
        const liveData = this.computeMultiFeatureDescriptor(liveImgData);
        if (liveData.stdDev < 10.0) {
          // Camera covered or pointing at featureless white/black
          continue;
        }

        // 1. ZNCC Score (Illumination-invariant correlation: -1.0 to +1.0)
        const zncc = this.computeWeightedZNCC(this.referenceData.normalized, liveData.normalized);
        const znccScore = Math.max(0, Math.min(1.0, (zncc + 0.12) / 0.88));

        // 2. Edge & Silhouette Similarity (0.0 to 1.0)
        const edgeScore = this.computeEdgeSimilarity(
          this.referenceData.edgeMag,
          this.referenceData.edgeDir,
          liveData.edgeMag,
          liveData.edgeDir
        );

        // 3. Color Profile Histogram Similarity (0.0 to 1.0)
        const colorScore = this.computeColorSimilarity(this.referenceData.colorHist, liveData.colorHist);

        // Multi-modal composite score
        const composite = znccScore * 0.50 + edgeScore * 0.32 + colorScore * 0.18;
        if (composite > bestScaleScore) {
          bestScaleScore = composite;
        }
      }

      // Background MobileNet Deep AI Check (runs every ~1.2s when target is warm)
      let aiBonus = 0;
      const now = Date.now();
      if (this.aiModel && this.refAiEmbedding && (now - this.lastAiEvalTime > 1200) && !this.isAiEvaluating) {
        if (bestScaleScore > 0.35) {
          this.triggerAsyncAiEvaluation(videoElement);
        }
      }

      if (this.lastAiScore > 0.60) {
        aiBonus = (this.lastAiScore - 0.60) * 0.35; // Up to +14% deep neural boost
      }

      // Final calibrated percentage
      let rawPct = Math.round((bestScaleScore + aiBonus) * 100);
      const targetThreshold = this.thresholds[this.sensitivity] || 55;

      let scaledScore = 0;
      if (rawPct >= targetThreshold) {
        const extra = (rawPct - targetThreshold) / (100 - targetThreshold);
        scaledScore = Math.min(100, Math.round(85 + extra * 15));
      } else {
        scaledScore = Math.round((rawPct / targetThreshold) * 78);
      }

      // Asymmetric Temporal Filter: rises fast (alpha 0.65), decays smoothly (alpha 0.20)
      const alpha = scaledScore > this.currentScore ? 0.65 : 0.20;
      this.currentScore = Math.round(this.currentScore * (1.0 - alpha) + scaledScore * alpha);

      return this.currentScore;
    } catch (e) {
      return this.currentScore;
    }
  }

  // Non-blocking Asynchronous MobileNet Deep AI Inference
  async triggerAsyncAiEvaluation(videoElement) {
    this.isAiEvaluating = true;
    this.lastAiEvalTime = Date.now();

    try {
      const vw = videoElement.videoWidth || 640;
      const vh = videoElement.videoHeight || 480;
      const minDim = Math.min(vw, vh);
      const sx = (vw - minDim) / 2;
      const sy = (vh - minDim) / 2;

      this.aiCtx.drawImage(videoElement, sx, sy, minDim, minDim, 0, 0, this.AI_SIZE, this.AI_SIZE);
      const tensor = window.tf.browser.fromPixels(this.aiCanvas);
      const activation = this.aiModel.infer(tensor, true);
      const raw = await activation.data();
      const liveEmbedding = this.normalizeVector(raw);

      tensor.dispose();
      activation.dispose();

      this.lastAiScore = this.computeCosineSimilarity(this.refAiEmbedding, liveEmbedding);
    } catch (e) {
    } finally {
      this.isAiEvaluating = false;
    }
  }

  // Synchronous High-Confidence Instant Landmark Scan (One-Tap Trigger)
  async verifyInstantScan(videoElement) {
    if (!this.referenceData || !videoElement) {
      return { success: false, score: this.currentScore };
    }

    try {
      const vw = videoElement.videoWidth || 640;
      const vh = videoElement.videoHeight || 480;
      const minDim = Math.min(vw, vh);

      // Multi-scale scan on button tap
      const scales = [1.0, 0.82, 1.18, 0.72];
      let bestComposite = 0;

      for (let s = 0; s < scales.length; s++) {
        const cropSize = Math.floor(minDim * scales[s]);
        const sx = Math.max(0, Math.min(vw - cropSize, (vw - cropSize) / 2));
        const sy = Math.max(0, Math.min(vh - cropSize, (vh - cropSize) / 2));

        this.liveCtx.drawImage(videoElement, sx, sy, cropSize, cropSize, 0, 0, this.GRID_SIZE, this.GRID_SIZE);
        const liveImgData = this.liveCtx.getImageData(0, 0, this.GRID_SIZE, this.GRID_SIZE);
        const liveData = this.computeMultiFeatureDescriptor(liveImgData);

        const zncc = this.computeWeightedZNCC(this.referenceData.normalized, liveData.normalized);
        const znccScore = Math.max(0, Math.min(1.0, (zncc + 0.12) / 0.88));

        const edgeScore = this.computeEdgeSimilarity(
          this.referenceData.edgeMag,
          this.referenceData.edgeDir,
          liveData.edgeMag,
          liveData.edgeDir
        );

        const colorScore = this.computeColorSimilarity(this.referenceData.colorHist, liveData.colorHist);
        const composite = znccScore * 0.50 + edgeScore * 0.32 + colorScore * 0.18;

        if (composite > bestComposite) {
          bestComposite = composite;
        }
      }

      // Execute Deep AI MobileNet inference if available
      let deepAiScore = 0;
      if (this.aiModel && this.refAiEmbedding) {
        try {
          const sx = (vw - minDim) / 2;
          const sy = (vh - minDim) / 2;
          this.aiCtx.drawImage(videoElement, sx, sy, minDim, minDim, 0, 0, this.AI_SIZE, this.AI_SIZE);
          const tensor = window.tf.browser.fromPixels(this.aiCanvas);
          const activation = this.aiModel.infer(tensor, true);
          const raw = await activation.data();
          const liveEmbedding = this.normalizeVector(raw);
          tensor.dispose();
          activation.dispose();

          deepAiScore = this.computeCosineSimilarity(this.refAiEmbedding, liveEmbedding);
          this.lastAiScore = deepAiScore;
        } catch (err) {}
      }

      // Deep AI weight
      let finalComposite = bestComposite;
      if (deepAiScore > 0) {
        finalComposite = bestComposite * 0.75 + deepAiScore * 0.25;
      }

      const score = Math.round(finalComposite * 100);
      const threshold = this.thresholds[this.sensitivity] || 55;

      // On direct tap, grant match if within 12% of threshold or if deep AI confidence > 65%
      const isMatch = score >= (threshold - 12) || deepAiScore >= 0.65;

      if (isMatch) {
        this.setManualBoost(95);
      }

      return {
        success: isMatch,
        score: isMatch ? Math.max(88, score) : score,
        deepAiScore: Math.round(deepAiScore * 100)
      };
    } catch (e) {
      return { success: false, score: this.currentScore };
    }
  }

  setSensitivity(level) {
    if (this.thresholds[level]) {
      this.sensitivity = level;
    }
  }

  setManualBoost(boostVal) {
    this.manualBoost = Math.max(0, Math.min(100, boostVal));
    this.currentScore = this.manualBoost;
  }
}

export const visualMatcher = new RobustVisionMatcher();

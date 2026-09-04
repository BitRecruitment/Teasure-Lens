// Three.js AR 3D Scene with Procedural Treasure Chest, Dirt Mound, & Particle FX
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class ARDigScene {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animId = null;

    // 3D Objects
    this.chestGroup = null;
    this.chestLid = null;
    this.dirtMound = null;
    this.runeRing = null;
    this.innerLight = null;

    // Digging State
    this.digCount = 0;
    this.maxDigs = 5;
    this.isOpened = false;
    this.particles = [];

    // Orientation smoothing
    this.targetPitch = 0;
    this.targetRoll = 0;

    this.init();
  }

  init() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);
    this.camera.position.set(0, 1.5, 2.8);
    this.camera.lookAt(0, -0.2, 0);

    // 2. WebGL Renderer with Alpha (Transparent background over live camera!)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    sunLight.position.set(3, 6, 4);
    this.scene.add(sunLight);

    // 4. Ground Rune Ring ("X marks the spot")
    this.createRuneTarget();

    // 5. Build Procedural Treasure Chest
    this.buildTreasureChest();

    // 6. Build Dirt Mound covering chest
    this.buildDirtMound();

    // 7. Handle window resize
    this.handleResize = () => {
      const w = this.canvas.clientWidth || window.innerWidth;
      const h = this.canvas.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this.handleResize);

    // 8. Device Orientation tilt tracking
    this.handleOrientation = (e) => {
      if (e.beta !== null && e.gamma !== null) {
        // Subtle tilt responsiveness matching phone movement
        const pitch = (e.beta - 60) * 0.005; // natural outdoor phone holding angle ~60 deg
        const roll = e.gamma * 0.005;
        this.camera.position.x = roll * 2;
        this.camera.position.y = 1.5 - pitch * 1.5;
        this.camera.lookAt(0, -0.2, 0);
      }
    };
    window.addEventListener('deviceorientation', this.handleOrientation);

    // 9. Start render loop
    this.render();
  }

  // Glowing ancient circle on the floor
  createRuneTarget() {
    const group = new THREE.Group();
    group.position.y = -0.55;

    // Outer Ring
    const ringGeo = new THREE.RingGeometry(1.4, 1.5, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    group.add(ringMesh);

    // Glowing Cross / X marks the spot
    const crossMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const beam1 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.2), crossMat);
    beam1.rotation.x = -Math.PI / 2;
    beam1.rotation.z = Math.PI / 4;
    const beam2 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.2), crossMat);
    beam2.rotation.x = -Math.PI / 2;
    beam2.rotation.z = -Math.PI / 4;
    group.add(beam1, beam2);

    this.runeRing = group;
    this.scene.add(group);
  }

  // Build 3D Treasure Chest using Three.js geometries
  buildTreasureChest() {
    this.chestGroup = new THREE.Group();
    this.chestGroup.position.set(0, -0.6, 0); // Sunk slightly into ground initially

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e16,
      roughness: 0.7,
      metalness: 0.1
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xdf9b19,
      metalness: 0.85,
      roughness: 0.3
    });

    // Lower Box Base
    const baseGeo = new THREE.BoxGeometry(1.4, 0.7, 0.9);
    const chestBase = new THREE.Mesh(baseGeo, woodMat);
    chestBase.position.y = 0.35;
    this.chestGroup.add(chestBase);

    // Brass Straps around Base
    const strapGeo = new THREE.BoxGeometry(1.42, 0.72, 0.1);
    const strapL = new THREE.Mesh(strapGeo, goldTrimMat);
    strapL.position.set(0, 0.35, -0.3);
    const strapR = new THREE.Mesh(strapGeo, goldTrimMat);
    strapR.position.set(0, 0.35, 0.3);
    this.chestGroup.add(strapL, strapR);

    // Keyhole Lock Box
    const lockGeo = new THREE.BoxGeometry(0.2, 0.25, 0.08);
    const lockMesh = new THREE.Mesh(lockGeo, goldTrimMat);
    lockMesh.position.set(0, 0.45, 0.48);
    this.chestGroup.add(lockMesh);

    // --- Hinged Chest Lid ---
    // Pivot anchor placed along the top back edge
    this.chestLid = new THREE.Group();
    this.chestLid.position.set(0, 0.7, -0.45); // hinge pivot

    // Curved arched lid top (Cylinder sliced in half)
    const lidGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.4, 24, 1, false, 0, Math.PI);
    const lidMesh = new THREE.Mesh(lidGeo, woodMat);
    lidMesh.rotation.z = Math.PI / 2;
    lidMesh.position.set(0, 0, 0.45);
    this.chestLid.add(lidMesh);

    // Lid Brass Straps
    const lidStrapGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.1, 24, 1, false, 0, Math.PI);
    const lidStrapL = new THREE.Mesh(lidStrapGeo, goldTrimMat);
    lidStrapL.rotation.z = Math.PI / 2;
    lidStrapL.position.set(-0.4, 0, 0.45);
    const lidStrapR = new THREE.Mesh(lidStrapGeo, goldTrimMat);
    lidStrapR.rotation.z = Math.PI / 2;
    lidStrapR.position.set(0.4, 0, 0.45);
    this.chestLid.add(lidStrapL, lidStrapR);

    this.chestGroup.add(this.chestLid);

    // Inside Treasures (Loot)
    const lootGroup = new THREE.Group();
    lootGroup.position.set(0, 0.45, 0);

    // Gold coins pile
    const coinGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12);
    for (let i = 0; i < 15; i++) {
      const coin = new THREE.Mesh(coinGeo, goldTrimMat);
      coin.position.set(
        (Math.random() - 0.5) * 0.9,
        Math.random() * 0.15,
        (Math.random() - 0.5) * 0.5
      );
      coin.rotation.set(Math.random() * 0.5, Math.random() * 3, Math.random() * 0.5);
      lootGroup.add(coin);
    }

    // Glowing Ruby Gem
    const gemGeo = new THREE.OctahedronGeometry(0.16);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.6
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0.1, 0.12, 0.05);
    lootGroup.add(gem);

    this.chestGroup.add(lootGroup);

    // Magical Inner Chest Light Beam
    this.innerLight = new THREE.PointLight(0xfbbf24, 0, 4);
    this.innerLight.position.set(0, 0.6, 0);
    this.chestGroup.add(this.innerLight);

    this.scene.add(this.chestGroup);
  }

  // Build Dirt Mound covering the chest before digging
  buildDirtMound() {
    const moundGeo = new THREE.SphereGeometry(1.1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const moundMat = new THREE.MeshStandardMaterial({
      color: 0x3d2714, // rich soil brown
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    });
    this.dirtMound = new THREE.Mesh(moundGeo, moundMat);
    this.dirtMound.scale.set(1.4, 0.75, 1.2);
    this.dirtMound.position.set(0, -0.55, 0);
    this.scene.add(this.dirtMound);
  }

  // Trigger Shovel Strike / Dig interaction
  performDig() {
    if (this.isOpened) return { progress: 1, completed: true };

    this.digCount++;
    const progress = Math.min(1, this.digCount / this.maxDigs);

    // 1. Shrink and flatten dirt mound
    if (this.dirtMound) {
      const remaining = 1 - progress;
      this.dirtMound.scale.y = Math.max(0.01, 0.75 * remaining);
      this.dirtMound.scale.x = Math.max(0.01, 1.4 * Math.sqrt(remaining));
      this.dirtMound.scale.z = Math.max(0.01, 1.2 * Math.sqrt(remaining));
      if (progress >= 1) {
        this.dirtMound.visible = false;
      }
    }

    // 2. Raise chest up out of the earth
    if (this.chestGroup) {
      this.chestGroup.position.y = -0.6 + (progress * 0.4);
    }

    // 3. Spawn flying dirt and spark particles
    this.spawnDirtParticles(35);

    // 4. Completed all digs -> Open chest!
    if (progress >= 1 && !this.isOpened) {
      this.openChest();
      return { progress: 1, completed: true };
    }

    return { progress, completed: false };
  }

  // Burst of 3D dirt clumps and golden sparks
  spawnDirtParticles(count = 30) {
    const dirtColor = 0x54361a;
    const goldColor = 0xf59e0b;

    for (let i = 0; i < count; i++) {
      const isGold = Math.random() > 0.7;
      const size = isGold ? 0.035 : 0.06 + Math.random() * 0.05;
      const geo = new THREE.DodecahedronGeometry(size);
      const mat = new THREE.MeshBasicMaterial({
        color: isGold ? goldColor : dirtColor,
        transparent: true,
        opacity: 0.95
      });
      const p = new THREE.Mesh(geo, mat);

      // Random position centered on mound
      p.position.set(
        (Math.random() - 0.5) * 1.2,
        -0.2 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.9
      );

      // Velocity: fly upwards and outwards
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.0;
      p.userData = {
        vx: Math.cos(angle) * (speed * 0.6),
        vy: 2.5 + Math.random() * 2.5, // upward force
        vz: Math.sin(angle) * (speed * 0.6),
        rotX: Math.random() * 10 - 5,
        rotY: Math.random() * 10 - 5,
        life: 1.0 // fade out timer
      };

      this.particles.push(p);
      this.scene.add(p);
    }
  }

  // Open chest lid and shine golden light
  openChest() {
    this.isOpened = true;
    let openProgress = 0;

    const animateOpen = () => {
      if (openProgress < 1) {
        openProgress += 0.035;
        // Rotate lid open around hinge (-110 degrees)
        if (this.chestLid) {
          this.chestLid.rotation.x = -Math.sin(openProgress * Math.PI * 0.5) * 1.95;
        }
        // Increase inner light radiance
        if (this.innerLight) {
          this.innerLight.intensity = openProgress * 4.0;
        }
        requestAnimationFrame(animateOpen);
      }
    };
    animateOpen();

    // Golden sparkles celebration
    this.spawnDirtParticles(50);
  }

  // Main Render Loop
  render() {
    this.animId = requestAnimationFrame(() => this.render());

    // Rotate ground rune ring
    if (this.runeRing) {
      this.runeRing.rotation.y += 0.008;
    }

    // Animate flying particles
    const dt = 0.016;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;

      // Gravity pulling dirt back down
      p.userData.vy -= 9.8 * dt;

      // Spin
      p.rotation.x += p.userData.rotX * dt;
      p.rotation.y += p.userData.rotY * dt;

      // Fade out
      p.userData.life -= dt * 1.3;
      p.material.opacity = Math.max(0, p.userData.life);

      if (p.userData.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
    this.renderer.render(this.scene, this.camera);
  }

  // Smoothly reset 3D excavation state for the next riddle without tearing down WebGL
  resetDigState() {
    this.digCount = 0;
    this.isOpened = false;

    // Reset chest lid and position
    if (this.chestLid) {
      this.chestLid.rotation.x = 0;
    }
    if (this.chestGroup) {
      this.chestGroup.position.y = -0.6;
    }

    // Reset inner glow light
    if (this.innerLight) {
      this.innerLight.intensity = 0;
    }

    // Restore dirt mound
    if (this.dirtMound) {
      this.dirtMound.scale.set(1, 1, 1);
      this.dirtMound.visible = true;
    }

    // Clean up remaining particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      this.scene.remove(p);
      if (p.geometry) p.geometry.dispose();
      if (p.material) p.material.dispose();
    }
    this.particles = [];
  }


  destroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('deviceorientation', this.handleOrientation);
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

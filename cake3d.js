/* =====================================================================
   CAKE3D.JS — loads the chosen cake's .glb, loads candle.glb and places
   it on top of the cake (positioned from the cake's own bounding box),
   gives the candle a real animated flame (glow sprite + flickering
   light), and lets the celebrant blow it out via mic, with a manual
   fallback. Loaded as type="module" so it can import Three.js from
   the CDN.
   ===================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const CANDLE_MODEL_PATH = 'models/candle.glb';
const CANDLE_TARGET_HEIGHT = 0.45; // world units — tweak if candle looks too big/small

// Builds a soft radial-glow texture on the fly — used for the flame sprite.
function createFlameTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0.0, 'rgba(255,255,220,1)');
  gradient.addColorStop(0.25, 'rgba(255,200,80,0.95)');
  gradient.addColorStop(0.55, 'rgba(255,120,30,0.55)');
  gradient.addColorStop(1.0, 'rgba(255,80,0,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const CakeCelebration3D = (() => {
  let container, scene, camera, renderer, controls;
  let currentModel = null;
  let candleGroup = null;
  let flameLight = null;
  let flameSprite = null;
  let flameTexture = null;
  let flameLit = true;
  let sceneReady = false;
  let rotationGroup = null;
  const clock = new THREE.Clock();
  const loader = new GLTFLoader();

  let micState = { stream: null, audioCtx: null, listening: false };

  function ensureScene() {
    if (sceneReady) return;
    container = document.getElementById('cake-3d-container');
    if (!container) return;

    scene = new THREE.Scene();

    rotationGroup = new THREE.Group();
    scene.add(rotationGroup);

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.7, 3.6);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.6;
    controls.maxDistance = 7;
    controls.enablePan = false;
    controls.target.set(0, 0.9, 0);

    scene.add(new THREE.HemisphereLight(0xfff2f2, 0x1a0206, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff6b81, 0.7);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    window.addEventListener('resize', onResize);
    onResize();
    sceneReady = true;
    animate();
  }

  function onResize() {
    if (!container || !renderer || !camera) return;
    const size = container.clientWidth || 320;
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  function disposeObject(obj) {
    obj.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          for (const key in m) {
            if (m[key] && m[key].isTexture) m[key].dispose();
          }
          m.dispose();
        });
      }
    });
  }

  function clearCurrent() {
    if (currentModel) {
      rotationGroup.remove(currentModel);
      disposeObject(currentModel);
      currentModel = null;
    }
    if (candleGroup) {
      rotationGroup.remove(candleGroup);
      disposeObject(candleGroup);
      candleGroup = null;
      flameLight = null;
    }
    if (flameSprite) {
      rotationGroup.remove(flameSprite);
      flameSprite.material.dispose();
      flameSprite = null;
    }
  }

  function frameModel(obj) {
    let box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.8 / maxDim;
    obj.scale.setScalar(scale);

    box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box.getCenter(center);
    obj.position.x -= center.x;
    obj.position.z -= center.z;

    box = new THREE.Box3().setFromObject(obj);
    obj.position.y -= box.min.y;

    return new THREE.Box3().setFromObject(obj);
  }

  // Loads candle.glb, scales it to CANDLE_TARGET_HEIGHT, places its base
  // at `topCenter` (the top-center point of the cake's bounding box),
  // and adds a real flame (glow sprite + flickering point light) at the tip.
  function loadCandleOnTop(topCenter) {
    loader.load(
      CANDLE_MODEL_PATH,
      (gltf) => {
        const candle = gltf.scene;

        // Scale candle to a fixed height regardless of the cake's size.
        const box = new THREE.Box3().setFromObject(candle);
        const size = new THREE.Vector3();
        box.getSize(size);
        const rawHeight = size.y || 1;
        const scale = CANDLE_TARGET_HEIGHT / rawHeight;
        candle.scale.setScalar(scale);

        // Re-measure after scaling, then sit its base exactly on topCenter.
        const scaledBox = new THREE.Box3().setFromObject(candle);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);

        candle.position.x += topCenter.x - scaledCenter.x;
        candle.position.z += topCenter.z - scaledCenter.z;
        candle.position.y += topCenter.y - scaledBox.min.y;

        rotationGroup.add(candle);
        candleGroup = candle;

        const flameTipY = topCenter.y + CANDLE_TARGET_HEIGHT * 0.98;

        // Warm point light near the flame tip to cast glow onto the cake/candle.
        const light = new THREE.PointLight(0xffa64d, 1.4, 2.4, 2);
        light.position.set(topCenter.x, topCenter.y + CANDLE_TARGET_HEIGHT * 0.95, topCenter.z);
        rotationGroup.add(light);
        flameLight = light;

        // The actual visible flame — a billboarded sprite using a
        // generated glow texture so it always faces the camera.
        if (!flameTexture) flameTexture = createFlameTexture();

        const flameMaterial = new THREE.SpriteMaterial({
          map: flameTexture,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        });
        const flame = new THREE.Sprite(flameMaterial);
        flame.scale.set(0.16, 0.26, 1); // narrower than tall, like a real flame
        flame.position.set(topCenter.x, flameTipY, topCenter.z);
        rotationGroup.add(flame);
        flameSprite = flame;

        flameLit = true;
      },
      undefined,
      (error) => {
        console.error('[CakeCelebration3D] Failed to load candle model:', CANDLE_MODEL_PATH, error);
      }
    );
  }

  function loadCake(cake) {
    ensureScene();
    if (!sceneReady) return;

    clearCurrent();
    resetWishUI();
    rotationGroup.rotation.set(0, 0, 0);

    loader.load(
      cake.model,
      (gltf) => {
        const model = gltf.scene;
        rotationGroup.add(model);
        const box = frameModel(model);
        currentModel = model;

        const topCenter = new THREE.Vector3(
          (box.min.x + box.max.x) / 2,
          box.max.y,
          (box.min.z + box.max.z) / 2
        );

        loadCandleOnTop(topCenter);

        controls.target.set(topCenter.x, topCenter.y * 0.55, topCenter.z);
      },
      undefined,
      (error) => {
        console.error('[CakeCelebration3D] Failed to load cake model:', cake.model, error);
      }
    );
  }

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (flameLight && flameLit) {
      flameLight.intensity = 1.2 + Math.sin(t * 20) * 0.25;
    }

    if (flameSprite && flameLit) {
      const flicker = Math.sin(t * 18) * 0.06 + Math.sin(t * 37) * 0.03;
      flameSprite.scale.set(0.16 + flicker, 0.26 + flicker * 1.4, 1);
      flameSprite.material.opacity = 0.85 + Math.sin(t * 25) * 0.15;
    }

    if (rotationGroup && currentModel) {
      rotationGroup.rotation.y += 0.006; // slow continuous spin
    }

    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function resetFlame() {
    flameLit = true;
    if (flameLight) flameLight.visible = true;
    if (flameSprite) flameSprite.visible = true;
  }

  function extinguish() {
    if (!flameLit) return;
    flameLit = false;
    if (flameLight) flameLight.visible = false;
    if (flameSprite) flameSprite.visible = false;
  }

  async function startListening(onBlow) {
    stopListening();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.fftSize);

      micState = { stream, audioCtx, listening: true };

      const THRESHOLD = 0.11;
      const NEEDED_FRAMES = 5;
      let sustained = 0;

      const tick = () => {
        if (!micState.listening) return;
        analyser.getByteTimeDomainData(dataArray);

        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);

        if (rms > THRESHOLD) { sustained++; } else { sustained = Math.max(0, sustained - 1); }

        if (sustained >= NEEDED_FRAMES) {
          stopListening();
          onBlow();
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
      return true;
    } catch (err) {
      console.error('[CakeCelebration3D] Mic access failed:', err);
      return false;
    }
  }

  function stopListening() {
    if (micState.listening) {
      if (micState.stream) micState.stream.getTracks().forEach((t) => t.stop());
      if (micState.audioCtx) micState.audioCtx.close();
    }
    micState = { stream: null, audioCtx: null, listening: false };
  }

  function resetWishUI() {
    const wishBtn = document.getElementById('make-a-wish-3d-btn');
    const wishResult = document.getElementById('wish-result');
    const micStatus = document.getElementById('mic-status');
    if (wishBtn) { wishBtn.hidden = false; wishBtn.disabled = false; }
    if (wishResult) wishResult.hidden = true;
    if (micStatus) micStatus.textContent = '';
  }

  function bindWishButton() {
    const wishBtn = document.getElementById('make-a-wish-3d-btn');
    const wishResult = document.getElementById('wish-result');
    const micStatus = document.getElementById('mic-status');
    if (!wishBtn || wishBtn.dataset.bound) return;
    wishBtn.dataset.bound = '1';

    const reveal = () => {
      if (wishResult) wishResult.hidden = false;
      wishBtn.hidden = true;
      if (micStatus) micStatus.textContent = '';
      if (window.Particles) {
        window.Particles.confettiBurst(50);
        window.Particles.floatingHearts(10);
      }
    };

    wishBtn.addEventListener('click', async () => {
      wishBtn.disabled = true;
      if (micStatus) micStatus.textContent = 'Listening for your breath... blow now! 🌬️';

      const ok = await startListening(() => { extinguish(); reveal(); });

      if (!ok) {
        if (micStatus) micStatus.textContent = "Couldn't access the mic — blowing it out for you instead.";
        setTimeout(() => { extinguish(); reveal(); }, 900);
      }
    });
  }

  function start() { ensureScene(); bindWishButton(); }

  function reset() {
    resetFlame();
    resetWishUI();
    stopListening();
    onResize();
  }

  return { start, reset, loadCake, extinguish, resetFlame, startListening, stopListening };
})();

window.CakeCelebration3D = CakeCelebration3D;
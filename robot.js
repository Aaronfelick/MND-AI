// ============================================================================
// BIZBOT 3D HERO ROBOT — Three.js animated mascot
// Floating robot with mouse tracking, blinking eyes, waving arm and a chest
// panel that opens to reveal a glowing AI core. Falls back to the static chat
// mockup if WebGL or the Three.js CDN is unavailable.
//
// Loaded as a classic script (no modules) so it works when index.html is
// opened directly from disk as well as from a web server.
// ============================================================================

(function () {

  const stage  = document.getElementById('robotStage');
  const canvas = document.getElementById('robotCanvas');
  const heroVisual = document.getElementById('heroVisual');

  function disable3d(reason) {
    console.warn('BizBot 3D robot disabled:', reason);
    if (heroVisual) heroVisual.classList.add('no-3d');
  }

  if (!stage || !canvas) return;
  if (typeof THREE === 'undefined' || !THREE.RoundedBoxGeometry) {
    disable3d('Three.js failed to load (offline or CDN blocked)');
    return;
  }

  const COLORS = {
    light: { body: 0xf4f2ec, panel: 0xeae7df, joint: 0x35353c, screen: 0x121216 },
    dark:  { body: 0x3c3c46, panel: 0x34343c, joint: 0x55555f, screen: 0x0a0a0e }
  };
  const ACCENT = 0xff5c2b;

  function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  try {
    init();
  } catch (err) {
    disable3d(err);
  }

  function init() {
    // ── Renderer / scene / camera ──
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 0.55, 8.2);
    camera.lookAt(0, 0.15, 0);

    // ── Lights ──
    const hemi = new THREE.HemisphereLight(0xffffff, 0x778899, 0.9);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(3, 5, 4);
    scene.add(key);
    const warm = new THREE.PointLight(ACCENT, 0.7, 12);
    warm.position.set(-2.5, 0.5, 3);
    scene.add(warm);

    // ── Materials ──
    const bodyMat   = new THREE.MeshStandardMaterial({ color: COLORS.light.body,  roughness: 0.38, metalness: 0.15 });
    const panelMat  = new THREE.MeshStandardMaterial({ color: COLORS.light.panel, roughness: 0.45, metalness: 0.12 });
    const jointMat  = new THREE.MeshStandardMaterial({ color: COLORS.light.joint, roughness: 0.5,  metalness: 0.35 });
    const screenMat = new THREE.MeshStandardMaterial({ color: COLORS.light.screen, roughness: 0.25, metalness: 0.1 });
    const accentMat = new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.4, metalness: 0.1 });
    const eyeMat    = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMat   = new THREE.MeshBasicMaterial({ color: ACCENT });
    const glowMat   = new THREE.MeshBasicMaterial({ color: 0xffa07a });

    // ── Robot assembly ──
    const robot = new THREE.Group();
    scene.add(robot);

    // Torso
    const torso = new THREE.Mesh(new THREE.RoundedBoxGeometry(1.55, 1.5, 1.05, 5, 0.3), bodyMat);
    robot.add(torso);

    // Chest recess + glowing core
    const chestScreen = new THREE.Mesh(new THREE.RoundedBoxGeometry(1.0, 0.9, 0.14, 4, 0.06), screenMat);
    chestScreen.position.set(0, 0.02, 0.48);
    robot.add(chestScreen);

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), coreMat);
    core.position.set(0, 0.02, 0.45);
    robot.add(core);
    const coreHalo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshBasicMaterial({
      color: ACCENT, transparent: true, opacity: 0.25
    }));
    coreHalo.position.copy(core.position);
    robot.add(coreHalo);
    const coreLight = new THREE.PointLight(ACCENT, 0, 4);
    coreLight.position.set(0, 0.02, 1.0);
    robot.add(coreLight);

    // Chest panel doors (hinged at outer edges, swing open to reveal the core)
    function makeDoor(side) { // side: -1 left, +1 right
      const hinge = new THREE.Group();
      hinge.position.set(side * 0.53, 0.02, 0.62);
      const door = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.52, 0.92, 0.1, 4, 0.05), panelMat);
      door.position.x = -side * 0.26;
      hinge.add(door);
      robot.add(hinge);
      return hinge;
    }
    const doorL = makeDoor(-1);
    const doorR = makeDoor(1);

    // Waist accent stripe
    const waist = new THREE.Mesh(new THREE.RoundedBoxGeometry(1.1, 0.18, 0.85, 3, 0.08), accentMat);
    waist.position.y = -0.8;
    robot.add(waist);

    // Head group (tracks the mouse independently of the body)
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.42;
    robot.add(headGroup);

    const head = new THREE.Mesh(new THREE.RoundedBoxGeometry(1.75, 1.3, 1.2, 5, 0.34), bodyMat);
    headGroup.add(head);

    const face = new THREE.Mesh(new THREE.RoundedBoxGeometry(1.3, 0.82, 0.12, 4, 0.06), screenMat);
    face.position.set(0, -0.04, 0.58);
    headGroup.add(face);

    // Eyes (capsules so blinking by squashing looks natural)
    const eyeGeo = new THREE.CapsuleGeometry(0.075, 0.12, 4, 12);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.29, 0.04, 0.66);
    eyeR.position.set(0.29, 0.04, 0.66);
    headGroup.add(eyeL);
    headGroup.add(eyeR);

    // Smile (lower half torus)
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 8, 20, Math.PI), eyeMat);
    mouth.position.set(0, -0.22, 0.66);
    mouth.rotation.z = Math.PI;
    headGroup.add(mouth);

    // Side "ears"
    const earGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.14, 20);
    const earL = new THREE.Mesh(earGeo, accentMat);
    earL.rotation.z = Math.PI / 2;
    earL.position.set(-0.93, 0, 0);
    const earR = earL.clone();
    earR.position.x = 0.93;
    headGroup.add(earL);
    headGroup.add(earR);

    // Antenna with pulsing tip
    const antennaRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.38, 10), jointMat);
    antennaRod.position.y = 0.82;
    headGroup.add(antennaRod);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), coreMat);
    antennaTip.position.y = 1.05;
    headGroup.add(antennaTip);

    // Arms (shoulder pivot groups so the right arm can wave)
    function makeArm(side) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 1.0, 0.42, 0);
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16), jointMat);
      shoulder.add(joint);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.52, 4, 12), bodyMat);
      arm.position.y = -0.42;
      shoulder.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.185, 16, 16), accentMat);
      hand.position.y = -0.82;
      shoulder.add(hand);
      shoulder.rotation.z = side * 0.22; // resting pose, slightly out
      robot.add(shoulder);
      return shoulder;
    }
    const armL = makeArm(-1);
    const armR = makeArm(1);
    const armRestL = armL.rotation.z;
    const armRestR = armR.rotation.z;

    // Hover skirt + thruster glow (no legs — he floats)
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.3, 0.42, 24), jointMat);
    skirt.position.y = -1.05;
    robot.add(skirt);
    const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 20, 1, true), glowMat);
    thruster.material.transparent = true;
    thruster.material.opacity = 0.55;
    thruster.rotation.x = Math.PI;
    thruster.position.y = -1.45;
    robot.add(thruster);
    const thrusterLight = new THREE.PointLight(ACCENT, 0.6, 4);
    thrusterLight.position.y = -1.5;
    robot.add(thrusterLight);

    // Orbit ring with three satellites (techy accent around the bot)
    const ring = new THREE.Group();
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.012, 8, 80),
      new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.32 })
    );
    ring.add(ringMesh);
    const satellites = [];
    for (let i = 0; i < 3; i++) {
      const sat = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), coreMat);
      ring.add(sat);
      satellites.push(sat);
    }
    ring.rotation.x = Math.PI / 2.25;
    ring.position.y = -0.1;
    scene.add(ring);

    // Soft ground shadow (radial gradient canvas texture)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext('2d');
    const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.34)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -2.2;
    scene.add(shadow);

    // ── Theme sync (robot recolours when the site theme toggles) ──
    function applyTheme() {
      const c = isDarkMode() ? COLORS.dark : COLORS.light;
      bodyMat.color.setHex(c.body);
      panelMat.color.setHex(c.panel);
      jointMat.color.setHex(c.joint);
      screenMat.color.setHex(c.screen);
      hemi.intensity = isDarkMode() ? 0.6 : 0.9;
      warm.intensity = isDarkMode() ? 1.1 : 0.7;
    }
    applyTheme();
    new MutationObserver(applyTheme)
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // ── Mouse tracking ──
    const mouse = { x: 0, y: 0 };
    window.addEventListener('mousemove', function (e) {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // ── Resize ──
    function resize() {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Animation helpers ──
    const lerp = THREE.MathUtils.lerp;
    const clamp01 = function (v) { return Math.min(1, Math.max(0, v)); };
    const easeOut = function (v) { return 1 - Math.pow(1 - v, 3); };
    // smooth 0→1→0 envelope: rises over `rise`s, holds, falls over `fall`s
    function envelope(phase, start, end, rise, fall) {
      if (phase < start || phase > end) return 0;
      const inE  = clamp01((phase - start) / rise);
      const outE = clamp01((end - phase) / fall);
      return easeOut(inE) * easeOut(outE);
    }

    const clock = new THREE.Clock();
    let nextBlink = 2.2;
    let blinkAt = -10;

    const WAVE_PERIOD = 7.5;   // wave once per cycle
    const CHEST_PERIOD = 11;   // chest opens once per cycle

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Entry pop-in
      const entry = easeOut(clamp01(t / 1.4));
      robot.scale.setScalar(entry);

      // Idle hover bob + gentle sway
      const bob = Math.sin(t * 1.5) * 0.13;
      robot.position.y = bob + 0.05;
      robot.rotation.z = Math.sin(t * 0.7) * 0.025;

      // Mouse-follow: body turns a little, head turns more
      robot.rotation.y = lerp(robot.rotation.y, mouse.x * 0.38, 0.05);
      robot.rotation.x = lerp(robot.rotation.x, mouse.y * 0.12, 0.05);
      headGroup.rotation.y = lerp(headGroup.rotation.y, mouse.x * 0.32, 0.07);
      headGroup.rotation.x = lerp(headGroup.rotation.x, mouse.y * 0.22, 0.07);

      // Blinking
      if (t > nextBlink) { blinkAt = t; nextBlink = t + 2.4 + Math.random() * 2.4; }
      const sinceBlink = t - blinkAt;
      const blink = sinceBlink < 0.16 ? 1 - Math.abs(sinceBlink / 0.08 - 1) : 0;
      const eyeScaleY = 1 - blink * 0.92;
      eyeL.scale.y = eyeScaleY;
      eyeR.scale.y = eyeScaleY;

      // Waving right arm
      const wavePhase = t % WAVE_PERIOD;
      const waveEnv = envelope(wavePhase, 1.2, 3.4, 0.45, 0.45);
      armR.rotation.z = armRestR + waveEnv * (2.45 + Math.sin(t * 11) * 0.28);
      armL.rotation.z = armRestL - Math.sin(t * 1.5 + 1) * 0.06; // subtle idle swing

      // Chest panel opening — doors swing, core flares and spins
      const chestPhase = t % CHEST_PERIOD;
      const open = envelope(chestPhase, 4.0, 8.0, 0.6, 0.6);
      doorL.rotation.y = -open * 1.85;
      doorR.rotation.y =  open * 1.85;
      const corePulse = 1 + Math.sin(t * 6) * 0.08;
      core.scale.setScalar((0.85 + open * 0.55) * corePulse);
      coreHalo.scale.setScalar((0.7 + open * 1.0) * corePulse);
      coreHalo.material.opacity = 0.12 + open * 0.3;
      core.rotation.y = t * 1.6;
      core.rotation.x = t * 0.9;
      coreLight.intensity = open * 1.6;

      // Antenna pulse + thruster flicker
      antennaTip.scale.setScalar(1 + Math.sin(t * 3.2) * 0.18);
      thruster.scale.y = 1 + Math.sin(t * 17) * 0.12 + bob * 0.4;
      thruster.material.opacity = 0.4 + Math.sin(t * 13) * 0.12;
      thrusterLight.intensity = 0.55 + Math.sin(t * 17) * 0.15;

      // Orbit ring + satellites
      ring.rotation.z = t * 0.25;
      satellites.forEach(function (sat, i) {
        const a = t * 0.55 + (i * Math.PI * 2) / 3;
        sat.position.set(Math.cos(a) * 2.05, Math.sin(a) * 2.05, 0);
      });

      // Ground shadow tracks the bob
      const drop = 1 - (bob + 0.13) / 0.26; // 0 high … 1 low
      shadow.material.opacity = 0.45 + drop * 0.4;
      shadow.scale.setScalar(0.85 + drop * 0.2);

      renderer.render(scene, camera);
    }
    animate();
  }

})();

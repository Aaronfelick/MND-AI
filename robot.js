(function () {
  const stage = document.getElementById('robotStage');
  const canvas = document.getElementById('robotCanvas');
  const hero = document.getElementById('heroVisual');

  function disable3d(reason) {
    console.warn('BizBot 3D robot disabled:', reason);
    if (stage) stage.style.display = 'none';
  }

  if (!stage || !canvas || !hero) return;
  if (typeof THREE === 'undefined' || !THREE.RoundedBoxGeometry) {
    disable3d('Three.js failed to load');
    return;
  }

  try {
    init();
  } catch (err) {
    disable3d(err);
  }

  function init() {
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0.32, 8.2);
    camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xe8f7ff, 0x1a294a, 0.95);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(4, 6, 6);
    scene.add(key);
    const fill = new THREE.PointLight(0x87d8ff, 0.65, 10);
    fill.position.set(-2, 2, 4);
    scene.add(fill);
    const rim = new THREE.PointLight(0x90a2ff, 0.42, 9);
    rim.position.set(2.5, -1, -1);
    scene.add(rim);

    const mats = {
      body: new THREE.MeshStandardMaterial({ color: 0xb8ddff, roughness: 0.42, metalness: 0.14 }),
      shell: new THREE.MeshStandardMaterial({ color: 0xd8ecff, roughness: 0.4, metalness: 0.1 }),
      trim: new THREE.MeshStandardMaterial({ color: 0x6ba0cd, roughness: 0.36, metalness: 0.25 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x2b3d5f, roughness: 0.3, metalness: 0.22 }),
      glow: new THREE.MeshBasicMaterial({ color: 0x95e7ff }),
      eye: new THREE.MeshBasicMaterial({ color: 0xc8f9ff })
    };

    const root = new THREE.Group();
    scene.add(root);
    root.position.set(0, 0.25, 0);

    const robot = new THREE.Group();
    root.add(robot);

    const torso = new THREE.Mesh(new THREE.RoundedBoxGeometry(1.58, 1.5, 1.08, 5, 0.28), mats.body);
    robot.add(torso);

    const chestPanel = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.95, 0.88, 0.1, 4, 0.07), mats.dark);
    chestPanel.position.set(0, 0.02, 0.48);
    robot.add(chestPanel);

    const chestGlyph = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.036, 14, 28, Math.PI * 1.78), mats.glow);
    chestGlyph.position.set(0, 0.05, 0.56);
    chestGlyph.rotation.z = Math.PI * 0.87;
    robot.add(chestGlyph);

    const chestDot = new THREE.Mesh(new THREE.SphereGeometry(0.047, 14, 14), mats.glow);
    chestDot.position.set(0.15, -0.14, 0.56);
    robot.add(chestDot);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.4, 0);
    robot.add(headPivot);

    const head = new THREE.Mesh(new THREE.RoundedBoxGeometry(1.76, 1.3, 1.25, 5, 0.34), mats.shell);
    headPivot.add(head);

    const face = new THREE.Mesh(new THREE.RoundedBoxGeometry(1.32, 0.84, 0.12, 5, 0.07), mats.dark);
    face.position.set(0, -0.02, 0.61);
    headPivot.add(face);

    const eyeGeo = new THREE.CapsuleGeometry(0.072, 0.12, 4, 12);
    const eyeL = new THREE.Mesh(eyeGeo, mats.eye);
    const eyeR = new THREE.Mesh(eyeGeo, mats.eye);
    eyeL.position.set(-0.28, 0.06, 0.67);
    eyeR.position.set(0.28, 0.06, 0.67);
    headPivot.add(eyeL);
    headPivot.add(eyeR);

    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.024, 8, 20, Math.PI), mats.eye);
    smile.position.set(0, -0.21, 0.67);
    smile.rotation.z = Math.PI;
    headPivot.add(smile);

    const cheekGeo = new THREE.SphereGeometry(0.032, 12, 12);
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xa8e6ff, transparent: true, opacity: 0.8 });
    const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    const cheekR = new THREE.Mesh(cheekGeo, cheekMat);
    cheekL.position.set(-0.48, -0.15, 0.67);
    cheekR.position.set(0.48, -0.15, 0.67);
    headPivot.add(cheekL);
    headPivot.add(cheekR);

    const earGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.17, 22);
    const earL = new THREE.Mesh(earGeo, mats.trim);
    earL.rotation.z = Math.PI / 2;
    earL.position.set(-0.93, 0.02, -0.01);
    const earR = earL.clone();
    earR.position.x = 0.93;
    headPivot.add(earL);
    headPivot.add(earR);

    const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.36, 14), mats.trim);
    antennaStem.position.y = 0.84;
    antennaStem.position.x = 0.1;
    headPivot.add(antennaStem);

    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), mats.glow);
    antennaTip.position.y = 1.07;
    antennaTip.position.x = 0.2;
    headPivot.add(antennaTip);

    function makeArm(side) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 1.03, 0.42, 0);
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), mats.trim);
      shoulder.add(joint);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.56, 5, 14), mats.shell);
      arm.position.y = -0.44;
      shoulder.add(arm);

      const hand = new THREE.Group();
      hand.position.y = -0.86;
      shoulder.add(hand);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), mats.body);
      hand.add(palm);
      for (let i = 0; i < 3; i++) {
        const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.12, 4, 8), mats.shell);
        finger.position.set((i - 1) * 0.08, 0.13 + i * 0.015, 0.03);
        finger.rotation.z = (i - 1) * -0.35;
        hand.add(finger);
      }
      shoulder.rotation.z = side > 0 ? 0.2 : -0.18;
      robot.add(shoulder);
      return shoulder;
    }

    const armL = makeArm(-1);
    const armR = makeArm(1);
    const armRestR = armR.rotation.z;
    const armRestL = armL.rotation.z;

    const hoverShell = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.34, 0.46, 24), mats.trim);
    hoverShell.position.y = -1.05;
    robot.add(hoverShell);

    const glowCone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.56, 20, 1, true), new THREE.MeshBasicMaterial({
      color: 0x9be7ff, transparent: true, opacity: 0.44
    }));
    glowCone.rotation.x = Math.PI;
    glowCone.position.y = -1.46;
    robot.add(glowCone);

    const glowLight = new THREE.PointLight(0x8fdfff, 0.7, 4);
    glowLight.position.y = -1.47;
    robot.add(glowLight);

    const orbit = new THREE.Group();
    const orbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.012, 8, 90),
      new THREE.MeshBasicMaterial({ color: 0x9dd6ff, transparent: true, opacity: 0.42 })
    );
    orbit.add(orbitRing);
    root.add(orbit);
    orbit.rotation.x = Math.PI / 2.3;
    orbit.position.y = -0.06;

    const satellites = [];
    for (let i = 0; i < 4; i++) {
      const sat = new THREE.Mesh(new THREE.SphereGeometry(0.043, 12, 12), mats.glow);
      satellites.push(sat);
      orbit.add(sat);
    }

    const miniCards = [];
    for (let i = 0; i < 2; i++) {
      const card = new THREE.Mesh(
        new THREE.RoundedBoxGeometry(0.7, 0.4, 0.04, 4, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.78 })
      );
      card.position.set(i === 0 ? -1.5 : 1.6, i === 0 ? -0.72 : -0.48, 0.35);
      card.rotation.y = i === 0 ? 0.45 : -0.4;
      root.add(card);
      miniCards.push(card);
    }

    const mouse = { x: 0, y: 0 };
    window.addEventListener('mousemove', function (e) {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    function resize() {
      const w = stage.clientWidth || 320;
      const h = stage.clientHeight || 400;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    const clock = new THREE.Clock();
    let nextBlinkAt = 1.8;
    let blinkStart = -10;

    function clamp01(v) {
      return Math.min(1, Math.max(0, v));
    }

    function heroProgress() {
      const rect = hero.getBoundingClientRect();
      const total = Math.max(hero.offsetHeight - window.innerHeight * 0.3, 1);
      return clamp01(-rect.top / total);
    }

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const p = heroProgress();
      const isMobile = window.matchMedia('(max-width: 860px)').matches;

      // Scroll linked motion: robot drifts down as user scrolls.
      const scrollDrop = p * (isMobile ? 0.85 : 1.25);
      root.position.y = 0.26 - scrollDrop + Math.sin(t * 1.8) * 0.12;
      root.position.x = isMobile ? 0.06 : 0.1 + Math.sin(t * 0.7) * 0.06;
      root.scale.setScalar(isMobile ? 0.86 : 1.0);
      root.rotation.y = -0.18 + p * 0.3;
      stage.style.opacity = String(1 - p * 0.25);

      // Gentle character life.
      robot.rotation.z = Math.sin(t * 0.9) * 0.024;
      robot.rotation.x = mouse.y * 0.05;
      headPivot.rotation.y += (mouse.x * 0.32 - headPivot.rotation.y) * 0.08;
      headPivot.rotation.x += (mouse.y * 0.15 - headPivot.rotation.x) * 0.08;

      if (t > nextBlinkAt) {
        blinkStart = t;
        nextBlinkAt = t + 2.3 + Math.random() * 2.1;
      }
      const elapsed = t - blinkStart;
      const blink = elapsed < 0.15 ? 1 - Math.abs(elapsed / 0.075 - 1) : 0;
      const eyeScale = 1 - blink * 0.92;
      eyeL.scale.y = eyeScale;
      eyeR.scale.y = eyeScale;

      const wave = (Math.sin(t * 2.2) * 0.5 + 0.5) * (1 - p * 0.5);
      armR.rotation.z = armRestR + wave * 0.9;
      armL.rotation.z = armRestL - Math.sin(t * 1.4 + 1.1) * 0.08;

      antennaTip.scale.setScalar(1 + Math.sin(t * 3.4) * 0.2);
      chestDot.scale.setScalar(1 + Math.sin(t * 5.1) * 0.2);
      glowCone.scale.y = 1 + Math.sin(t * 15) * 0.12;
      glowCone.material.opacity = 0.34 + Math.sin(t * 11) * 0.08;
      glowLight.intensity = 0.55 + Math.sin(t * 10) * 0.16;

      orbit.rotation.z = t * 0.33;
      satellites.forEach(function (sat, i) {
        const a = t * 0.7 + i * (Math.PI * 2 / satellites.length);
        sat.position.set(Math.cos(a) * 2.05, Math.sin(a) * 2.05, 0);
      });
      miniCards[0].position.y = -0.72 + Math.sin(t * 1.1) * 0.08;
      miniCards[1].position.y = -0.48 + Math.cos(t * 1.2) * 0.08;

      renderer.render(scene, camera);
    }

    animate();
  }
})();

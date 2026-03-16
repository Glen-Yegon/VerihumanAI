(() => {
  // ... container, scene, camera, renderer same as before

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = 0;
  container.style.left = 0;
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.zIndex = '-1';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 70;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const nodeColor = new THREE.Color('#cadcfc');
  const lineColor = new THREE.Color('#8ab6f9');

  const nodeCount = 120;
  const nodes = [];

  const nodeGeometry = new THREE.SphereGeometry(0.5, 16, 16);
  const nodeMaterial = new THREE.MeshBasicMaterial({
    color: nodeColor,
    transparent: true,
    opacity: 0.9
  });

  // Function to generate points on a sphere with bulges (simulate brain lobes)
  function brainShapePoint(i, total) {
    const phi = Math.acos(-1 + (2 * i) / total); // latitude
    const theta = Math.sqrt(total * Math.PI) * phi; // longitude

    // Basic sphere coordinates
    let x = Math.cos(theta) * Math.sin(phi);
    let y = Math.sin(theta) * Math.sin(phi);
    let z = Math.cos(phi);

    // Add bulges for lobes - sinusoidal perturbations on sphere surface
    const bulgeStrength = 0.3;
    x += bulgeStrength * Math.sin(5 * theta) * Math.cos(3 * phi);
    y += bulgeStrength * Math.cos(4 * theta) * Math.sin(5 * phi);
    z += bulgeStrength * Math.sin(6 * phi) * Math.cos(2 * theta);

    // Scale up to desired size
    const scale = 20;
    return new THREE.Vector3(x * scale, y * scale, z * scale);
  }

  // Create nodes placed on brain shape
  for (let i = 0; i < nodeCount; i++) {
    const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
    const pos = brainShapePoint(i, nodeCount);
    node.position.copy(pos);
    scene.add(node);
    nodes.push(node);
  }

  // Lines and connections
  const maxConnections = 3;
  const lineMaterial = new THREE.LineBasicMaterial({
    color: lineColor,
    transparent: true,
    opacity: 0.5,
    linewidth: 2,
    blending: THREE.AdditiveBlending,
  });

  const lines = [];

  function connectNodes() {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const distances = [];

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dist = node.position.distanceTo(nodes[j].position);
        distances.push({ index: j, dist });
      }

      distances.sort((a, b) => a.dist - b.dist);

      for (let k = 0; k < maxConnections; k++) {
        const targetIndex = distances[k].index;
        const geometry = new THREE.BufferGeometry();
        const points = new Float32Array([
          node.position.x, node.position.y, node.position.z,
          nodes[targetIndex].position.x, nodes[targetIndex].position.y, nodes[targetIndex].position.z,
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
        const line = new THREE.Line(geometry, lineMaterial.clone());
        scene.add(line);
        lines.push({ line, startNode: node, endNode: nodes[targetIndex] });
      }
    }
  }

  connectNodes();

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // Pulsate nodes & animate opacity
    nodes.forEach((node, i) => {
      const scale = 1 + 0.3 * Math.sin(time * 5 + i);
      node.scale.set(scale, scale, scale);
      node.material.opacity = 0.7 + 0.3 * Math.sin(time * 7 + i);
    });

    // Animate line opacity
    lines.forEach(({ line }, idx) => {
      line.material.opacity = 0.3 + 0.7 * Math.abs(Math.sin(time * 3 + idx));
    });

    // Slowly rotate scene
    scene.rotation.x = time * 0.02;
    scene.rotation.y = time * 0.04;

    renderer.render(scene, camera);
  }

  animate();

  // Handle resizing
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();

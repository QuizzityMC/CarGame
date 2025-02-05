let scene, camera, renderer, world, glider;
const keys = {};

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);

    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    createTerrain();
    createGlider();

    camera.position.set(0, 200, 50);
    camera.lookAt(glider.position);

    document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    animate();
}

function createTerrain() {
    const geometry = new THREE.PlaneGeometry(1000, 1000, 50, 50);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    scene.add(terrain);

    const terrainShape = new CANNON.Plane();
    const terrainBody = new CANNON.Body({ mass: 0 });
    terrainBody.addShape(terrainShape);
    terrainBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(terrainBody);
}

function createGlider() {
    const gliderGeometry = new THREE.ConeGeometry(2, 8, 4);
    const gliderMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    glider = new THREE.Mesh(gliderGeometry, gliderMaterial);
    glider.rotation.x = Math.PI / 2;
    scene.add(glider);

    const gliderShape = new CANNON.Cylinder(0.1, 2, 8, 4);
    const gliderBody = new CANNON.Body({
        mass: 100,
        shape: gliderShape,
        position: new CANNON.Vec3(0, 500, 0),
        velocity: new CANNON.Vec3(0, -10, 0)
    });
    world.addBody(gliderBody);
    glider.userData.physicsBody = gliderBody;
}

function updateGlider() {
    const gliderBody = glider.userData.physicsBody;
    const force = 5;

    if (keys['w']) gliderBody.applyForce(new CANNON.Vec3(0, 0, -force), gliderBody.position);
    if (keys['s']) gliderBody.applyForce(new CANNON.Vec3(0, 0, force), gliderBody.position);
    if (keys['a']) gliderBody.applyForce(new CANNON.Vec3(-force, 0, 0), gliderBody.position);
    if (keys['d']) gliderBody.applyForce(new CANNON.Vec3(force, 0, 0), gliderBody.position);

    glider.position.copy(gliderBody.position);
    glider.quaternion.copy(gliderBody.quaternion);

    camera.position.set(
        glider.position.x,
        glider.position.y + 10,
        glider.position.z + 30
    );
    camera.lookAt(glider.position);

    // Update HUD
    document.getElementById('altitude').textContent = Math.round(glider.position.y);
    document.getElementById('speed').textContent = Math.round(gliderBody.velocity.length() * 3.6); // Convert to km/h
}

function animate() {
    requestAnimationFrame(animate);
    world.step(1/60);
    updateGlider();
    renderer.render(scene, camera);
}

window.addEventListener('load', init);

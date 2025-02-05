let scene, camera, renderer, world, playerCar, track;
const keys = {};

function init() {
    console.log("Initializing game");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);

    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    createTrack();
    createPlayerCar();

    camera.position.set(0, 10, -20);
    camera.lookAt(playerCar.position);

    document.getElementById('startButton').addEventListener('click', startRace);
    document.getElementById('garageButton').addEventListener('click', openGarage);
    document.getElementById('multiplayerButton').addEventListener('click', startMultiplayer);

    document.addEventListener('keydown', (e) => keys[e.code] = true);
    document.addEventListener('keyup', (e) => keys[e.code] = false);

    animate();
}

function createTrack() {
    const trackShape = new THREE.Shape();
    trackShape.moveTo(0, -50);
    trackShape.lineTo(50, -50);
    trackShape.lineTo(50, 50);
    trackShape.lineTo(-50, 50);
    trackShape.lineTo(-50, -50);
    trackShape.lineTo(0, -50);

    const geometry = new THREE.ExtrudeGeometry(trackShape, {
        steps: 1,
        depth: 1,
        bevelEnabled: false
    });

    const material = new THREE.MeshBasicMaterial({ color: 0x333333 });
    track = new THREE.Mesh(geometry, material);
    track.rotation.x = -Math.PI / 2;
    scene.add(track);

    const trackBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane()
    });
    trackBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(trackBody);
}

function createPlayerCar() {
    const carGeometry = new THREE.BoxGeometry(4, 2, 2);
    const carMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    playerCar = new THREE.Mesh(carGeometry, carMaterial);
    scene.add(playerCar);

    const carShape = new CANNON.Box(new CANNON.Vec3(2, 1, 1));
    const carBody = new CANNON.Body({
        mass: 1500,
        shape: carShape
    });
    carBody.position.set(0, 5, 0);
    world.addBody(carBody);
    playerCar.userData.physicsBody = carBody;
}

function startRace() {
    console.log("Race started");
    // Add race start logic here
}

function openGarage() {
    console.log("Garage opened");
    // Add garage logic here
}

function startMultiplayer() {
    console.log("Multiplayer started");
    // Add multiplayer logic here
}

function updatePlayerCar() {
    const carBody = playerCar.userData.physicsBody;
    
    if (keys.ArrowUp) carBody.applyForce(new CANNON.Vec3(0, 0, -500), carBody.position);
    if (keys.ArrowDown) carBody.applyForce(new CANNON.Vec3(0, 0, 300), carBody.position);
    if (keys.ArrowLeft) carBody.applyTorque(new CANNON.Vec3(0, 10, 0));
    if (keys.ArrowRight) carBody.applyTorque(new CANNON.Vec3(0, -10, 0));

    playerCar.position.copy(carBody.position);
    playerCar.quaternion.copy(carBody.quaternion);

    camera.position.set(
        playerCar.position.x - 15 * Math.sin(playerCar.rotation.y),
        playerCar.position.y + 5,
        playerCar.position.z - 15 * Math.cos(playerCar.rotation.y)
    );
    camera.lookAt(playerCar.position);
}

function animate() {
    requestAnimationFrame(animate);
    world.step(1/60);
    updatePlayerCar();
    renderer.render(scene, camera);
}

window.addEventListener('load', init);

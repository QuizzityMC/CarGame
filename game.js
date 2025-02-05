let scene, camera, renderer, world, playerCar, aiCars = [], track, checkpoints = [], powerUps = [], weather, minimap;
let glider;
let currentLap = 1, totalLaps = 3, raceStartTime, lastCheckpointTime;
let selectedCar = null, carUpgrades = { engine: 0, tires: 0, nitro: 0 };
const trackSegments = 1000, trackWidth = 20, trackComplexity = 0.2;
const aiCarCount = 7;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    setupLighting();
    createTrack();
    createCheckpoints();
    createPowerUps();
    initWeather();
    createMinimap();
    createGlider();

    document.getElementById('startButton').addEventListener('click', startRace);
    document.getElementById('garageButton').addEventListener('click', openGarage);
    document.getElementById('multiplayerButton').addEventListener('click', startMultiplayer);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
}

function createTrack() {
    const trackPoints = [];
    let currentAngle = 0;
    for (let i = 0; i < trackSegments; i++) {
        const radius = 100 + Math.sin(i * trackComplexity) * 50;
        const x = Math.cos(currentAngle) * radius;
        const z = Math.sin(currentAngle) * radius;
        trackPoints.push(new THREE.Vector3(x, 0, z));
        currentAngle += (Math.PI * 2) / trackSegments;
    }

    const trackGeometry = new THREE.BufferGeometry().setFromPoints(trackPoints);
    const trackMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    track = new THREE.Line(trackGeometry, trackMaterial);
    scene.add(track);

    // Create track mesh and physics body
    const trackShape = new THREE.Shape();
    trackShape.moveTo(trackPoints[0].x, trackPoints[0].z);
    for (let i = 1; i < trackPoints.length; i++) {
        trackShape.lineTo(trackPoints[i].x, trackPoints[i].z);
    }
    trackShape.lineTo(trackPoints[0].x, trackPoints[0].z);

    const extrudeSettings = {
        steps: trackSegments,
        bevelEnabled: false,
        extrudePath: new THREE.CatmullRomCurve3(trackPoints)
    };

    const trackExtrudeGeometry = new THREE.ExtrudeGeometry(trackShape, extrudeSettings);
    const trackMesh = new THREE.Mesh(trackExtrudeGeometry, new THREE.MeshPhongMaterial({ color: 0x333333 }));
    trackMesh.rotation.x = -Math.PI / 2;
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

    const trackBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane()
    });
    trackBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(trackBody);
}

function createCheckpoints() {
    for (let i = 0; i < 10; i++) {
        const checkpointGeometry = new THREE.RingGeometry(trackWidth / 2, trackWidth, 32);
        const checkpointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        const checkpoint = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
        
        const segment = Math.floor(i * trackSegments / 10);
        checkpoint.position.copy(track.geometry.attributes.position.array.slice(segment * 3, segment * 3 + 3));
        checkpoint.lookAt(track.geometry.attributes.position.array.slice((segment + 1) * 3, (segment + 1) * 3 + 3));
        
        scene.add(checkpoint);
        checkpoints.push(checkpoint);
    }
}

function createPowerUps() {
    const powerUpTypes = ['nitro', 'shield', 'repair'];
    for (let i = 0; i < 20; i++) {
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        const powerUpGeometry = new THREE.SphereGeometry(1, 32, 32);
        const powerUpMaterial = new THREE.MeshBasicMaterial({ color: type === 'nitro' ? 0x00ff00 : type === 'shield' ? 0x0000ff : 0xff0000 });
        const powerUp = new THREE.Mesh(powerUpGeometry, powerUpMaterial);
        
        const segment = Math.floor(Math.random() * trackSegments);
        powerUp.position.copy(track.geometry.attributes.position.array.slice(segment * 3, segment * 3 + 3));
        powerUp.position.y = 1;
        
        scene.add(powerUp);
        powerUps.push({ mesh: powerUp, type: type });
    }
}

function initWeather() {
    weather = {
        rain: new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.1, transparent: true })
        ),
        snow: new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true })
        )
    };

    const rainPositions = new Float32Array(1000 * 3);
    const snowPositions = new Float32Array(1000 * 3);

    for (let i = 0; i < 1000 * 3; i += 3) {
        rainPositions[i] = Math.random() * 400 - 200;
        rainPositions[i + 1] = Math.random() * 200 - 100;
        rainPositions[i + 2] = Math.random() * 400 - 200;

        snowPositions[i] = Math.random() * 400 - 200;
        snowPositions[i + 1] = Math.random() * 200 - 100;
        snowPositions[i + 2] = Math.random() * 400 - 200;
    }

    weather.rain.geometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    weather.snow.geometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));

    scene.add(weather.rain);
    scene.add(weather.snow);

    weather.rain.visible = false;
    weather.snow.visible = false;
}

function createMinimap() {
    minimap = document.getElementById('minimap');
    const minimapCtx = minimap.getContext('2d');
    minimapCtx.strokeStyle = 'white';
    minimapCtx.lineWidth = 2;

    minimapCtx.beginPath();
    for (let i = 0; i < trackSegments; i++) {
        const point = track.geometry.attributes.position.array.slice(i * 3, i * 3 + 3);
        const x = (point[0] / 200 + 1) * 100;
        const y = (point[2] / 200 + 1) * 100;
        if (i === 0) minimapCtx.moveTo(x, y);
        else minimapCtx.lineTo(x, y);
    }
    minimapCtx.closePath();
    minimapCtx.stroke();
}

function createGlider() {
    const gliderGeometry = new THREE.ConeGeometry(2, 8, 4);
    const gliderMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff });
    glider = new THREE.Mesh(gliderGeometry, gliderMaterial);
    glider.rotation.x = Math.PI / 2; // Rotate to point downwards
    glider.position.set(0, 500, 0); // Start high above the map
    scene.add(glider);

    const gliderShape = new CANNON.Cylinder(0.1, 2, 8, 4);
    const gliderBody = new CANNON.Body({
        mass: 100,
        shape: gliderShape,
        material: new CANNON.Material("glider")
    });
    gliderBody.position.copy(glider.position);
    gliderBody.quaternion.copy(glider.quaternion);
    world.addBody(gliderBody);
    glider.userData.physicsBody = gliderBody;

    // Add a constant downward force to simulate gliding
    gliderBody.force.set(0, -100, 0);
}

function startRace() {
    createPlayerCar();
    createAICars();
    raceStartTime = Date.now();
    lastCheckpointTime = raceStartTime;
    document.getElementById('menu').style.display = 'none';
    animate();
}

function openGarage() {
    // Implement garage logic here
}

function startMultiplayer() {
    // Implement multiplayer logic here
}

function createPlayerCar() {
    const carGeometry = new THREE.BoxGeometry(4, 2, 2);
    const carMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    playerCar = new THREE.Mesh(carGeometry, carMaterial);
    playerCar.castShadow = true;
    scene.add(playerCar);

    const carShape = new CANNON.Box(new CANNON.Vec3(2, 1, 1));
    const carBody = new CANNON.Body({
        mass: 1500,
        shape: carShape,
        material: new CANNON.Material("car")
    });

    carBody.position.set(track.geometry.attributes.position.array[0], 1, track.geometry.attributes.position.array[2]);
    world.addBody(carBody);
    playerCar.userData.physicsBody = carBody;

    // Apply car upgrades
    carBody.mass -= carUpgrades.engine * 100;
    carBody.friction += carUpgrades.tires * 0.1;
}

function createAICars() {
    for (let i = 0; i < aiCarCount; i++) {
        const aiCarGeometry = new THREE.BoxGeometry(4, 2, 2);
        const aiCarMaterial = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
        const aiCar = new THREE.Mesh(aiCarGeometry, aiCarMaterial);
        aiCar.castShadow = true;
        scene.add(aiCar);

        const aiCarShape = new CANNON.Box(new CANNON.Vec3(2, 1, 1));
        const aiCarBody = new CANNON.Body({
            mass: 1500,
            shape: aiCarShape,
            material: new CANNON.Material("car")
        });

        const startPosition = (i + 1) * (trackSegments / aiCarCount);
        aiCarBody.position.set(
            track.geometry.attributes.position.array[startPosition * 3],
            1,
            track.geometry.attributes.position.array[startPosition * 3 + 2]
        );
        world.addBody(aiCarBody);
        aiCar.userData.physicsBody = aiCarBody;

        aiCars.push(aiCar);
    }
}

function updateWeather() {
    const time = Date.now() * 0.001;
    const isRaining = Math.sin(time * 0.1) > 0.3;
    const isSnowing = Math.sin(time * 0.1) < -0.3;

    weather.rain.visible = isRaining;
    weather.snow.visible = isSnowing;

    if (isRaining || isSnowing) {
        const particles = isRaining ? weather.rain.geometry.attributes.position.array : weather.snow.geometry.attributes.position.array;
        for (let i = 0; i < particles.length; i += 3) {
            particles[i + 1] -= 0.1;
            if (particles[i + 1] < -100) particles[i + 1] = 100;
        }
        weather.rain.geometry.attributes.position.needsUpdate = true;
        weather.snow.geometry.attributes.position.needsUpdate = true;
    }
}

function handlePowerUps() {
    powerUps.forEach((powerUp, index) => {
        if (playerCar.position.distanceTo(powerUp.mesh.position) < 2) {
            // Apply power-up effect
            switch (powerUp.type) {
                case 'nitro':
                    playerCar.userData.physicsBody.velocity.z -= 10;
                    break;
                case 'shield':
                    // Implement shield logic
                    break;
                case 'repair':
                    // Implement repair logic
                    break;
            }
            
            // Remove collected power-up
            scene.remove(powerUp.mesh);
            powerUps.splice(index, 1);
        }
    });
}

function updateAI() {
    aiCars.forEach((aiCar, index) => {
        const aiCarBody = aiCar.userData.physicsBody;
        
        // Simple AI logic: follow the track
        const nextSegment = (Math.floor(aiCarBody.position.x / trackWidth) + 1) % trackSegments;
        const targetX = track.geometry.attributes.position.array[nextSegment * 3];
        const targetZ = track.geometry.attributes.position.array[nextSegment * 3 + 2];
        
        const direction = new CANNON.Vec3(targetX - aiCarBody.position.x, 0, targetZ - aiCarBody.position.z);
        direction.normalize();
        
        // Apply force in the direction of the next track segment
        aiCarBody.applyForce(direction.scale(5000), aiCarBody.position);
        
        // Update Three.js mesh position and rotation
        aiCar.position.copy(aiCarBody.position);
        aiCar.quaternion.copy(aiCarBody.quaternion);
    });
}

function updateGlider() {
    const gliderBody = glider.userData.physicsBody;
    
    // Update Three.js mesh position and rotation
    glider.position.copy(gliderBody.position);
    glider.quaternion.copy(gliderBody.quaternion);

    // Simple glider controls (for example, using arrow keys)
    if (keys.ArrowLeft) gliderBody.velocity.x -= 0.1;
    if (keys.ArrowRight) gliderBody.velocity.x += 0.1;
    if (keys.ArrowUp) gliderBody.velocity.z -= 0.1;
    if (keys.ArrowDown) gliderBody.velocity.z += 0.1;

    // Ensure the glider can only go down
    if (gliderBody.velocity.y > 0) gliderBody.velocity.y = 0;
}

function updateHUD() {
    document.getElementById('speed').textContent = Math.round(playerCar.userData.physicsBody.velocity.length() * 3.6); // km/h
    document.getElementById('lap').textContent = currentLap;
    document.getElementById('time').textContent = ((Date.now() - raceStartTime) / 1000).toFixed(2);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = 1 / 60; // Assume 60fps
    world.step(delta);

    updatePlayerCar();
    updateAI();
    updateGlider();
    handlePowerUps();
    updateWeather();
    updateHUD();

    renderer.render(scene, camera);
}

function updatePlayerCar() {
    const carBody = playerCar.userData.physicsBody;
    
    // Car controls
    if (keys.ArrowUp) carBody.applyForce(new CANNON.Vec3(0, 0, -500), carBody.position);
    if (keys.ArrowDown) carBody.applyForce(new CANNON.Vec3(0, 0, 300), carBody.position);
    if (keys.ArrowLeft) carBody.applyTorque(new CANNON.Vec3(0, 10, 0));
    if (keys.ArrowRight) carBody.applyTorque(new CANNON.Vec3(0, -10, 0));

    // Update Three.js mesh
    playerCar.position.copy(carBody.position);
    playerCar.quaternion.copy(carBody.quaternion);

    // Update camera position
    camera.position.set(
        playerCar.position.x - 15 * Math.sin(playerCar.rotation.y),
        playerCar.position.y + 5,
        playerCar.position.z - 15 * Math.cos(playerCar.rotation.y)
    );
    camera.lookAt(playerCar.position);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateGlider() {
    const gliderBody
    // ... (rest of updateGlider function)
}

function animate() {
    requestAnimationFrame(animate);
    world.step(1/60);
    updateAI();
    updateGlider();
    updateWeather();
    handlePowerUps();
    renderer.render(scene, camera);
}

// Make sure to call init() to start the game
init();

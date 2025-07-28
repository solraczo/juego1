// Variables globales
        let model, mixer, action;
        const keys = {};
        const velocity = new THREE.Vector3();
let moveVelocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        let laberintoModel;
        let camera, scene, renderer;
        let isOnGround = false;

        // Inicialización
        function init() {
            // Crear escena
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87CEEB); // Fondo azul cielo por defecto
            scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

            // Crear cámara
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 5, 10);

            // Crear renderer
            renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            document.body.appendChild(renderer.domElement);

            // Añadir luces básicas
            addBasicLights();
            
            // Crear suelo temporal
            createTempGround();
            
            // Cargar recursos
            loadAssets();
        }

        function addBasicLights() {
            // Luz direccional principal
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 10, 7);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            scene.add(directionalLight);

            // Luz ambiental
            const ambientLight = new THREE.AmbientLight(0x404040, 3);
            scene.add(ambientLight);

            // Luz hemisférica
            const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
            scene.add(hemisphereLight);
        }

        function createTempGround() {
            const groundGeometry = new THREE.PlaneGeometry(50, 50);
            const groundMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x2c3e50,
                roughness: 0.9,
                metalness: 0.1
            });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = 0;
            ground.receiveShadow = true;
            scene.add(ground);
        }

        function loadAssets() {
            // Cargador de modelos GLTF
            const loader = new THREE.GLTFLoader();
            
            // Intentar cargar laberinto
            try {
                loader.load('models/laberinto003.gltf', function(gltf) {
                    laberintoModel = gltf.scene;
                    scene.add(laberintoModel);
                    updateLoadingStatus('Laberinto cargado');
                }, undefined, function(error) {
                    console.error('Error cargando laberinto:', error);
                    updateLoadingStatus('Error con laberinto. Usando alternativa');
                    createBackupMaze();
                });
            } catch (e) {
                console.error('Error inicializando loader:', e);
                createBackupMaze();
            }

            // Cargar personaje
            try {
                loader.load('models/personaje001.gltf', function(gltf) {
                    model = gltf.scene;
                    if (!model) {
                        throw new Error('Modelo no definido');
                    }
                    
                    scene.add(model);
                    model.position.set(0, 0, -0.1);
                    model.scale.set(0.8, 0.8, 0.8); // Reducción a la mitad
                    
                    // Configurar animación
                    mixer = new THREE.AnimationMixer(model);
                    if (gltf.animations && gltf.animations.length > 0) {
                        action = mixer.clipAction(gltf.animations[0]);
                        action.stop();
                    }
                    
                    updateLoadingStatus('Personaje cargado');
                    const l = document.getElementById('loading'); if (l) l.style.display = 'none';
                    
                }, undefined, function(error) {
                    console.error('Error cargando personaje:', error);
                    updateLoadingStatus('Error con personaje. Usando cubo');
                    createCubeCharacter();
                });
            } catch (e) {
                console.error('Error cargando personaje:', e);
                createCubeCharacter();
            }

            // Configurar controles de teclado
            setupControls();
        }

        function createBackupMaze() {
            // Crear un laberinto simple con cajas
            const mazeGroup = new THREE.Group();
            
            // Paredes exteriores
            const wallGeometry = new THREE.BoxGeometry(20, 3, 1);
            const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x3498db });
            
            // Norte
            const wallNorth = new THREE.Mesh(wallGeometry, wallMaterial);
            wallNorth.position.z = -10;
            wallNorth.castShadow = true;
            mazeGroup.add(wallNorth);
            
            // Sur
            const wallSouth = new THREE.Mesh(wallGeometry, wallMaterial);
            wallSouth.position.z = 10;
            mazeGroup.add(wallSouth);
            
            // Este
            const wallEast = new THREE.Mesh(wallGeometry, wallMaterial);
            wallEast.rotation.y = Math.PI / 2;
            wallEast.position.x = 10;
            mazeGroup.add(wallEast);
            
            // Oeste
            const wallWest = new THREE.Mesh(wallGeometry, wallMaterial);
            wallWest.rotation.y = Math.PI / 2;
            wallWest.position.x = -10;
            mazeGroup.add(wallWest);
            
            // Pared interna
            const innerWall = new THREE.Mesh(wallGeometry, wallMaterial);
            innerWall.position.set(5, 1.5, 0);
            innerWall.scale.set(0.5, 1, 1);
            mazeGroup.add(innerWall);
            
            scene.add(mazeGroup);
            laberintoModel = mazeGroup;
        }

        function createCubeCharacter() {
            const geometry = new THREE.BoxGeometry(1, 2, 1);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xe74c3c,
                emissive: 0xff0000,
                emissiveIntensity: 0.2
            });
            model = new THREE.Mesh(geometry, material);
            model.castShadow = true;
            model.position.set(0, 1, 0);
            scene.add(model);
            const l = document.getElementById('loading'); if (l) l.style.display = 'none';
        }

        function updateLoadingStatus(message) {
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.textContent = message;
            }
        }

        function setupControls() {
            // Eventos de teclado
            window.addEventListener('keydown', (event) => {
                keys[event.code] = true;
                
                // Reset posición con R
                if (event.code === 'KeyR' && model) {
                    model.position.set(0, 0, 0);
                }
            });

            window.addEventListener('keyup', (event) => {
                keys[event.code] = false;
            });

            // Ajustar el tamaño de la ventana
            window.addEventListener('resize', function() {
                const width = window.innerWidth;
                const height = window.innerHeight;
                if (renderer) {
                    renderer.setSize(width, height);
                }
                if (camera) {
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                }
            });
        }

        function updateCamera() {
    if (!model) return;

    const offset = new THREE.Vector3(0, 1.5, -3); // detrás y más cerca
    offset.applyQuaternion(model.quaternion);    // respeta la dirección del personaje
    const targetPos = model.position.clone().add(offset);

    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(model.position.x, model.position.y + 1.2, model.position.z);
}

        function animate() {
            requestAnimationFrame(animate);
            
            const delta = Math.min(clock.getDelta(), 0.1);
            
            // Mover personaje si existe
// ...existing code...
// Mover personaje si existe
if (model) {
    const isMovingForward = keys['KeyW'] || keys['ArrowUp'];
    const isTurningLeft = keys['KeyA'] || keys['ArrowLeft'];
    const isTurningRight = keys['KeyD'] || keys['ArrowRight'];
    const speed = 1.2 * delta;
    const turnSpeed = 2.5 * delta; // velocidad de giro

    // Rotar personaje
    if (isTurningLeft) {
        model.rotation.y += turnSpeed;
    }
    if (isTurningRight) {
        model.rotation.y -= turnSpeed;
    }

    // Mover hacia adelante
    if (isMovingForward) {
        // Dirección adelante según rotación actual
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(model.quaternion);
        model.position.add(forward.multiplyScalar(speed));
        model.position.y = 0; // Mantener pegado al suelo
    }

    // Animación
    if ((isMovingForward || isTurningLeft || isTurningRight) && action && !action.isRunning()) {
        action.play();
    } else if (!isMovingForward && !isTurningLeft && !isTurningRight && action && action.isRunning()) {
        action.stop();
    }

    // Gravedad básica
    model.position.y -= 0.1 * delta * 60;

    // Limitar posición Y
    if (model.position.y < 0) {
        model.position.y = 0;
    }
}
// ...existing code...            
            // Actualizar animaciones
            if (mixer) {
                mixer.update(delta);
            }
            
            // Actualizar cámara
            updateCamera();
            
            // Renderizar escena
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        }

        // Iniciar todo
        init();
        
        // Crear reloj para animaciones
        const clock = new THREE.Clock();
        
        // Iniciar bucle de animación
        animate();

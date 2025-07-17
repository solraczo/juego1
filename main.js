
        // Variables globales
        let model, mixer, action;
        const keys = {};
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const gravity = -9.8;
        let isOnGround = false;
        let laberintoModel;

        // Configuración básica de la escena
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 10);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);

        // Luz direccional
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        scene.add(directionalLight);

        // Luz ambiental
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        scene.add(ambientLight);

        // Cargador de modelos GLTF
        const loader = new THREE.GLTFLoader();

        // Cargar el modelo del laberinto
        loader.load('models/laberinto003.gltf', function(gltf) {
            laberintoModel = gltf.scene;
            laberintoModel.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            scene.add(laberintoModel);
        }, undefined, function(error) {
            console.error('Error cargando laberinto:', error);
        });

        // Cargar el modelo del personaje
        loader.load('models/personaje001.gltf', function(gltf) {
            model = gltf.scene;
            scene.add(model);
            model.position.set(0, 1, 0);
            model.scale.set(0.8, 0.8, 0.8);
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Configurar la animación
            mixer = new THREE.AnimationMixer(model);
            if (gltf.animations && gltf.animations.length > 0) {
                action = mixer.clipAction(gltf.animations[0]);
                action.stop();
            }
        }, undefined, function(error) {
            console.error('Error cargando personaje:', error);
        });

        // Cargar el HDRI
        const rgbeLoader = new THREE.RGBELoader();
        rgbeLoader.load('models/minedump_flats_2k.hdr', function(texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            scene.background = texture;
        }, undefined, function(error) {
            console.error('Error cargando HDRI:', error);
        });

        // Suelo temporal como respaldo
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        scene.add(ground);

        // Eventos de teclado
        window.addEventListener('keydown', (event) => {
            keys[event.code] = true;
            
            // Reset posición con R
            if (event.code === 'KeyR' && model) {
                model.position.set(0, 1, 0);
            }
        });

        window.addEventListener('keyup', (event) => {
            keys[event.code] = false;
        });

        // Función para actualizar la cámara en tercera persona
        function updateCamera() {
            if (!model) return;
            
            // Posición de la cámara: detrás y arriba del personaje
            const cameraOffset = new THREE.Vector3(0, 3, 5);
            
            // Aplicar la rotación actual del personaje
            cameraOffset.applyQuaternion(model.quaternion);
            
            // Posición final de la cámara
            camera.position.copy(model.position).add(cameraOffset);
            
            // La cámara mira al personaje
            camera.lookAt(model.position.x, model.position.y + 1, model.position.z);
        }

        // Raycaster para detección de suelo
        const raycaster = new THREE.Raycaster();
        const groundObjects = [];

        // Bucle de animación
        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);
            
            const delta = Math.min(clock.getDelta(), 0.1); // Limitar delta para evitar saltos
            
            // Movimiento del personaje
            if (model) {
                // Reiniciar dirección
                direction.set(0, 0, 0);
                const speed = 5 * delta;
                
                // Detectar teclas presionadas (WASD)
                if (keys['KeyW']) direction.z -= 1;
                if (keys['KeyS']) direction.z += 1;
                if (keys['KeyA']) direction.x -= 1;
                if (keys['KeyD']) direction.x += 1;
                
                // Normalizar la dirección y aplicar velocidad
                if (direction.lengthSq() > 0) {
                    direction.normalize();
                    velocity.copy(direction.multiplyScalar(speed));
                    
                    // Rotación del personaje hacia la dirección de movimiento
                    const targetRotation = Math.atan2(velocity.x, velocity.z);
                    
                    // Interpolación suave para la rotación
                    model.rotation.y = THREE.MathUtils.lerp(
                        model.rotation.y,
                        targetRotation,
                        10 * delta
                    );
                    
                    // Aplicar movimiento en el plano XZ
                    model.position.x += velocity.x;
                    model.position.z += velocity.z;
                    
                    // Activar animación si no está reproduciéndose
                    if (action && !action.isRunning()) {
                        action.play();
                    }
                } else {
                    // Detener animación si no hay movimiento
                    if (action && action.isRunning()) {
                        action.stop();
                    }
                }
                
                // Gravedad y detección de suelo
                // Actualizar lista de objetos para detección de suelo
                groundObjects.length = 0;
                scene.traverse(function(object) {
                    if (object.isMesh && object.receiveShadow) {
                        groundObjects.push(object);
                    }
                });
                
                // Configurar raycaster desde los pies del personaje
                const feetPosition = new THREE.Vector3(
                    model.position.x,
                    model.position.y - 0.5,
                    model.position.z
                );
                
                raycaster.set(feetPosition, new THREE.Vector3(0, -1, 0));
                const intersects = raycaster.intersectObjects(groundObjects, true);
                
                isOnGround = false;
                if (intersects.length > 0 && intersects[0].distance < 1) {
                    isOnGround = true;
                    // Ajustar posición para que quede sobre el suelo
                    model.position.y = intersects[0].point.y + 0.5;
                }
                
                // Aplicar gravedad si no está en el suelo
                if (!isOnGround) {
                    model.position.y += gravity * delta * 0.5;
                }
            }
            
            // Actualizar animaciones
            if (mixer) {
                mixer.update(delta);
            }
            
            // Actualizar cámara
            updateCamera();
            
            // Renderizar la escena
            renderer.render(scene, camera);
        }

        animate();

        // Ajustar el tamaño de la ventana
        window.addEventListener('resize', function() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        });

        // Pantalla completa al hacer clic
        renderer.domElement.addEventListener('click', function() {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                renderer.domElement.requestFullscreen();
            }
        });
    </script>
</body>
</html>

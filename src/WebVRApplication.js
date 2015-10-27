/* global Primrose, THREE, WebVRManager, combineDefaults */

WebVRApplication = ( function () {
    function WebVRApplication(name, avatar, scene, options) {
        this.name = name;
        this.avatar = avatar;
        this.scene = scene;
        var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera = camera;

        this.audioContext = new AudioContext();

        this.log = function(msg) {
            console.log(msg);
        };

        // TODO: make this object, not array
        var keyboardCommands = [{name: "turnLeft", buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
                {name: "turnRight", buttons: [Primrose.Input.Keyboard.RIGHTARROW]},
                {name: "driveForward", buttons: [-Primrose.Input.Keyboard.W]},
                {name: "driveBack", buttons: [Primrose.Input.Keyboard.S]},
                {name: "strafeLeft", buttons: [-Primrose.Input.Keyboard.A]},
                {name: "strafeRight", buttons: [Primrose.Input.Keyboard.D]},
                {name: "floatUp", buttons: [Primrose.Input.Keyboard.E]},
                {name: "floatDown", buttons: [-Primrose.Input.Keyboard.C]},
                {name: "toggleVRControls", buttons: [Primrose.Input.Keyboard.V], commandDown: this.toggleVRControls.bind(this), dt: 0.25},
                {name: "toggleWireframe", buttons: [Primrose.Input.Keyboard.U], commandDown: this.toggleWireframe.bind(this), dt: 0.25},
                {name: 'resetVRSensor', buttons: [Primrose.Input.Keyboard.Z], commandDown: this.resetVRSensor.bind(this), dt: 0.25}];
        if (options.keyboardCommands) {
            Array.prototype.push.apply(options.keyboardCommands, keyboardCommands);
        } else {
            options.keyboardCommands = keyboardCommands;
        }
        var gamepadCommands = [{name: "strafe", axes: [Primrose.Input.Gamepad.LSX], deadzone: 0.15},
                {name: "drive", axes: [Primrose.Input.Gamepad.LSY], deadzone: 0.15},
                {name: "heading", axes: [-Primrose.Input.Gamepad.RSX], integrate: true, deadzone: 0.15},
                {name: "dheading", commands: ["heading"], delta: true},
                {name: "pitch", axes: [Primrose.Input.Gamepad.RSY], integrate: true, deadzone: 0.15, max: 0.5 * Math.PI, min: -0.5 * Math.PI},
                {name: "float", axes: [-Primrose.Input.Gamepad.LSY], deadzone: 0.12},
                {name: "toggleFloatMode", buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
                    commandDown: function () { application.avatar.floatMode = true; },
                    commandUp: function () { application.avatar.floatMode = false; } },
                {name: "resetVRSensor", buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                    commandDown: function () { application.resetVRSensor(); }, dt: 0.25}];
        if (options.gamepadCommands) {
            Array.prototype.push.apply(options.gamepadCommands, gamepadCommands);
        } else {
            options.gamepadCommands = gamepadCommands;
        }
        options = combineDefaults(options, {
            gravity: 0,
            backgroundColor: 0x000000,
            mouseCommands: [{name: "dx", axes: [-Primrose.Input.Mouse.X], delta: true, scale: 0.5},
                {name: "heading", commands: ["dx"], integrate: true},
                {name: "dy", axes: [-Primrose.Input.Mouse.Y], delta: true, scale: 0.5},
                {name: "pitch", commands: ["dy"], integrate: true, min: -Math.PI * 0.5, max: Math.PI * 0.5}],
            moveSpeed: 1
        });

        if (options.fog) {
            this.scene.fog = options.fog;
        }

        var renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer = renderer;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(options.backgroundColor);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (options.shadowMap) {
            this.renderer.shadowMap.enabled = true;
        }
        document.body.appendChild(this.renderer.domElement);

        this.vrEffect = new THREE.VREffect(this.renderer);
        this.vrManager = new WebVRManager(this.renderer, this.vrEffect, {
            hideButton: false
        });
        this.vrControls = new THREE.VRControls(this.camera);
        this.vrControls.enabled = false;

        this.keyboard = new Primrose.Input.Keyboard("keyboard", window, options.keyboardCommands);
        window.addEventListener("keydown", function (evt) {
            if (evt.keyCode === Primrose.Text.Keys.F) {
                this.vrManager.enterImmersive();
            }
        }.bind(this));

        this.gamepad = new Primrose.Input.Gamepad("gamepad", options.gamepadCommands);
        this.gamepad.addEventListener("gamepadconnected", function(id) {
            if (!this.gamepad.isGamepadSet()) {
                this.gamepad.setGamepad(id);
                console.log("gamepad " + id + " connected");
            }
        }.bind(this), false);

        var world = new CANNON.World();
        world.defaultContactMaterial.friction = 0.2;
        world.gravity.set( 0, -options.gravity, 0 );
        world.broadphase = new CANNON.SAPBroadphase( world );
        this.world = world;

        this.particleGroups = [];

        window.addEventListener("resize", function () {
            var canvasWidth = window.innerWidth,
                canvasHeight = window.innerHeight;
            this.camera.aspect = canvasWidth / canvasHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(canvasWidth, canvasHeight);
            if (this.vrManager.isVRMode()) {
                this.vrControls.enabled = true;
                pitch = 0;
            }
        }.bind(this), false);

        var mousePointer = new THREE.Mesh(new THREE.SphereBufferGeometry(0.02));
        mousePointer.position.z = -2;
        avatar.add(mousePointer);
        mousePointer.visible = false;
        this.mousePointer = mousePointer;
        if ("onpointerlockchange" in document) {
          document.addEventListener('pointerlockchange', lockChangeAlert, false);
        } else if ("onmozpointerlockchange" in document) {
          document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
        } else if ("onwebkitpointerlockchange" in document) {
          document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
        }
        function lockChangeAlert() {
          if( document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement ) {
            console.log('The pointer lock status is now locked');
            mousePointer.visible = true;
            mousePointer.position.x = mousePointer.position.y = 0;
          } else {
            console.log('The pointer lock status is now unlocked');
            mousePointer.visible = false;
          }
        }

        var loadingScene = new THREE.Scene();
        var loadingMesh = new THREE.Mesh(new THREE.TextGeometry('LOADING...', {size: 0.3, height: 0}));
        loadingMesh.position.x = loadingMesh.position.z = -2;
        loadingScene.add(loadingMesh);
        var loadingCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        var lt = 0;
        // TODO: don't poll
        this.start = function() {
            function waitForResources(t) {
                if (CrapLoader.isLoaded()) {
                    CrapLoader.CANNONize(scene, world);
                    lt = t;
                    requestAnimationFrame(animate);
                } else {
                    renderer.render(loadingScene, loadingCamera);
                    requestAnimationFrame(waitForResources);
                }
            }
            waitForResources(0);
        };

        var UP = new THREE.Vector3(0, 1, 0),
            RIGHT = new THREE.Vector3(1, 0, 0),
            heading = 0,
            pitch = 0,
            pitchQuat = new THREE.Quaternion(),
            strafe,
            drive,
            floatUp,
            kbheading = 0,
            kbpitch = 0,
            walkSpeed = options.moveSpeed,
            floatSpeed = 0.9 * options.moveSpeed;
        var raycaster = new THREE.Raycaster(),
            INTERSECTED,
            picking = false,
            pickables;
        raycaster.far = 100;
        this.setPicking = function (mode, objects) {
            picking = mode;
            if (objects) {
                pickables = objects;
            } else {
                pickables = [];
                scene.traverse(function (obj) {
                    if (obj != mousePointer && obj instanceof THREE.Mesh && obj.material.color !== undefined) {
                        pickables.push(obj);
                    }
                });
            }
        };


        var origin = new THREE.Vector3(),
            direction = new THREE.Vector3();
        var animate = function (t) {
            requestAnimationFrame(animate);
            var dt = (t - lt) * 0.001;
            lt = t;

            if (mousePointer.visible && picking) {
                origin.set(0, 0, 0);
                direction.set(0, 0, 0);
                direction.subVectors(mousePointer.localToWorld(direction), camera.localToWorld(origin)).normalize();
                raycaster.set(origin, direction);
                var intersects = raycaster.intersectObjects(pickables);
                if (intersects.length > 0) {
                    if (INTERSECTED != intersects[0].object) {
                        if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
                        INTERSECTED = intersects[0].object;
                        INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
                        INTERSECTED.material.color.setHex(0xff4444); //0x44ff44);
                    }
                } else {
                    if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
                    INTERSECTED = null;
                }
            }

            if (this.vrControls.enabled) {
                this.vrControls.update();
            }

            this.vrManager.render(this.scene, this.camera, t);

            this.keyboard.update(dt);
            this.gamepad.update(dt);
            kbheading += -0.8 * dt * (this.keyboard.getValue("turnLeft") +
                this.keyboard.getValue("turnRight"));
            heading = kbheading + this.gamepad.getValue("heading");
            var cosHeading = Math.cos(heading),
                sinHeading = Math.sin(heading);
            kbpitch -= 0.8 * dt * (this.keyboard.getValue("pitchUp") + this.keyboard.getValue("pitchDown"));
            pitch = -(this.gamepad.getValue("pitch") + kbpitch);
            var cosPitch = Math.cos(pitch),
                sinPitch = Math.sin(pitch);
            strafe = this.keyboard.getValue("strafeRight") +
                this.keyboard.getValue("strafeLeft") +
                this.gamepad.getValue("strafe");
            floatUp = this.keyboard.getValue("floatUp") + this.keyboard.getValue("floatDown");
            drive = this.keyboard.getValue("driveBack") + this.keyboard.getValue("driveForward");
            if (this.avatar.floatMode) {
                floatUp += this.gamepad.getValue("float");
            } else {
                drive += this.gamepad.getValue("drive");
            }
            floatUp *= floatSpeed;
            if (strafe || drive) {
                var len = walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive +
                    strafe * strafe));
                strafe *= len;
                drive *= len;
            } else {
                strafe = 0;
                drive = 0;
            }
            pitchQuat.setFromAxisAngle(RIGHT, pitch);

            this.world.step(dt);

            for (var j = 0; j < this.world.bodies.length; ++j) {
                var body = this.world.bodies[j];
                if (body.graphics) {
                    body.graphics.position.copy(body.position);
                    body.graphics.quaternion.copy(body.quaternion);
                }
            }

            if (this.avatar.physics) {

                this.avatar.physics.quaternion.setFromAxisAngle(UP, heading);
                this.avatar.physics.quaternion.mult(pitchQuat, this.avatar.physics.quaternion);
                this.avatar.physics.velocity.x = this.avatar.physics.velocity.x * 0.9 +
                    0.1 * (strafe * cosHeading + drive * sinHeading * cosPitch);
                this.avatar.physics.velocity.z = this.avatar.physics.velocity.z * 0.9 +
                    0.1 * ((drive * cosHeading  * cosPitch - strafe * sinHeading));
                this.avatar.physics.velocity.y = this.avatar.physics.velocity.y * 0.9 +
                    0.08 * floatUp + 0.1 * drive * (-sinPitch);

            } else {

                this.avatar.quaternion.setFromAxisAngle(UP, heading);
                this.avatar.quaternion.multiply(pitchQuat);
                this.avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
                this.avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
                this.avatar.position.y += dt * floatUp;

            }

            if (this.particleGroups) {
                this.particleGroups.forEach(function (group) {
                    group.tick(dt);
                });
            }

        }.bind(this);

        var audioContext = this.audioContext;
        var gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 1;
        this.gainNode = gainNode;
        this.playSound = function (url, loop) {
            var source = audioContext.createBufferSource();
            source.loop = (loop === true);
            source.connect(gainNode);
            var request = new XMLHttpRequest();
            request.responseType = 'arraybuffer';
            request.open('GET', url, true);
            request.onload = function() {
                audioContext.decodeAudioData(request.response).then(function(buffer) {
                    source.buffer = buffer;
                    source.start(0);
                });
            };
            request.send();
        };

    }


    var wireframeMaterial = new THREE.MeshBasicMaterial({color: 0xeeddaa, wireframe: true});
    WebVRApplication.prototype.toggleWireframe = function () {
        if (this.scene.overrideMaterial) {
            this.log("wireframe: off");
            this.scene.overrideMaterial = null;
        } else {
            this.log("wireframe: on");
            this.scene.overrideMaterial = wireframeMaterial;
        }
    };


    WebVRApplication.prototype.toggleVRControls = function () {
        if (this.vrControls.enabled) {
            this.vrControls.enabled = false;
            this.camera.position.set(0, 0, 0);
            this.camera.rotation.set(0, 0, 0);
        } else {
            this.vrControls.enabled = true;
            this.vrControls.update();
        }
    };


    WebVRApplication.prototype.resetVRSensor = function () {
        this.vrControls.resetSensor();
    };


    var quad = new THREE.PlaneBufferGeometry(1, 1);
    WebVRApplication.prototype.makeEditor = function ( id, w, h, options ) {
        options.size = options.size || new Primrose.Text.Size( 1024 * w, 1024 * h );
        options.fontSize = options.fontSize || 50;
        options.theme = options.theme || Primrose.Text.Themes.Dark;
        options.tokenizer = options.tokenizer || Primrose.Text.Grammars.PlainText;
        var t = new Primrose.Text.Controls.TextBox( id, options );
        var mesh = new THREE.Mesh(quad.clone(), new THREE.MeshBasicMaterial({map: t.getRenderer().getTexture()}));
        mesh.textBox = t;
        return mesh;
    };

    return WebVRApplication;
} )();

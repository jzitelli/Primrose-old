/* global Primrose, CANNON, THREE, io, CryptoJS, fmt, Notification, requestFullScreen */
Primrose.VRApp = (function() {
    var RIGHT = new THREE.Vector3(1, 0, 0),
        UP = new THREE.Vector3(0, 1, 0),
        FORWARD = new THREE.Vector3(0, 0, 1);

    var butmap = {
        'A': 1,
        'B': 2,
        'X': 3,
        'Y': 4,
        'leftBumper': 5,
        'rightBumper': 6,
        'leftTrigger': 7,
        'rightTrigger': 8,
        'back': 9,
        'start': 10,
        'leftStick': 11,
        'rightStick': 12,
        'up': 13,
        'down': 14,
        'left': 15,
        'right': 16
    };

    var instructions = [];

    function VRApplication(name, sceneModel, avatarMesh, avatarHeight, walkSpeed, floatSpeed, options) {
        this.options = combineDefaults(options, VRApplication.DEFAULTS);
        Primrose.Application.call(this, name, this.options);
        this.listeners = {
            ready: [],
            update: []
        };
        this.avatarMesh = avatarMesh;
        this.avatarHeight = avatarHeight;
        this.walkSpeed = walkSpeed || 3;
        this.floatSpeed = floatSpeed || 0.666 * this.walkSpeed;

        this.qRoll = new THREE.Quaternion();
        this.qPitch = new THREE.Quaternion();
        this.lt = 0;
        this.frame = 0;
        this.enableMousePitch = true;
        this.currentUser = null;

        this.world = new CANNON.World();
        this.world.defaultContactMaterial.friction = 0.2;
        this.world.gravity.set(0, -this.options.gravity, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.audio = new Primrose.Output.Audio3D();

        this.skyBox = this.options.skyBox;
        this.floor = this.options.floor;
        this.pickingScene = new THREE.Scene();
        this.hudGroup = this.options.hudGroup || new THREE.Group();

        this.editors = [];
        this.hudEditors = [];
        this.currentEditor;

        this.textGeomLog;
        this.log = function(msg) {
            console.log(msg);
            if (this.textGeomLog) {
                this.textGeomLog.log(msg);
            }
        }.bind(this);

        this.qRift = new THREE.Quaternion();
        this.pRift = new THREE.Vector3();
        this.vrParams = null;
        this.vrDisplay = null;
        this.vrSensor = null;
        this.inVR = false;

        this.stats = new Stats();
        this.stats.setMode(0); // 0: fps, 1: ms, 2: mb
        this.stats.domElement.style.position = 'absolute';
        this.stats.domElement.style.left = '0px';
        this.stats.domElement.style.top = '0px';
        document.body.appendChild(this.stats.domElement);

        // for cannon.demo.js:
        this.currentMaterial = new THREE.MeshLambertMaterial({
            color: 0xfedcba,
            side: THREE.DoubleSide
        });
        var settings = this.settings = {
            stepFrequency: 60,
            quatNormalizeSkip: 2,
            quatNormalizeFast: true,
            gx: 0,
            gy: 0,
            gz: 0,
            iterations: 3,
            tolerance: 0.0001,
            k: 1e6,
            d: 3,
            scene: 0,
            paused: false,
            rendermode: "solid",
            constraints: false,
            contacts: false, // Contact points
            cm2contact: false, // center of mass to contact points
            normals: false, // contact normals
            axes: false, // "local" frame axes
            particleSize: 0.1,
            shadows: false,
            aabbs: false,
            profiling: false,
            maxSubSteps: 20
        };

        console.log("doing particle stuff...");
        this.particleGroup = new SPE.Group({
            texture: THREE.ImageUtils.loadTexture('flask_examples/images/smokeparticle.png'),
            maxAge: 200
        });
        this.emitter = new SPE.Emitter({
            position: new THREE.Vector3(0, 2, 0),
            positionSpread: new THREE.Vector3(0, 0, 0),

            acceleration: new THREE.Vector3(0, -10, 0),
            accelerationSpread: new THREE.Vector3(10, 0, 10),

            velocity: new THREE.Vector3(0, 15, 0),
            velocitySpread: new THREE.Vector3(10, 7.5, 10),

            colorStart: new THREE.Color('white'),
            colorEnd: new THREE.Color('red'),

            sizeStart: 1,
            sizeEnd: 1,

            particleCount: 2000
        });
        this.particleGroup.addEmitter(this.emitter);


        this.manaTexture = THREE.ImageUtils.loadTexture("flask_examples/images/mana3.png");


        //
        // keyboard input
        //
        this.keyboard = new Primrose.Input.Keyboard("keyboard", window, [{
            name: "strafeLeft",
            buttons: [-Primrose.Input.Keyboard.A, -Primrose.Input.Keyboard.LEFTARROW]
        }, {
            name: "strafeRight",
            buttons: [Primrose.Input.Keyboard.D,
                Primrose.Input.Keyboard.RIGHTARROW
            ]
        }, {
            name: "driveForward",
            buttons: [-Primrose.Input.Keyboard.W, -Primrose.Input.Keyboard.UPARROW]
        }, {
            name: "driveBack",
            buttons: [Primrose.Input.Keyboard.S,
                Primrose.Input.Keyboard.DOWNARROW
            ]
        }, {
            name: "zeroSensor",
            buttons: [Primrose.Input.Keyboard.Z],
            commandDown: this.zero.bind(this),
            dt: 1
        }, {
            name: "jump",
            buttons: [Primrose.Input.Keyboard.SPACEBAR],
            commandDown: this.jump.bind(this),
            dt: 0.5
        }, {
            name: "resetPosition",
            buttons: [Primrose.Input.Keyboard.P],
            commandUp: this.resetPosition.bind(this)
        }]);
        instructions.push("Keyboard controls");
        instructions.push("-----------------");
        instructions.push("Q: toggle HUD");
        this.keyboard.addCommand({
            name: "toggleHUD",
            buttons: [Primrose.Input.Keyboard.Q],
            commandDown: this.toggleHUD.bind(this),
            dt: 0.25
        });


        //
        // mouse input
        //
        this.mouse = new Primrose.Input.Mouse("mouse", window, [{
            name: "dx",
            axes: [-Primrose.Input.Mouse.X],
            delta: true,
            scale: 0.5
        }, {
            name: "heading",
            commands: ["dx"],
            integrate: true
        }, {
            name: "dy",
            axes: [-Primrose.Input.Mouse.Y],
            delta: true,
            scale: 0.5
        }, {
            name: "pitch",
            commands: ["dy"],
            integrate: true,
            min: -Math.PI *
                0.5,
            max: Math.PI * 0.5
        }]);


        //
        // gamepad input
        //
        this.gamepad = new Primrose.Input.Gamepad("gamepad", [{
            name: "strafe",
            axes: [Primrose.Input.Gamepad.LSX],
            deadzone: 0.25
        }, {
            name: "drive",
            axes: [Primrose.Input.Gamepad.LSY],
            deadzone: 0.2
        }, {
            name: "heading",
            axes: [-Primrose.Input.Gamepad.RSX],
            integrate: true,
            deadzone: 0.2
        }, {
            name: "dheading",
            commands: ["heading"],
            delta: true
        }, {
            name: "pitch",
            axes: [Primrose.Input.Gamepad.RSY],
            buttons: [11],
            deadzone: 0.2,
            integrate: true,
            min: -Math.PI * 0.5,
            max: Math.PI * 0.5
        }, {
            name: "floatup",
            axes: [Primrose.Input.Gamepad.RSY],
            deadzone: 0.13
        }]);

        this.gamepad.addEventListener("gamepadconnected",
            this.connectGamepad.bind(this), false);

        instructions.push("");
        instructions.push("XBOX gamepad controls");
        instructions.push("---------------------");

        instructions.push('A: select next object');
        this.gamepad.addCommand({
            name: "selectNextObj",
            buttons: [butmap.A],
            commandDown: this.selectNextObj.bind(this),
            dt: 0.5
        });
        instructions.push('down: exit current editor');
        this.gamepad.addCommand({
            name: "blurEditor",
            buttons: [butmap.down],
            commandDown: this.blurEditor.bind(this),
            dt: 0.25
        });
        instructions.push('right: focus next editor');
        this.gamepad.addCommand({
            name: "focusNextEditor",
            buttons: [butmap.right],
            commandDown: this.focusNextEditor.bind(this),
            dt: 0.25
        });
        instructions.push('left: focus previous editor');
        this.gamepad.addCommand({
            name: "focusPrevEditor",
            buttons: [butmap.left],
            commandDown: this.focusPrevEditor.bind(this),
            dt: 0.25
        });
        instructions.push('B: evaluate / execute editor contents');
        this.gamepad.addCommand({
            name: "evalEditor",
            buttons: [butmap.B],
            commandDown: this.evalEditor.bind(this),
            dt: 1.0
        });
        instructions.push('start: toggle HUD');
        this.gamepad.addCommand({
            name: "toggleHUD",
            buttons: [butmap.start],
            commandDown: this.toggleHUD.bind(this),
            dt: 0.25
        });
        instructions.push('back: zero VR sensor');
        this.gamepad.addCommand({
            name: "zeroSensor",
            buttons: [butmap.back],
            commandDown: this.zero.bind(this),
            dt: 0.25
        });
        instructions.push('left trigger: create new editor');
        this.gamepad.addCommand({
            name: "newEditor",
            buttons: [butmap.leftTrigger],
            commandDown: this.newEditor.bind(this),
            dt: 1
        });
        instructions.push('right trigger: create new object');
        this.gamepad.addCommand({
            name: "newObject",
            buttons: [butmap.rightTrigger],
            commandDown: this.newObject.bind(this),
            dt: 0.15
        });
        instructions.push('left stick: reset position');
        this.gamepad.addCommand({
            name: "resetPosition",
            buttons: [butmap.leftStick],
            commandDown: this.resetPosition.bind(this),
            dt: 0.25
        });


        var DEBUG_VR = false,
            translations = [new THREE.Matrix4(), new THREE.Matrix4()],
            viewports = [new THREE.Box2(), new THREE.Box2()];

        function setTrans(m, t) {
            m.makeTranslation(t.x, t.y, t.z);
        }

        function setView(b, r) {
            b.min.set(r.x, r.y);
            b.max.set(r.x + r.width, r.y + r.height);
        }

        function checkForVR() {
            findVR(function(display, sensor) {
                if (display && (display.deviceName !== "Mockulus Rift" ||
                        DEBUG_VR)) {
                    this.vrDisplay = display;
                    this.vrSensor = sensor;
                }

                if (!this.vrDisplay) {
                    this.ctrls.goVR.style.display = "none";
                    setTimeout(checkForVR.bind(this), 5000);
                } else {
                    this.ctrls.goVR.style.display = "inline-block";
                    if (this.vrDisplay.getEyeParameters) {
                        this.vrParams = {
                            left: this.vrDisplay.getEyeParameters("left"),
                            right: this.vrDisplay.getEyeParameters("right")
                        };
                    } else {
                        this.vrParams = {
                            left: {
                                renderRect: this.vrDisplay.getRecommendedEyeRenderRect(
                                    "left"),
                                eyeTranslation: this.vrDisplay.getEyeTranslation("left"),
                                recommendedFieldOfView: this.vrDisplay.getRecommendedEyeFieldOfView(
                                    "left")
                            },
                            right: {
                                renderRect: this.vrDisplay.getRecommendedEyeRenderRect(
                                    "right"),
                                eyeTranslation: this.vrDisplay.getEyeTranslation("right"),
                                recommendedFieldOfView: this.vrDisplay.getRecommendedEyeFieldOfView(
                                    "right")
                            }
                        };
                    }

                    setTrans(translations[0], this.vrParams.left.eyeTranslation);
                    setTrans(translations[1], this.vrParams.right.eyeTranslation);
                    setView(viewports[0], this.vrParams.left.renderRect);
                    setView(viewports[1], this.vrParams.right.renderRect);
                }
            }.bind(this));
        }

        checkForVR.call(this);


        //
        // restoring the options the user selected
        //
        writeForm(this.ctrls, this.formState);
        window.addEventListener("beforeunload", function() {
            var state = readForm(this.ctrls);
            setSetting(this.formStateKey, state);
        }.bind(this), false);

        //
        // Setup THREE.js
        //
        this.glove = null;
        this.scene = null;
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            canvas: this.ctrls.frontBuffer
        });

        this.vrEffect = new THREE.VREffect(this.renderer);

        this.renderer.setClearColor(this.options.backgroundColor);

        this.groundMaterial = new CANNON.Material("groundMaterial");
        this.bodyMaterial = new CANNON.Material("bodyMaterial");
        this.bodyGroundContact = new CANNON.ContactMaterial(
            this.bodyMaterial,
            this.groundMaterial, {
                friction: 0.025,
                restitution: 0.3,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e8,
                frictionEquationRegularizationTime: 3
            });
        this.bodyBodyContact = new CANNON.ContactMaterial(
            this.bodyMaterial,
            this.bodyMaterial, {
                friction: 0.4,
                restitution: 0.3,
                contactEquationStiffness: 1e5,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e5,
                frictionEquationRegularizationTime: 3
            });
        this.world.addContactMaterial(this.bodyGroundContact);
        this.world.addContactMaterial(this.bodyBodyContact);

        function addPhysicsBody(obj, body, shape, radius, skipObj) {
            body.addShape(shape);
            body.linearDamping = body.angularDamping = 0.25;
            if (skipObj) {
                body.position.set(obj.x, obj.y + radius / 2, obj.z);
            } else {
                obj.physics = body;
                body.graphics = obj;
                body.position.copy(obj.position);
                body.quaternion.copy(obj.quaternion);
            }
            this.world.add(body);
            return body;
        }

        function makePlane(obj) {
            var shape = new CANNON.Plane();
            var body = new CANNON.Body({
                mass: 0,
                material: this.groundMaterial
            });
            return addPhysicsBody.call(this, obj, body, shape);
        }

        function makeCube(obj) {
            var body = new CANNON.Body({
                mass: 1,
                material: this.bodyMaterial,
                type: CANNON.Body.STATIC
            });
            var b = obj.geometry.boundingBox,
                dx = b.max.x - b.min.x,
                dy = b.max.y - b.min.y,
                dz = b.max.z - b.min.z;
            var shape = new CANNON.Box(new CANNON.Vec3(dx / 2, dy / 2, dz / 2));
            return addPhysicsBody.call(this, obj, body, shape);
        }

        function makeBall(obj, radius, skipObj, mass) {
            if (mass === undefined) mass = 1;
            var body = new CANNON.Body({
                mass: mass,
                material: this.bodyMaterial,
                fixedRotation: true
            });
            var shape = new CANNON.Sphere(radius ||
                obj.geometry.boundingSphere.radius);
            return addPhysicsBody.call(this, obj, body, shape, radius, skipObj);
        }

        function waitForResources(t) {
            this.lt = t;
            if (this.camera && this.scene && this.currentUser) {
                this.setSize();

                if (this.passthrough) {
                    this.camera.add(this.passthrough.mesh);
                }

                this.textGeomLog = new TextGeomLog(this.scene, 10, this.camera);

                /*
                default lights:
                */
                var sunColor = 0xffde99;
                var directionalLight = new THREE.DirectionalLight(sunColor, 1.1);
                directionalLight.position.set(1, 4, 3);
                this.scene.add(directionalLight);

                // var ambientLight = new THREE.AmbientLight(0x404040); // soft white light
                // this.scene.add(ambientLight);

                // var pointLight = new THREE.PointLight(0x402010, 1.5);
                // pointLight.position.set(1, 4, 6);
                // this.scene.add(pointLight);

                var dodeca = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(),
                    new THREE.MeshPhongMaterial({
                        shading: THREE.FlatShading,
                        color: 0x1122ee,
                        shininess: 50,
                        specular: 0xffeeee
                    }));
                dodeca.position.y += 5;
                dodeca.position.z += 5;
                this.scene.add(dodeca);

                if (water) {
                    // Load textures        
                    var waterNormals = new THREE.ImageUtils.loadTexture('flask_examples/images/waternormals.jpg');
                    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

                    // Create the water effect
                    this.ms_Water = new THREE.Water(this.renderer, this.camera, this.scene, {
                        textureWidth: 512,
                        textureHeight: 512,
                        waterNormals: waterNormals,
                        alpha: 1, //0.75,
                        sunDirection: directionalLight.position.normalize(),
                        sunColor: sunColor,
                        waterColor: 0x001e1f,
                        distortionScale: 8.0,
                        fog: true
                    });
                    var aMeshMirror = new THREE.Mesh(
                        new THREE.PlaneBufferGeometry(1000, 1000, 1, 1),
                        this.ms_Water.material
                    );
                    aMeshMirror.add(this.ms_Water);
                    aMeshMirror.rotation.x = -Math.PI / 2;
                    aMeshMirror.position.y -= 3;
                    this.scene.add(aMeshMirror);
                }

                this.scene.traverse(function(obj) {
                    if (obj.name === "Desk") {
                        obj.scale.set(deskScale, deskScale, deskScale);
                        //obj.position.z += 4;
                        //obj.position.y -= 2;
                    }
                    if (obj.name) {
                        console.log(obj.name);
                        console.log(obj);
                    }
                    if (obj instanceof THREE.Mesh && obj.material === undefined) {
                        console.log("material not defined, adding new material...");
                        this.scene.remove(obj);
                        var material = new THREE.MeshLambertMaterial({
                            color: 0x0000ee,
                            shading: THREE.FlatShading
                        });
                        this.scene.add(new THREE.Mesh(obj.geometry, material));
                    }
                });


                if (this.options.fog) {
                    console.log("adding fog...");
                    this.scene.fog = this.options.fog;
                }
                if (this.avatarMesh) {
                    console.log("adding avatarMesh...");
                    this.scene.add(this.avatarMesh);
                }
                if (this.skyBox) {
                    console.log("adding skyBox...");
                    this.scene.add(this.skyBox);
                }
                if (this.floor) {
                    console.log("adding floor...");
                    this.scene.add(this.floor);
                }
                if (this.hudGroup) {
                    console.log("adding hud...");
                    this.scene.add(this.hudGroup);
                }

                this.axisHelper = new THREE.AxisHelper(10);
                this.scene.add(this.axisHelper);

                var dir = new THREE.Vector3(0, 0, -1);
                var origin = new THREE.Vector3(0, 0, -1);
                var length = 1;
                var hex = 0xffff00;
                this.arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
                this.scene.add(this.arrowHelper);


                this.options.editors = this.options.editors || [];
                this.options.editors.push({
                    id: 'hudEditor',
                    w: 2,
                    h: 2,
                    rx: 0,
                    ry: -Math.PI / 4,
                    rz: 0,
                    options: {
                        file: instructions.join('\n'),
                        onlyHUD: true,
                        readOnly: true,
                        showLineNumbers: false,
                        opacity: 0.8
                    },
                    scale: 2,
                    hudx: 4,
                    hudy: 0,
                    hudz: -3
                });
                for (var i = 0; i < this.options.editors.length; ++i) {
                    var editorConfig = this.options.editors[i];
                    editorConfig.options = editorConfig.options || {};
                    editorConfig.options.autoBindEvents = true;
                    var mesh = makeEditor(this.scene, this.pickingScene,
                        editorConfig.id,
                        editorConfig.w || 2, editorConfig.h || 2,
                        editorConfig.x || 0, editorConfig.y || 3, editorConfig.z || -2,
                        editorConfig.rx || 0, editorConfig.ry || 0, editorConfig.rz || 0,
                        editorConfig.options);
                    if (editorConfig.scale) {
                        mesh.scale.x *= editorConfig.scale;
                        mesh.scale.y *= editorConfig.scale;
                        mesh.scale.z *= editorConfig.scale;
                    }
                    var editor = mesh.editor;
                    this.editors.push(editor);
                    this.currentEditor = editor;
                    if (editorConfig.options.filename) {
                        var app = this;
                        $.ajax({
                            url: "/read?filename=" + editorConfig.options.filename
                        }).
                        done(function(data) {
                            app.log("loaded " + data.args.filename);
                            this.value = '' + data.value;
                        }.bind(editor)).
                        fail(function(msg) {
                            app.log("problem: " + msg);
                        });
                    }
                    if (editorConfig.options.onlyHUD === true) {
                        this.scene.remove(mesh);
                    }
                    if (editorConfig.hudx || editorConfig.hudy || editorConfig.hudz) {
                        var hudMesh = mesh.clone();
                        hudMesh.position.set(
                            editorConfig.hudx || 2,
                            editorConfig.hudy || 0,
                            editorConfig.hudz || -3
                        );
                        this.hudGroup.add(hudMesh);
                        this.hudEditors.push(editor);
                    }
                }


                // load the terrain:
                $.ajax({
                    url: "/read?filename=terrain.js"
                }).
                done(function(data) {
                    this.log("loaded " + data.args.filename);
                    eval(data.value);
                }.bind(this)).
                fail(function(jqXHR, textStatus) {
                    this.log("problem loading terrain:");
                    this.log(textStatus);
                }.bind(this));

                console.log("adding particles to scene...");
                this.scene.add(this.particleGroup.mesh);
                this.particleGroup.mesh.name = "particleMesh";
                this.particleGroup.mesh.position.y = 3;
                console.log(this.particleGroup.mesh);

                this.printInstructions();

                this.animate = this.animate.bind(this);
                this.fire("ready");
                requestAnimationFrame(this.animate);
            } else {
                requestAnimationFrame(waitForResources.bind(this));
            }
        }

        this.printInstructions = function() {
            for (var i = 0; i < instructions.length; ++i) {
                this.log(instructions[i]);
            }
        }.bind(this);

        this.start = function() {
            requestAnimationFrame(waitForResources.bind(this));
        };



        // this.addPhysicsBody = function(obj, body, shape, radius, skipObj) {
        //   body.addShape(shape);
        //   body.linearDamping = body.angularDamping = 0.15;
        //   if (skipObj) {
        //     body.position.set(obj.x, obj.y + radius / 2, obj.z);
        //   } else {
        //     obj.physics = body;
        //     body.graphics = obj;
        //     body.position.copy(obj.position);
        //     body.quaternion.copy(obj.quaternion);
        //   }
        //   this.world.add(body);
        //   return body;
        // };

        // this.makeBall = function(obj, radius, skipObj) {
        //   var body = new CANNON.Body({
        //     mass: 1,
        //     material: this.bodyMaterial
        //   });
        //   var shape = new CANNON.Sphere(radius ||
        //     obj.geometry.boundingSphere.radius);
        //   body = this.addPhysicsBody(obj, body, shape, radius, skipObj);
        //   body.velocity.copy(this.currentUser.velocity);
        // };

        window.addEventListener("resize", this.setSize.bind(this), false);

        if (DEBUG_MODE) {
            console.log("creating bare scene....");
            this.scene = new THREE.Scene();
            // this.scene.overrideMaterial = new THREE.MeshLambertMaterial({color: 0xffee00});
            this.camera = new THREE.PerspectiveCamera(75, 1.77778, 1, 1000);
            this.scene.add(this.camera);
            console.log("adding currentUser...");
            this.currentUser = makeBall.call(
                this, this.avatarMesh || new THREE.Vector3(0, 3, 5), this.avatarHeight / 2, this.avatarMesh === undefined);
            console.log(this.currentUser);
        } else {
            console.log("loading scene " + sceneModel);
            Primrose.ModelLoader.loadScene(sceneModel, function(sceneGraph) {
                console.log("loaded " + sceneModel);
                this.scene = sceneGraph;
                console.log("traversing scene...");
                this.scene.traverse(function(obj) {
                    if (obj.isSolid) {
                        if (obj.name.startsWith("Plane")) {
                            makePlane.call(this, obj);
                        } else {
                            //makeBall.call(this, obj);
                        }
                    }
                }.bind(this));

                console.log("adding camera...");
                if (this.scene.Camera) {
                    this.camera = this.scene.Camera;
                } else {
                    this.camera = new THREE.PerspectiveCamera(75, 1.77778, 1, 1000);
                }
                console.log(this.camera);

                console.log("adding currentUser...");
                this.currentUser = makeBall.call(
                    this, this.avatarMesh, this.avatarHeight / 2, false);
                console.log(this.currentUser);
            }.bind(this));
        }

        this.fullScreen = function() {
            if (this.ctrls.frontBuffer.webkitRequestFullscreen) {
                this.ctrls.frontBuffer.webkitRequestFullscreen({
                    vrDisplay: this.vrDisplay
                });
            } else if (this.ctrls.frontBuffer.mozRequestFullScreen) {
                this.ctrls.frontBuffer.mozRequestFullScreen({
                    vrDisplay: this.vrDisplay
                });
            }
        };

        this.renderScene = function(s, rt, fc) {
            if (this.skyBox) {
                this.skyBox.position.copy(this.camera.position);
            }
            if (this.hudGroup) {
                this.hudGroup.position.copy(this.camera.position);
                //this.hudGroup.quaternion.copy(this.camera.quaternion);
            }

            if (this.inVR) {
                if (this.vrEffect) {
                    this.vrEffect.render(s, this.camera);
                } else {
                    this.renderer.renderStereo(s, this.camera, rt, fc, translations,
                        viewports);
                }
            } else {
                this.renderer.render(s, this.camera, rt, fc);
            }
        };

        this.ctrls.goRegular.addEventListener("click", function() {
            requestFullScreen(this.ctrls.frontBuffer);
            this.inVR = false;
            this.setSize();
        }.bind(this));
        this.ctrls.goVR.addEventListener("click", function() {
            requestFullScreen(this.ctrls.frontBuffer, this.vrDisplay);
            this.inVR = true;
            this.setSize();
        }.bind(this));
    }

    inherit(VRApplication, Primrose.Application);

    VRApplication.DEFAULTS = {
        gravity: 9.8, // the acceleration applied to falling objects
        backgroundColor: 0x000012,
        // the color that WebGL clears the background with before drawing
        drawDistance: 2000, // the far plane of the camera
        chatTextSize: 0.25, // the size of a single line of text, in world units
        dtNetworkUpdate: 0.125 // the amount of time to allow to elapse between sending state to teh server
    };

    VRApplication.prototype.addEventListener = function(event, thunk) {
        if (this.listeners[event]) {
            this.listeners[event].push(thunk);
        }
    };

    VRApplication.prototype.fire = function(name, arg1, arg2, arg3, arg4) {
        for (var i = 0; i < this.listeners[name].length; ++i) {
            this.listeners[name][i](arg1, arg2, arg3, arg4);
        }
    };

    function addCell(row, elem) {
        if (typeof elem === "string") {
            elem = document.createTextNode(elem);
        }
        var cell = document.createElement("td");
        cell.appendChild(elem);
        row.appendChild(cell);
    }

    VRApplication.prototype.setupModuleEvents = function(container, module,
        name) {
        var eID = name + "Enable",
            tID = name + "Transmit",
            rID = name + "Receive",
            e = document.createElement("input"),
            t = document.createElement("input"),
            r = document.createElement("input"),
            row = document.createElement("tr");

        this.ctrls[eID] = e;
        this.ctrls[tID] = t;
        this.ctrls[rID] = r;

        e.id = eID;
        t.id = tID;
        r.id = rID;

        e.type = t.type = r.type = "checkbox";

        e.checked = this.formState[eID];
        t.checked = this.formState[tID];
        r.checked = this.formState[rID];

        e.addEventListener("change", function() {
            module.enable(e.checked);
            t.disabled = !e.checked;
            if (t.checked && t.disabled) {
                t.checked = false;
            }
        });

        t.addEventListener("change", function() {
            module.transmit(t.checked);
        });

        r.addEventListener("change", function() {
            module.receive(r.checked);
        });

        container.appendChild(row);
        addCell(row, name);
        addCell(row, e);
        addCell(row, t);
        addCell(row, r);
        if (module.zeroAxes) {
            var zID = name + "Zero",
                z = document.createElement("input");
            this.ctrls[zID] = z;
            z.id = zID;
            z.type = "checkbox";
            z.checked = this.formState[zID];
            z.addEventListener("click", module.zeroAxes.bind(module), false);
            addCell(row, z);
        } else {
            r.colspan = 2;
        }

        module.enable(e.checked);
        module.transmit(t.checked);
        module.receive(r.checked);
        t.disabled = !e.checked;
        if (t.checked && t.disabled) {
            t.checked = false;
        }
    };

    VRApplication.prototype.setSize = function() {
        var styleWidth = this.ctrls.outputContainer.clientWidth,
            styleHeight = this.ctrls.outputContainer.clientHeight,
            ratio = window.devicePixelRatio || 1,
            fieldOfView = 75,
            canvasWidth = styleWidth * ratio,
            canvasHeight = styleHeight * ratio,
            aspectWidth = canvasWidth;
        if (this.inVR) {
            canvasWidth = this.vrParams.left.renderRect.width +
                this.vrParams.right.renderRect.width;
            canvasHeight = Math.max(this.vrParams.left.renderRect.height,
                this.vrParams.right.renderRect.height);
            aspectWidth = canvasWidth / 2;
            fieldOfView = (this.vrParams.left.recommendedFieldOfView.leftDegrees +
                this.vrParams.left.recommendedFieldOfView.rightDegrees);
        }
        this.renderer.domElement.style.width = px(styleWidth);
        this.renderer.domElement.style.height = px(styleHeight);
        this.renderer.domElement.width = canvasWidth;
        this.renderer.domElement.height = canvasHeight;
        this.renderer.setViewport(0, 0, canvasWidth, canvasHeight);
        if (this.camera) {
            this.camera.fov = fieldOfView;
            this.camera.aspect = aspectWidth / canvasHeight;
            this.camera.updateProjectionMatrix();
        }
        /*
        workaround for renderStereo issues...
        */
        if (this.vrEffect) {
            this.vrEffect.setSize(canvasWidth, canvasHeight);
        }
    };

    VRApplication.prototype.connectGamepad = function(id) {
        if (!this.gamepad.isGamepadSet()) {
            this.gamepad.setGamepad(id);
        }
    };


    VRApplication.prototype.resetPosition = function() {
        this.currentUser.position.set(0, 2, 0);
        this.currentUser.velocity.set(0, 0, 0);
    };

    VRApplication.prototype.zero = function() {
        if (this.vrSensor) {
            this.vrSensor.resetSensor();
        }
    };

    VRApplication.prototype.jump = function() {
        if (this.onground && this.jumpVelocity) {
            this.currentUser.velocity.y += this.jumpVelocity;
            this.onground = false;
        }
    };

    VRApplication.prototype.selectNextObj = function() {
        // function selectables() {
        //     var objs = [];
        //     for (var i = 0; i < scene.children.length; ++i) {
        //         var obj = scene.children[i];
        //         if (obj instanceof THREE.Mesh) {
        //             objs.push(obj);
        //         }
        //     }
        //     return objs;
        // }
        // var objs = selectables();
        // this.currentObject = this.currentObject || objs[0];
        // for (var i = 0; i < objs.length; ++i) {
        //     var obj = objs[i];
        //     if (this.currentObject === obj) {
        //         if (i == objs.length - 1) {
        //             this.currentObject = objs[0];
        //         } else {
        //             this.currentObject = objs[i + 1];
        //         }
        //         break;
        //     }
        // }
        // log("currentObject: " + this.currentObject.name);
    };

    /* 
    for cannon.js:
    */
    VRApplication.prototype.shape2mesh = CANNON.Demo.prototype.shape2mesh;
    VRApplication.prototype.addVisual = CANNON.Demo.prototype.addVisual;

    VRApplication.prototype.newObject = function() {
        if (this.scene) {
            var material = new THREE.SpriteMaterial({
                map: this.manaTexture,
                color: 0xffffff,
                fog: true
            });
            var sprite = new THREE.Sprite(material);
            var mesh = sprite;

            mesh.position.copy(this.currentUser.position);
            mesh.position.y += 4;
            mesh.position.z -= 4;
            this.scene.add(mesh);
            var body = makeBall.call(this, mesh, 0.5);
        }
    };

    VRApplication.prototype.evalEditor = function() {
        if (this.currentEditor) {
            this.currentEditor.blur();
            console.log("editor contents to eval:");
            console.log(this.currentEditor.getLines().join(''));
            if (this.currentEditor.getTokenizer() === Primrose.Text.Grammars.JavaScript) {
                try {
                    this.log("trying javascript eval...");
                    eval(this.currentEditor.getLines().map(function(item) {
                        return item.split('//')[0] // TODO: more robust comment stripping
                    }).join(''));
                    this.log("javascript success!");
                } catch (exp) {
                    this.log("caught javascript exception:");
                    this.log(exp.message);
                }
            } else if (this.currentEditor.getTokenizer() === Primrose.Text.Grammars.Python) {
                this.log("trying python exec...");
                $.ajax({url: '/python_eval?pystr=' + this.currentEditor.getLines().join('%0A')
                }).done(function(data) {
                    this.log("python success!");
                    var lines = data.out.split('\n');
                    for (var i = 0; i < lines.length; ++i) {
                        this.log(lines[i]);
                    }
                    this.log("python returned:");
                    this.log(data.value);
                }.bind(this))
                    .fail(function(jqXHR, textStatus) {
                        this.log("there was a problem evaluating Python code");
                    }.bind(this));
            }
        }
    };

    VRApplication.prototype.blurEditor = function() {
        if (this.currentEditor) {
            this.currentEditor.blur();
        }
    };

    VRApplication.prototype.focusNearestEditor = function() {
        if (this.currentEditor) {
            if (this.currentEditor.focused) {
                this.currentEditor.blur();
            } else {
                this.currentEditor.focus();
                this.currentUser.velocity.set(0, 0, 0);
            }
        }
    };

    VRApplication.prototype.focusNextEditor = function() {
        if (this.currentEditor) {
            this.currentEditor.blur();
        }
        for (var i = 0; i < this.editors.length; ++i) {
            var editor = this.editors[i];
            if (editor === this.currentEditor) {
                if (i === this.editors.length - 1) {
                    this.currentEditor = this.editors[0];
                } else {
                    this.currentEditor = this.editors[i + 1];
                }
                break;
            }
        }
        this.focusNearestEditor();
    };

    VRApplication.prototype.focusPrevEditor = function() {
        if (this.currentEditor) {
            this.currentEditor.blur();
        }
        for (var i = 0; i < this.editors.length; ++i) {
            var editor = this.editors[i];
            if (editor === this.currentEditor) {
                if (i === 0) {
                    this.currentEditor = this.editors[this.editors.length - 1];
                } else {
                    this.currentEditor = this.editors[i - 1];
                }
                break;
            }
        }
        this.focusNearestEditor();
    };

    VRApplication.prototype.toggleHUD = function() {
        if (this.hudGroup) {
            this.hudGroup.visible = !this.hudGroup.visible;
            if (this.hudGroup.visible) {
                $("#main").hide();
            }
        }
    };

    VRApplication.prototype.newEditor = function() {
        var hud = false;
        if (this.scene) {
            var id = "editor" + this.editors.length;
            var mesh = makeEditor(this.scene, this.pickingScene,
                id, 2, 2,
                0, 0, 0,
                0, 0, 0, {
                    autoBindEvents: true
                });
            var editor = mesh.editor;
            $.ajax({
                url: "/read?filename=newEditor.js"
            }).
            done(function(data) {
                console.log("loaded " + data.args.filename);
                this.value = '' + data.value;
            }.bind(editor)).
            fail(function() {
                console.log("problem!");
            });

            var scale = 2;
            mesh.scale.x *= scale;
            mesh.scale.y *= scale;
            mesh.scale.z *= scale;
            mesh.position.copy(this.currentUser.position);
            mesh.position.z -= 3;
            mesh.position.y += 2;
            this.editors.push(editor);
            this.currentEditor = editor;
            this.currentEditor.focus();
        }
    };


    var heading = 0,
        strafe,
        drive,
        pitch = 0;

    VRApplication.prototype.animate = function(t) {
        requestAnimationFrame(this.animate);
        var dt = (t - this.lt) * 0.001;
        this.lt = t;
        var len,
            j,
            c;

        this.keyboard.update(dt);
        this.mouse.update(dt);
        this.gamepad.update(dt);


        heading = this.gamepad.getValue("heading"); // + this.mouse.getValue("heading");
        this.currentUser.quaternion.setFromAxisAngle(UP, heading);
        var cosHeading = Math.cos(heading),
            sinHeading = Math.sin(heading);

        // TODO: pitch controls
        // pitch = -this.gamepad.getValue("pitch");
        // if (this.gamepad.inputState.buttons[11]) {
        //   this.currentUser.velocity.y = this.currentUser.velocity.y * 0.1;
        //   v = new CANNON.Vec3(Math.cos(pitch) * Math.sin(heading), -Math.sin(pitch), Math.cos(pitch) * Math.cos(heading));
        //   floatup = 0;
        // } else {
        //   v = new CANNON.Vec3(Math.sin(heading), 0, Math.cos(heading));
        // }
        // v = new CANNON.Vec3(Math.cos(pitch) * Math.sin(heading), -Math.sin(pitch), Math.cos(pitch) * Math.cos(heading));
        // this.currentUser.quaternion.setFromVectors(u, v);


        var floatSpeed = 0.6 * this.walkSpeed;
        var floatup = -floatSpeed * this.gamepad.getValue("floatup");
        this.currentUser.velocity.y = this.currentUser.velocity.y * 0.1 + floatup * 0.9;
        if (this.onground && this.currentUser.velocity.y < 0) {
            this.currentUser.velocity.y = 0;
        }

        strafe = this.gamepad.getValue("strafe");
        drive = this.gamepad.getValue("drive");
        // disable keyboard movement controls when editor is focused:
        if (!this.currentEditor || !this.currentEditor.focused) {
            strafe += this.keyboard.getValue("strafeRight") + this.keyboard.getValue("strafeLeft");
            drive += this.keyboard.getValue("driveBack") + this.keyboard.getValue("driveForward");
        }
        if (strafe || drive) {
            len = this.walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive +
                strafe * strafe));
        } else {
            len = 0;
        }
        strafe *= len;
        drive *= len;
        len = strafe * Math.cos(heading) + drive * Math.sin(heading);
        drive = drive * Math.cos(heading) - strafe * Math.sin(heading);
        strafe = len;
        this.currentUser.velocity.x = this.currentUser.velocity.x * 0.9 +
            strafe * 0.1;
        this.currentUser.velocity.z = this.currentUser.velocity.z * 0.9 +
            drive * 0.1;

        //
        // do collision detection
        //
        this.world.step(dt);
        for (j = 0; j < this.world.bodies.length; ++j) {
            var obj = this.world.bodies[j];
            if (obj.graphics) {
                obj.graphics.position.copy(obj.position);
                obj.graphics.quaternion.copy(obj.quaternion);
            }
        }

        this.onground = false;
        for (j = 0; j < this.world.contacts.length; ++j) {
            c = this.world.contacts[j];
            if (c.bi === this.currentUser) {
                this.onground = true;
                break;
            }
        }

        if (this.dragging) {
            this.pick("move");
        }

        this.fire("update", dt);

        if (water && this.ms_Water) {
            this.ms_Water.render();
            this.ms_Water.material.uniforms.time.value += dt * 0.0003;
        }
        if (this.particleGroup) {
            this.particleGroup.tick(dt * 0.0003);
        }

        //
        // update the camera
        //
        this.camera.quaternion.copy(this.currentUser.quaternion);
        this.camera.position.copy(this.currentUser.position);

        if (this.inVR) {
            var state = this.vrSensor.getState();

            if (state.orientation) {
                this.qRift.copy(state.orientation);
            }
            this.camera.quaternion.multiply(this.qRift);

            if (state.position) {
                this.pRift.copy(state.position);
            }
            var dRift = this.currentUser.graphics.localToWorld(this.pRift);
            dRift.x /= avatarScale;
            dRift.y /= avatarScale;
            dRift.z /= avatarScale;
            this.camera.position.add(dRift);
        }

        this.camera.position.y += this.avatarHeight;

        this.stats.begin();
        this.renderScene(this.scene);
        this.stats.end();
    };

    return VRApplication;
})();



var DEBUG_MODE = $.QueryString['debug'];

var fogColor = 0x2122ee; //0x000110;
var options = {
    backgroundColor: fogColor,
    gravity: 0, // 9.8,
    drawDistance: 2000,
    dtNetworkUpdate: 10
};

//options.fog = new THREE.FogExp2(fogColor, 0.015, 20, 800);

function makeSkyBox() {
    // from http://stemkoski.github.io/Three.js/#skybox
    var imagePrefix = "flask_examples/images/dawnmountain-";
    var directions = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"];
    var imageSuffix = ".png";
    var images = directions.map(function(dir) {
        return imagePrefix + dir + imageSuffix;
    });
    var textureCube = THREE.ImageUtils.loadTextureCube(images);
    // see http://stackoverflow.com/q/16310880
    var skyGeometry = new THREE.CubeGeometry(800, 800, 800);
    var shader = THREE.ShaderLib["cube"];
    shader.uniforms["tCube"].value = textureCube;
    var skyMaterial = new THREE.ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    });
    return new THREE.Mesh(skyGeometry, skyMaterial);
}

options.skyBox = makeSkyBox();
options.editors = [{
    id: 'editor0',
    w: 2,
    h: 2,
    x: 0,
    y: 8,
    z: -3,
    rx: 0,
    ry: 0,
    rz: 0,
    options: {
        filename: "editor0.js",
        tokenizer: Primrose.Text.Grammars.JavaScript
    },
    scale: 2
}, {
    id: 'editor1',
    w: 2,
    h: 2,
    x: -8,
    y: 4,
    z: -2,
    rx: 0,
    ry: Math.PI / 4,
    rz: 0,
    options: {
        filename: "editor1.py",
        tokenizer: Primrose.Text.Grammars.Python
    },
    scale: 2
}];

var walkSpeed = 3;
var floatSpeed = walkSpeed * 0.666;
var water = false;
var sceneModel = $.QueryString['sceneModel'] || "flask_examples/models/ConfigUtilDeskScene.json";
var deskScale = 0.011;

var skyBox = makeSkyBox();

var avatarScale = 3;
var avatarHeight = 3;
var avatarMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1.23, 12, 16), new THREE.MeshLambertMaterial({
    color: 0x998700,
    side: THREE.DoubleSide
}));
avatarMesh.name = "avatarMesh";
avatarMesh.geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
avatarMesh.scale.x = avatarScale;
avatarMesh.scale.y = avatarScale;
avatarMesh.scale.z = avatarScale;


/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */
var application;

function StartDemo() {
    "use strict";
    application = new Primrose.VRApp("Demo", sceneModel, avatarMesh, avatarHeight, walkSpeed, floatSpeed, options);

    var t = 0;
    application.addEventListener("update", function(dt) {
        t += dt;
    });

    application.start();

    if (DEBUG_MODE) {
        $("#main").hide();
    }
}
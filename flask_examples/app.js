/* global Primrose, CANNON, THREE, io, CryptoJS, fmt, Notification, requestFullScreen */
Primrose.VRApp = (function() {
    var RIGHT = new THREE.Vector3(1, 0, 0),
        UP = new THREE.Vector3(0, 1, 0),
        FORWARD = new THREE.Vector3(0, 0, 1);

    var instructions = [];

    function VRApplication(name, sceneModel, avatarMesh, avatarHeight, avatarRadius, walkSpeed, floatSpeed, options) {
        this.options = combineDefaults(options, VRApplication.DEFAULTS);
        Primrose.Application.call(this, name, this.options);
        this.listeners = {
            ready: [],
            update: []
        };
        this.avatarMesh = avatarMesh;
        this.avatarHeight = avatarHeight;
        this.avatarRadius = avatarRadius;
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
            if (LOG_MODE) {
                if (this.textGeomLog) {
                    this.textGeomLog.log(msg);
                }
            }
        }.bind(this);

        this.qRift = new THREE.Quaternion();
        this.pRift = new THREE.Vector3();
        this.vrParams = null;
        this.vrDisplay = null;
        this.vrSensor = null;
        this.inVR = VR_MODE || false;

        this.stats = new Stats();
        this.stats.setMode(0); // 0: fps, 1: ms, 2: mb
        this.stats.domElement.style.position = 'absolute';
        this.stats.domElement.style.left = '0px';
        this.stats.domElement.style.top = '0px';
        document.body.appendChild(this.stats.domElement);

        this.xboxSprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: THREE.ImageUtils.loadTexture("flask_examples/images/xbox.png"),
            color: 0xffffff
        }));
        this.xboxSprite.position.z = -4;
        this.xboxSprite.position.y = 2.5;
        this.hudGroup.add(this.xboxSprite);

        this.brushTexture = THREE.ImageUtils.loadTexture($.QueryString['brushTexture'] || "flask_examples/images/smokeparticle.png");
        this.brushSprite = new THREE.SpriteMaterial({
            map: this.brushTexture,
            color: 0xffffff,
            fog: true
        });

        // for cannon.demo.js:
        this.currentMaterial = new THREE.MeshLambertMaterial({
            color: 0xffeeee, //0xfedcba,
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

        // this.particleGroup = new SPE.Group({
        //     texture: THREE.ImageUtils.loadTexture('flask_examples/images/smokeparticle.png'),
        //     maxAge: 100
        // });
        // this.emitter = new SPE.Emitter({
        //     position: new THREE.Vector3(0, 0, -2),
        //     positionSpread: new THREE.Vector3(0, 0, 0),
        //     acceleration: new THREE.Vector3(0, -10, 0),
        //     accelerationSpread: new THREE.Vector3(10, 0, 10),
        //     velocity: new THREE.Vector3(0, 15, 0),
        //     velocitySpread: new THREE.Vector3(10, 7.5, 10),
        //     colorStart: new THREE.Color('white'),
        //     colorEnd: new THREE.Color('red'),
        //     sizeStart: 1,
        //     sizeEnd: 1,
        //     particleCount: 2000
        // });
        // this.particleGroup.addEmitter(this.emitter);

        this.physicsEnabled = true;

        //
        // keyboard input
        //
        instructions.push("Keyboard controls");
        instructions.push("-----------------");
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
            name: "floatUp",
            buttons: [Primrose.Input.Keyboard.E]
        }, {
            name: "floatDown",
            buttons: [Primrose.Input.Keyboard.C]
        }]);

        instructions.push("Z: zero VR sensor");
        this.keyboard.addCommand({
            name: "zeroSensor",
            buttons: [Primrose.Input.Keyboard.Z],
            commandDown: this.zero.bind(this),
            dt: 1
        });
        instructions.push("space: jump");
        this.keyboard.addCommand({
            name: "jump",
            buttons: [Primrose.Input.Keyboard.SPACEBAR],
            commandDown: this.jump.bind(this),
            dt: 0.5
        });
        instructions.push("P: reset position");
        this.keyboard.addCommand({
            name: "resetPosition",
            buttons: [Primrose.Input.Keyboard.P],
            commandUp: this.resetPosition.bind(this)
        });
        instructions.push("B: toggle physics");
        this.keyboard.addCommand({
            name: "togglePhysics",
            buttons: [Primrose.Input.Keyboard.B],
            commandDown: this.togglePhysics.bind(this),
            dt: 0.5
        });
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
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.A],
            commandDown: this.selectNextObj.bind(this),
            dt: 0.25
        });
        instructions.push('up: ?');
        this.gamepad.addCommand({
            name: "mystery",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.up],
            commandDown: this.mystery.bind(this),
            dt: 0.25
        });
        instructions.push('down: exit current editor');
        this.gamepad.addCommand({
            name: "blurEditor",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.down],
            commandDown: this.blurEditor.bind(this),
            dt: 0.25
        });
        instructions.push('right: focus next editor');
        this.gamepad.addCommand({
            name: "focusNextEditor",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.right],
            commandDown: this.focusNextEditor.bind(this),
            dt: 0.25
        });
        instructions.push('left: focus previous editor');
        this.gamepad.addCommand({
            name: "focusPrevEditor",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.left],
            commandDown: this.focusPrevEditor.bind(this),
            dt: 0.25
        });
        instructions.push('B: evaluate / execute editor contents');
        this.gamepad.addCommand({
            name: "evalEditor",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.B],
            commandDown: this.evalEditor.bind(this),
            dt: 1.0
        });
        instructions.push('start: toggle HUD');
        this.gamepad.addCommand({
            name: "toggleHUD",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.start],
            commandDown: this.toggleHUD.bind(this),
            dt: 0.25
        });
        instructions.push('back: zero VR sensor');
        this.gamepad.addCommand({
            name: "zeroSensor",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
            commandDown: this.zero.bind(this),
            dt: 0.25
        });
        // instructions.push('left trigger: create new editor');
        // this.gamepad.addCommand({
        //     name: "newEditor",
        //     buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftTrigger],
        //     commandDown: this.newEditor.bind(this),
        //     dt: 1
        // });
        instructions.push('left trigger: brush down');
        this.gamepad.addCommand({
            name: "brushDown",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftTrigger],
            commandDown: this.brushDown.bind(this),
            dt: 0.04
        });
        instructions.push('right trigger: create new object');
        this.gamepad.addCommand({
            name: "newObject",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightTrigger],
            commandDown: this.newObject.bind(this),
            dt: 0.15
        });
        // instructions.push('left stick: reset position');
        // this.gamepad.addCommand({
        //     name: "resetPosition",
        //     buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
        //     commandDown: this.resetPosition.bind(this),
        //     dt: 0.25
        // });

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
                frictionEquationRegularizationTime: 2
            });
        this.bodyBodyContact = new CANNON.ContactMaterial(
            this.bodyMaterial,
            this.bodyMaterial, {
                friction: 0.024,
                restitution: 0.3,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e8,
                frictionEquationRegularizationTime: 2
            });
        this.world.addContactMaterial(this.bodyGroundContact);
        this.world.addContactMaterial(this.bodyBodyContact);

        function addPhysicsBody(obj, body, shape, radius, skipObj) {
            body.addShape(shape);
            body.linearDamping = body.angularDamping = 0.01;
            this.world.objects = this.world.objects || [];
            if (skipObj) {
                body.position.set(obj.x, obj.y + radius / 2, obj.z);
            } else {
                obj.physics = body;
                body.graphics = obj;
                body.position.copy(obj.position);
                body.quaternion.copy(obj.quaternion);
                this.world.objects.push(obj);
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

        function makeBall(obj, mass, radius, skipObj, options) {
            options = options || {
                fixedRotation: true
            };
            var body = new CANNON.Body({
                mass: mass,
                material: this.bodyMaterial,
                fixedRotation: options.fixedRotation
            });
            var shape = new CANNON.Sphere(radius ||
                obj.geometry.boundingSphere.radius);
            return addPhysicsBody.call(this, obj, body, shape, radius, skipObj);
        }
        this.makeBall = makeBall.bind(this);

        function makeTetra(obj, mass, skipObj, options) {
            var shape = new CANNON.Tetra();
        }

        function waitForResources(t) {
            this.lt = t;
            if (this.camera && this.scene && this.avatarMesh) {
                this.setSize();

                if (this.passthrough) {
                    this.camera.add(this.passthrough.mesh);
                }

                this.textGeomLog = new TextGeomLog(this.scene, 20, this.camera, this.hudGroup, 0xff0123);

                /*
                default lights:
                */
                var sunColor = 0xffde99;
                var directionalLight = new THREE.DirectionalLight(sunColor, 1);
                directionalLight.position.set(1, 4, 3);
                this.scene.add(directionalLight);

                // var ambientLight = new THREE.AmbientLight(0x404040); // soft white light
                // this.scene.add(ambientLight);

                var pointLight = new THREE.PointLight(0x402010, 1.5);
                pointLight.position.set(1, 4, 6);
                this.scene.add(pointLight);

                // var dodeca = new THREE.Mesh(
                //     new THREE.DodecahedronGeometry(),
                //     new THREE.MeshPhongMaterial({
                //         shading: THREE.FlatShading,
                //         color: 0x1122ee,
                //         shininess: 50,
                //         specular: 0xffeeee
                //     }));

                // dodeca.position.y += 5;
                // dodeca.position.z += 5;
                // this.scene.add(dodeca);

                console.log("adding avatarMesh...");
                this.avatarMesh = new THREE.Mesh(this.avatarMesh.geometry.clone(),
                    new THREE.MeshPhongMaterial({
                        shading: THREE.FlatShading,
                        color: 0x1122ee,
                        shininess: 50,
                        specular: 0xffeeee
                    }));
                this.avatarMesh.geometry.computeVertexNormals();
                this.avatarMesh.geometry.computeFaceNormals();
                this.scene.add(this.avatarMesh);

                this.log("adding currentUser...");
                this.currentUser = makeBall.call(this, this.avatarMesh, 1, this.avatarRadius, false);
                console.log(this.currentUser);

                if (WATER_MODE) {
                    // Load textures        
                    var waterNormals = new THREE.ImageUtils.loadTexture('flask_examples/images/waternormals.jpg');
                    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

                    // Create the water effect
                    this.ms_Water = new THREE.Water(this.renderer, this.camera, this.scene, {
                        textureWidth: 1024,
                        textureHeight: 1024,
                        waterNormals: waterNormals,
                        alpha: 1, //0.75,
                        sunDirection: directionalLight.position.normalize(),
                        sunColor: sunColor,
                        waterColor: 0x001e1f,
                        distortionScale: 8.0,
                        fog: true,
                        side: THREE.DoubleSide,
                        castShadow: false
                    });
                    var aMeshMirror = new THREE.Mesh(
                        new THREE.PlaneBufferGeometry(500, 500, 1, 1),
                        this.ms_Water.material
                    );
                    aMeshMirror.add(this.ms_Water);
                    aMeshMirror.rotation.x = -Math.PI / 2;
                    aMeshMirror.position.y += 15;
                    this.scene.add(aMeshMirror);
                }

                this.scene.traverse(function(obj) {
                    if (obj.name) {
                        console.log(obj.name);
                        console.log(obj);
                    }
                    if (obj.name == "Desk") {
                        obj.geometry.applyMatrix(new THREE.Matrix4().makeScale(deskScale, deskScale, deskScale));
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

                // var dir = new THREE.Vector3(0, 0, -1);
                // var origin = new THREE.Vector3(0, 0, -1);
                // var length = 1;
                // var hex = 0xffff00;
                // this.arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
                // this.scene.add(this.arrowHelper);


                this.options.editors = this.options.editors || [];
                // default HUD editor
                this.options.editors.push({
                    id: 'hudEditor',
                    w: 2,
                    h: 2,
                    rx: 0,
                    ry: -Math.PI / 8,
                    rz: 0,
                    options: {
                        opacity: 0.7,
                        file: instructions.join('\n'),
                        onlyHUD: true,
                        readOnly: true,
                        hideLineNumbers: true,
                        hideScrollBars: true
                    },
                    scale: 2.5,
                    hudx: 1.7,
                    hudy: 0,
                    hudz: -6.5
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
                        fail(function(jqXHR, textStatus) {
                            app.log("problem loading file: " + textStatus);
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

                var geometry = new THREE.Geometry();
                var sprite = THREE.ImageUtils.loadTexture("flask_examples/images/mana5.png");
                var colors = [];
                for (i = 0; i < 5000; i++) {
                    var vertex = new THREE.Vector3();
                    vertex.x = 1000 * Math.random() - 1000;
                    vertex.y = 1000 * Math.random() - 1000;
                    vertex.z = 1000 * Math.random() - 1000;
                    geometry.vertices.push(vertex);
                    colors[i] = new THREE.Color(0xffffff);
                    colors[i].setHSL((vertex.x + 1000) / 2000, 1, 0.5);
                }
                geometry.colors = colors;

                // console.log("doing particle stuff...");

                if (TERRAIN_MODE) {
                    this.log("adding terrain to scene...");
                    application = this;
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
                }

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

        window.addEventListener("resize", this.setSize.bind(this), false);

        if (EMPTY_MODE) {
            console.log("creating empty scene...");
            this.scene = new THREE.Scene();
            // this.scene.overrideMaterial = new THREE.MeshLambertMaterial({color: 0xffee00});
            this.camera = new THREE.PerspectiveCamera(75, 1.77778, 0.1, 1000);
            this.scene.add(this.camera);
        } else {
            console.log("loading scene " + sceneModel);
            Primrose.ModelLoader.loadScene(sceneModel, function(sceneGraph) {
                console.log("loaded " + sceneModel);
                console.log(sceneGraph);
                this.scene = new THREE.Scene();
                // var light = new THREE.DirectionalLight(0xffffff);
                // light.position.set(-1,3,4);
                // this.scene.add(light);
                // sceneGraph.scale.set(1.0, 1.0, 1.0);
                this.scene.add(sceneGraph);
                //this.scene = sceneGraph;
                console.log("traversing scene...");
                this.scene.traverse(function(obj) {
                    this.log("object: " + obj.name);
                }.bind(this));
                console.log("adding camera...");
                this.camera = new THREE.PerspectiveCamera(75, 1.77778, 0.1, 1000);
                // if (sceneGraph.Camera) {
                //     this.camera = this.scene.Camera;
                // } else {
                //     this.camera = new THREE.PerspectiveCamera(75, 1.77778, 0.1, 1000);
                // }
                this.scene.add(this.camera);
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

        this.start = function() {
            requestAnimationFrame(waitForResources.bind(this));
        }.bind(this);
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
        this.currentUser.position.set(0, 0, 0);
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

    VRApplication.prototype.currentIndex = null;
    VRApplication.prototype.selectNextObj = function() {
        function selectables() {
            var objs = [];
            this.scene.traverse(function(obj) {
                if (obj instanceof THREE.Mesh) {
                    objs.push(obj);
                    if (obj.boxHelper === undefined) {
                        obj.boxHelper = new THREE.BoxHelper(obj, this.currentMaterial);
                        this.scene.add(obj.boxHelper);
                    }
                    obj.boxHelper.visible = false;
                }
            }.bind(this));
            return objs;
        }
        var objs = selectables.call(this);
        if (this.currentIndex == null) {
            this.currentIndex = 0;
        } else {
            this.currentIndex = (this.currentIndex + 1) % objs.length;
        }
        this.currentObject = objs[this.currentIndex];        
        this.log("currentObject: " + this.currentObject.name + " (" + (this.currentIndex + 1) + " of " + objs.length + ")");
        if (this.currentObject.boxHelper) {
            this.currentObject.boxHelper.visible = true;
        }
    };

    /* 
    for cannon.js:
    */
    VRApplication.prototype.shape2mesh = CANNON.Demo.shape2mesh;


    // VRApplication.prototype.addVisual = CANNON.Demo.prototype.addVisual;

    VRApplication.prototype.newObject = function() {
        if (this.scene) {
            var sprite = new THREE.Sprite(this.manaSprite);
            var mesh = sprite;
            mesh.position.z -= 3;
            mesh.position.applyQuaternion(this.currentUser.quaternion);
            mesh.position.add(this.currentUser.position);
            mesh.position.y += 1.5;
            this.scene.add(mesh);
            var radius = 0.5;
            var mass = 1;
            var skipObj = false;
            var body = this.makeBall(mesh, mass, radius, skipObj, {
                fixedRotation: false
            });
            body.velocity.copy(this.currentUser.velocity);
            var velocityScale = 2;
            body.velocity.x *= velocityScale;
            body.velocity.y *= velocityScale;
            body.velocity.z *= velocityScale;
        }
    };


    VRApplication.prototype.brushDown = function() {
        if (this.scene) {
            var sprite = new THREE.Sprite(this.brushSprite);
            sprite.position.z -= 4;
            sprite.position.applyQuaternion(this.currentUser.quaternion);
            sprite.position.add(this.currentUser.position);
            this.scene.add(sprite);
            // var radius = 0.5;
            // var mass = 0;
            // var skipObj = false;
            // var body = this.makeBall(sprite, mass, radius, skipObj);
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
                $.ajax({
                        url: '/python_eval?pystr=' + this.currentEditor.getLines().join('%0A')
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
                        this.log("problem: " + textStatus);
                    }.bind(this));
            }
        }
    };

    VRApplication.prototype.togglePhysics = function() {
        this.physicsEnabled = !this.physicsEnabled;
        if (this.physicsEnabled) {
            this.log("physics enabled");
        } else {
            this.log("physics disabled");
        }
    }

    VRApplication.prototype.blurEditor = function() {
        if (this.currentEditor) {
            this.currentEditor.blur();
        }
    };

    VRApplication.prototype.mystery = function() {
        console.log("mystery");

        this.log('backgroundColor: ' + this.options.backgroundColor);
        this.log('waterColor: ' + this.options.waterColor);
        this.log('Primrose version: ' + Primrose.VERSION);

        // this.hudAlert.call(this, JSON.stringify(this.options));
        // var keys = ['backgroundColor', 'waterColor'];
        // var lines = JSON.stringify(this.options.backgroundColor, this.options.waterColor).split('\n');
        // for (var i = 0; i < lines.length; ++i) {
        //     this.log(lines[i]);
        // }
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


    VRApplication.prototype.hudAlert = function(msg) {
        var options = {
            size: 0.143,
            height: 0,
            font: 'droid sans',
            weight: 'normal', //'normal',
            curveSegments: 2
        };
        var lines = msg.toString().split('\n');
        var group = new THREE.Group();
        for (var i = 0; i < lines.length; ++i) {
            var geometry = new THREE.TextGeometry(lines[i], options);
            var material = new THREE.MeshBasicMaterial({
                color: 0x22ff11,
                side: THREE.DoubleSide
            });
            var mesh = new THREE.Mesh(geometry, material);
            mesh.position.z = -4;
            mesh.position.x = 0.666;
            mesh.position.y = 1.25 * this.avatarHeight + (this.logDisplayed.length - i - 1) * 1.7 * options.size
            group.add(mesh);
        }
        if (this.hudAlert) {
            this.hudGroup.remove(this.hudAlert);
        }
        this.hudGroup.add(group);
        this.hudAlert = group;
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
            if (this.hudGroup.visible) {
                $("#main").hide();
                this.hudGroup.visible = false;
            } else {
                $("#main").show();
                this.hudGroup.visible = true;
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
            var that = this;
            $.ajax({
                url: "/read?filename=newEditor.js"
            }).
            done(function(data) {
                that.log("loaded " + data.args.filename);
                this.value = '' + data.value;
            }.bind(editor)).
            fail(function(jqXHR, textStatus) {
                that.log("problem loading file: " + textStatus);
            });

            var scale = 2;
            mesh.scale.x *= scale;
            mesh.scale.y *= scale;
            mesh.scale.z *= scale;
            mesh.position.copy(this.currentUser.position);
            mesh.position.z -= 3;
            mesh.position.y += 2;
            mesh.quaternion.copy(this.currentUser.quaternion);
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
        var dt = (t - this.lt) * 0.001;
        this.lt = t;
        var len,
            j,
            c;

        this.keyboard.update(dt);
        //this.mouse.update(dt);
        this.gamepad.update(dt);

        this.stats.begin();

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

        var floatup = -this.floatSpeed * this.gamepad.getValue("floatup");
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
            floatup += this.keyboard.getValue("floatUp") + this.keyboard.getValue("floatDown");
        }
        if (strafe || drive) {
            len = this.walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive +
                strafe * strafe));
        } else {
            len = 0;
        }
        strafe *= len;
        drive *= len;
        len = strafe * cosHeading + drive * sinHeading;
        drive = drive * cosHeading - strafe * sinHeading;
        strafe = len;
        this.currentUser.velocity.x = this.currentUser.velocity.x * 0.9 +
            strafe * 0.1;
        this.currentUser.velocity.z = this.currentUser.velocity.z * 0.9 +
            drive * 0.1;

        // if (this.dragging) {
        //     this.pick("move");
        // }

        if (this.particleGroup) {
            this.particleGroup.tick(dt);
        }
        // var time = Date.now() * 0.005;

        // this.sphere.rotation.y = 0.02 * time;
        // this.sphere.rotation.z = 0.02 * time;

        // for (var i = 0; i < this.attributes.size.value.length; i++) {
        //     if (i < vc1)
        //         this.attributes.size.value[i] = 16 + 12 * Math.sin(0.1 * i + time);
        // }
        // this.attributes.size.needsUpdate = true;

        //
        // update the camera
        //
        this.camera.quaternion.copy(this.currentUser.graphics.quaternion);
        this.camera.position.copy(this.currentUser.graphics.position);
        this.camera.position.y += this.avatarHeight;

        if (this.inVR) {
            var state = this.vrSensor.getState();
            if (state.orientation) {
                this.qRift.copy(state.orientation);
                //this.camera.quaternion.multiply(state.orientation);
                this.camera.quaternion.multiply(this.qRift);
            }
            if (state.position) {
                this.pRift.copy(state.position);
                this.pRift.applyQuaternion(this.currentUser.quaternion);
                this.camera.position.add(this.pRift);
            }
        }

        if (this.ms_Water) {
            this.ms_Water.render();
            this.ms_Water.material.uniforms.time.value += 0.5 * dt;
        }

        // if (this.skyBox) {
        //     this.skyBox.position.copy(this.camera.position);
        // }

        if (this.hudGroup) {
            this.hudGroup.position.copy(this.camera.position);
            this.hudGroup.quaternion.copy(this.camera.quaternion);
        }

        //
        // do collision detection
        //
        if (this.physicsEnabled) {
            this.world.step(1 * dt);

            for (j = 0; j < this.world.objects.length; ++j) {
                var obj = this.world.objects[j];
                obj.position.copy(obj.physics.position);
                obj.quaternion.copy(obj.physics.quaternion);
            }

            this.onground = false;
            // for (j = 0; j < this.world.contacts.length; ++j) {
            //     c = this.world.contacts[j];
            //     if (c.bi === this.currentUser) {
            //         this.onground = true;
            //         break;
            //     }
            // }
        }

        requestAnimationFrame(this.animate);

        this.renderScene(this.scene);
        this.stats.end();

        this.fire("update", dt);
    };

    return VRApplication;
})();

var DEBUG_MODE = $.QueryString['debug'];
var EMPTY_MODE = $.QueryString['empty'];
var WATER_MODE = $.QueryString['water'];
var TERRAIN_MODE = $.QueryString['terrain'];
var FOG_MODE = $.QueryString['fog'];
var LOG_MODE = $.QueryString['log'] || 1;
var VR_MODE = $.QueryString['vr'];

var backgroundColor = $.QueryString['backgroundColor'] || SPE.utils.randomColor(new THREE.Color("#ffeebb"),
    new THREE.Vector3(1.1, 1.2, 1.3)).getHex(); // 0x2122ee; // 0x000110;
// 16768917; // pale mars/creamy sandish
var fogColor = $.QueryString['fogColor'] || backgroundColor;
var gravity = $.QueryString['gravity'] || 0;
var options = {
    backgroundColor: fogColor,
    gravity: gravity,
    drawDistance: 2000,
    dtNetworkUpdate: 10
};
if (FOG_MODE == 1) {
    options.fog = new THREE.FogExp2(fogColor, 0.015, 20, 800);
} else if (FOG_MODE == 2) {
    options.fog = new THREE.Fog(fogColor, 10, 1000);
}

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

//options.skyBox = makeSkyBox();

options.editors = [];
// [{
//     id: 'editor0',
//     w: 2,
//     h: 2,
//     x: 0,
//     y: 8,
//     z: -3,
//     rx: 0,
//     ry: 0,
//     rz: 0,
//     options: {
//         filename: "editor0.js",
//         tokenizer: Primrose.Text.Grammars.JavaScript
//     },
//     scale: 2
// }, {
//     id: 'editor1',
//     w: 2,
//     h: 2,
//     x: -8,
//     y: 4,
//     z: -2,
//     rx: 0,
//     ry: Math.PI / 4,
//     rz: 0,
//     options: {
//         filename: "editor1.py",
//         tokenizer: Primrose.Text.Grammars.Python
//     },
//     scale: 2
// }];

var walkSpeed = 3;
var floatSpeed = walkSpeed * 0.666;
var sceneModel = $.QueryString['sceneModel'] || "flask_examples/models/ConfigUtilDeskScene.json";
var deskScale = 0.012;

var nw = 16,
    nh = 20;
var planeWidth = 1,
    planeHeight = 1.23;

var avatarMesh;
avatarMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(planeWidth, planeHeight, nw - 1, nh - 1), new THREE.MeshLambertMaterial({
    color: 0x998700,
    side: THREE.DoubleSide
}));
avatarMesh.geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
var avatarScale = 3;
avatarMesh.geometry.applyMatrix(new THREE.Matrix4().makeScale(avatarScale, avatarScale, avatarScale));
avatarMesh.geometry.verticesNeedUpdate = true;
avatarMesh.position.z += 2;
avatarMesh.position.y -= 2;
avatarMesh.geometry.computeBoundingSphere();
var avatarRadius = avatarMesh.geometry.boundingSphere.radius;
var avatarHeight = 3;

var avatarModel = $.QueryString['avatarModel'] || "wings_data/subvr_frame.dae";

// var avatarVertices = avatarMesh.geometry.getAttribute('position');
// for (var j = 0; j < nw; ++j) {
//     var x = planeWidth * j / (nw - 1);
//     for (var i = 0; i < nh; ++i) {
//         var y = planeHeight * i / (nh - 1);
//         avatarVertices.setY(j*nh + i, 0.2 * Math.sin(1.25*y));
//     }
// }

/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */
var application;

function StartDemo() {
    "use strict";
    if (avatarModel) {
        var colladaLoader = new THREE.ColladaLoader();
        colladaLoader.load(avatarModel, function(loadedObj) {
            console.log("loaded avatarModel " + avatarModel);
            loadedObj.scene.traverse(function(obj) {
                console.log(obj);
                if (obj instanceof THREE.Mesh) {
                    avatarMesh = obj;
                    avatarMesh.name = "avatarMesh";
                    avatarMesh.geometry.computeBoundingSphere();
                    avatarRadius = avatarMesh.geometry.boundingSphere.radius;
                    avatarHeight = 0;
                }
            });
            application = new Primrose.VRApp("Demo", sceneModel, avatarMesh, avatarHeight, avatarRadius, walkSpeed, floatSpeed, options);
            var t = 0;
            application.addEventListener("update", function(dt) {
                t += dt;
            });
            application.start();
        });
    }
    if (DEBUG_MODE) {
        $("#main").hide();
    }
}
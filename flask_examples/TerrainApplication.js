var deskScale = 0.011;
var water = true;
var avatarScale = 3;
var scene;

var TerrainApplication = (function() {
    var camera;
    var hudGroup;

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

    function TerrainApplication(name, sceneModel, buttonModel, buttonOptions,
        avatarHeight, walkSpeed, options) {

        this.rugMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1.23, 12, 16), new THREE.MeshLambertMaterial({
            color: 0x998700,
            side: THREE.DoubleSide
        }));
        this.rugMesh.name = "rugMesh";
        this.rugMesh.geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
        this.rugMesh.scale.x = avatarScale;
        this.rugMesh.scale.y = avatarScale;
        this.rugMesh.scale.z = avatarScale;
        this.rugMesh.position.y += 3;
        // this.rugMesh.position.z -= 3;
        this.avatarMesh = this.rugMesh;

        console.log("calling VRApplication constructor...");
        Primrose.VRApplication.call(this, name, sceneModel, buttonModel, buttonOptions,
            avatarHeight, walkSpeed, options);

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

        this.currentMaterial = new THREE.MeshLambertMaterial({
            color: 0xfedcba,
            side: THREE.DoubleSide
        });

        this.fog = options.fog;

        this.editors = [];
        this.hudEditors = [];
        this.currentEditor;
        this.textGeomLog;

        var audio3d = new Primrose.Output.Audio3D();

        function log(msg) {
            console.log(msg);
            if (this.textGeomLog) {
                this.textGeomLog.log(msg);
            }
        }
        this.log = log.bind(this);
        var log = log.bind(this);
        
        this.manaTexture = THREE.ImageUtils.loadTexture( "flask_examples/images/mana3.png" );

        // console.log("doing particle stuff...");
        // this.particleGroup = new SPE.Group({
        //         texture: THREE.ImageUtils.loadTexture('flask_examples/images/smokeparticle.png'),
        //         maxAge: 200
        //     });
        // this.emitter = new SPE.Emitter({
        //         position: new THREE.Vector3(0, 2, 0),
        //         positionSpread: new THREE.Vector3( 0, 0, 0 ),

        //         acceleration: new THREE.Vector3(0, -10, 0),
        //         accelerationSpread: new THREE.Vector3( 10, 0, 10 ),

        //         velocity: new THREE.Vector3(0, 15, 0),
        //         velocitySpread: new THREE.Vector3(10, 7.5, 10),

        //         colorStart: new THREE.Color('white'),
        //         colorEnd: new THREE.Color('red'),

        //         sizeStart: 1,
        //         sizeEnd: 1,

        //         particleCount: 2000
        //     });
        // this.particleGroup.addEmitter( this.emitter );

        function waitForResources(t) {
            this.lt = t;
            if (this.camera && this.scene && this.currentUser && this.buttonFactory.template) {
                console.log("TerrainApplication::waitForResources: resources ready...");

                this.setSize();

                this.textGeomLog = new TextGeomLog(this.scene, 10, this.camera);

                scene = this.scene;
                camera = this.camera;
                hudGroup = this.hudGroup;
                world = this.world;

                var dodeca = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(),
                    new THREE.MeshPhongMaterial({shading: THREE.FlatShading, color: 0x1122ee, shininess: 50, specular: 0xffeeee}));
                dodeca.position.y += 4;
                dodeca.position.z -= 2.5;
                this.scene.add(dodeca);

                var sunColor = 0xffde99;
                var directionalLight = new THREE.DirectionalLight(sunColor, 1.2);
                directionalLight.position.set(1, 4, 3);
                this.scene.add(directionalLight);
                // var ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
                // scene.add( ambientLight );
                // var pointLight = new THREE.PointLight( 0x402010 , 2);
                // scene.add( pointLight );

                if (water) {
                    // Load textures        
                    var waterNormals = new THREE.ImageUtils.loadTexture('flask_examples/images/waternormals.jpg');
                    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping; 
                    
                    // Create the water effect
                    this.ms_Water = new THREE.Water(this.renderer, this.camera, this.scene, {
                        textureWidth: 512,
                        textureHeight: 512,
                        waterNormals: waterNormals,
                        alpha:  1, //0.75,
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
                    aMeshMirror.rotation.x = - Math.PI / 2;
                    aMeshMirror.position.y -= 3;
                    this.scene.add(aMeshMirror);
                }

                this.scene.traverse(function (obj) {
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
                        var material = new THREE.MeshLambertMaterial({color: 0x0000ee, shading: THREE.FlatShading});
                        this.scene.add(new THREE.Mesh(obj.geometry, material));
                    }
                });

                if (this.rugMesh) {
                    console.log("adding rugMesh...");
                    this.scene.add(this.rugMesh);
                }
                if (this.skyBox) {
                    this.scene.add(this.skyBox);
                }
                if (this.floor) {
                    console.log("adding floor...");
                    this.scene.add(this.floor);
                }
                if (this.fog) {
                    console.log("adding fog...");
                    this.scene.fog = this.fog;
                }
                if (this.passthrough) {
                    this.camera.add(this.passthrough.mesh);
                }
                if (this.hudGroup) {
                    console.log("adding hudGroup...");
                    this.scene.add(this.hudGroup);
                }

                var axisHelper = new THREE.AxisHelper( 10 );
                scene.add( axisHelper );

                var dir = new THREE.Vector3(0, 0, -1);
                var origin = new THREE.Vector3(0, 0, -1);
                var length = 1;
                var hex = 0xffff00;
                this.arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
                this.scene.add(this.arrowHelper);

                this.options.editors = this.options.editors || [];
                this.options.editors.push({
                    id: 'hudEditor',
                    w: 2, h: 2,
                    rx: 0, ry: -Math.PI / 4, rz: 0,
                    options: {
                        file: instructions.join('\n'),
                        onlyHUD: true,
                        readOnly: true,
                        showLineNumbers: false,
                        opacity: 0.8
                    },
                    scale: 2,
                    hudx: 4, hudy: 0, hudz: -3
                });
                //this.options.editors = null;
                if (this.options.editors) {
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
                            $.ajax({
                                url: "/read?filename=" + editorConfig.options.filename
                            }).
                            done(function(data) {
                                log("loaded " + data.args.filename);
                                this.value = '' + data.value;
                            }.bind(editor)).
                            fail(function(msg) {
                                log("problem: " + msg);
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
                }

                // load the terrain:
                $.ajax({
                    url: "/read?filename=terrain.js"
                }).
                done(function(data) {
                    log("loaded " + data.args.filename);
                    eval(data.value);
                }).
                fail(function() {
                    log("problem loading terrain!");
                });

                // console.log("adding particles to scene...");
                // scene.add( this.particleGroup.mesh );
                // this.particleGroup.mesh.name = "particleMesh";
                // this.particleGroup.mesh.position.y = 3;
                // //scene.add( this.particleGroup.mesh );
                // console.log(this.particleGroup.mesh);

                this.printInstructions();

                this.animate = this.animate.bind(this);
                this.fire("ready");

                requestAnimationFrame(this.animate);
            } else {
                requestAnimationFrame(waitForResources.bind(this));
            }
        }

        this.printInstructions = function () {
            for (var i = 0; i < instructions.length; ++i) {
                log(instructions[i]);
            }
        }.bind(this);

        function playSound(buffer, time) {
            var source = audio3d.context.createBufferSource();
            source.buffer = buffer;
            source.connect(audio3d.context.destination);
            source[source.start ? 'start' : 'noteOn'](time);
        }
        if (options.backgroundSound) {
            audio3d.loadBuffer(
                options.backgroundSound,
                null,
                function(buffer) {
                    playSound(buffer, 0);
                }
            );
        }


        this.addPhysicsBody = function(obj, body, shape, radius, skipObj) {
            body.addShape(shape);
            body.linearDamping = body.angularDamping = 0.15;
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
        };

        this.makeBall = function(obj, radius, skipObj) {
            var body = new CANNON.Body({
                mass: 1,
                material: this.bodyMaterial
            });
            var shape = new CANNON.Sphere(radius ||
                obj.geometry.boundingSphere.radius);
            body = this.addPhysicsBody(obj, body, shape, radius, skipObj);
            body.velocity.copy(this.currentUser.velocity);
        };

        this.start = function() {
            requestAnimationFrame(waitForResources.bind(this));
        };


        instructions.push("Keyboard controls");
        instructions.push("-----------------");

        instructions.push("Q: toggle HUD");
        this.keyboard.addCommand({
            name: "toggleHUD",
            buttons: [Primrose.Input.Keyboard.Q],
            commandDown: this.toggleHUD.bind(this),
            dt: 0.25
        });


        instructions.push("");
        instructions.push("XBOX gamepad controls");
        instructions.push("---------------------");

        instructions.push('A: select next object');
        this.gamepad.addCommand({
            name: "selectNextObj",
            buttons: [butmap.A], //{toggle: false} ], //{index: 0, toggle: false}
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
    }







    inherit(TerrainApplication, Primrose.VRApplication);

    TerrainApplication.prototype.shape2mesh = CANNON.Demo.prototype.shape2mesh;

    TerrainApplication.prototype.addVisual = CANNON.Demo.prototype.addVisual;

    TerrainApplication.prototype.newObject = function() {
        if (this.scene) {
            //this.log("adding object");

            // var mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5),
            //     new THREE.MeshLambertMaterial({
            //         color: 0xee3321
            //     }));

            var material = new THREE.SpriteMaterial( { map: this.manaTexture, color: 0xffffff, fog: true } );
            var sprite = new THREE.Sprite( material );
            var mesh = sprite;

            mesh.position.copy(this.currentUser.position);
            mesh.position.y += 4;
            mesh.position.z -= 4;
            this.scene.add(mesh);
            var body = this.makeBall(mesh, 0.5);
        }
    };

    TerrainApplication.prototype.selectNextObj = function() {
        function selectables() {
            var objs = [];
            for (var i = 0; i < scene.children.length; ++i) {
                var obj = scene.children[i];
                if (obj instanceof THREE.Mesh) {
                    objs.push(obj);
                }
            }
            return objs;
        }
        var objs = selectables();
        this.currentObject = this.currentObject || objs[0];
        for (var i = 0; i < objs.length; ++i) {
            var obj = objs[i];
            if (this.currentObject === obj) {
                if (i == objs.length - 1) {
                    this.currentObject = objs[0];
                } else {
                    this.currentObject = objs[i + 1];
                }
                break;
            }
        }
        log("currentObject: " + this.currentObject.name);
    }

    TerrainApplication.prototype.selectNearestObj = function() {
        log("TODO: selectNearestObj");
    }

    TerrainApplication.prototype.evalEditor = function() {
        if (this.currentEditor) {
            this.currentEditor.blur();
            console.log("editor contents to eval:");
            console.log(this.currentEditor.getLines().join(''));
            if (this.currentEditor.getTokenizer() === Primrose.Text.Grammars.JavaScript) {
                try {
                    log("trying javascript eval...");
                    // TODO: more robust comment stripping
                    eval(this.currentEditor.getLines().map(function(item) {
                        return item.split('//')[0]
                    }).join(''));
                    log("javascript success!");
                } catch (exp) {
                    log("caught javascript exception:");
                    log(exp.message);
                }
            } else if (this.currentEditor.getTokenizer() === Primrose.Text.Grammars.Python) {
                log("trying python exec...");
                $.ajax({
                    url: '/python_eval?pystr=' + this.currentEditor.getLines().join('%0A')
                })
                .done(function(data) {
                    log("python success!");
                    var lines = data.out.split('\n');
                    for (var i = 0; i < lines.length; ++i) {
                        log(lines[i]);
                    }
                    log("python returned:");
                    log(data.value);
                })
                .fail(function(jqXHR, textStatus) {
                    log("there was a problem evaluating Python code");
                });
            }
        }
    };

    TerrainApplication.prototype.blurEditor = function() {
        if (this.currentEditor) {
            this.currentEditor.blur();
        }
    };

    TerrainApplication.prototype.focusNearestEditor = function() {
        if (this.currentEditor) {
            if (this.currentEditor.focused) {
                this.currentEditor.blur();
            } else {
                this.currentEditor.focus();
                this.currentUser.velocity.set(0, 0, 0);
            }
        }
    };

    TerrainApplication.prototype.focusNextEditor = function() {
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

    TerrainApplication.prototype.focusPrevEditor = function() {
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

    TerrainApplication.prototype.toggleHUD = function() {
        if (this.hudGroup) {
            this.hudGroup.visible = !this.hudGroup.visible;
            if (this.hudGroup.visible) {
                $("#main").hide();
            }
        }
    };

    TerrainApplication.prototype.newEditor = function() {
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

    TerrainApplication.prototype.animate = function (t) {
        var dt = (t - this.lt);
        if (water && this.ms_Water) {
            this.ms_Water.render();
            this.ms_Water.material.uniforms.time.value += dt * 0.0003;
        }
        if (this.particleGroup) {
            this.particleGroup.tick( dt*0.0003 );
        }

        Primrose.VRApplication.prototype.animate.call(this, t);

        // this.arrowHelper.position.copy(this.currentUser.position);
        // this.arrowHelper.position.z += 1;
        // var refdir = new CANNON.Vec3(0, 0, -1);
        // var dir = new CANNON.Vec3();
        // this.currentUser.vectorToWorldFrame(refdir, dir);
        // this.arrowHelper.setDirection(dir);

    };

    return TerrainApplication;
})();
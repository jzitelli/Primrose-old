/* global Primrose, CANNON, THREE, io, CryptoJS, fmt, Notification, requestFullScreen */
var RIGHT = new THREE.Vector3(1, 0, 0),
    UP = new THREE.Vector3(0, 1, 0),
    FORWARD = new THREE.Vector3(0, 0, 1);

function WebVRApplication(name, options) {
    this.options = combineDefaults(options, WebVRApplication.DEFAULTS);
    console.log(this.options);
    Primrose.Application.call(this, name, this.options);

    this.listeners = {
        ready: [],
        update: []
    };
    this.qRoll = new THREE.Quaternion();
    this.qPitch = new THREE.Quaternion();
    this.qRift = new THREE.Quaternion();
    this.pRift = new THREE.Vector3();
    this.lt = 0;
    this.frame = 0;
    this.enableMousePitch = true;
    this.currentUser = null;
    this.vrParams = null;
    this.vrDisplay = null;
    this.vrSensor = null;
    this.inVR = false;
    this.world = new CANNON.World();
    this.world.defaultContactMaterial.friction = 0.2;
    this.world.gravity.set(0, -this.options.gravity, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.audio = new Primrose.Output.Audio3D();

    this.audio.loadSound("examples/audio/click.ogg", true, null, function (snd) {
        console.log(snd);
        snd.source.start(0);
    });

    this.walkSpeed = options.walkSpeed || 1;
    this.floatSpeed = options.floatSpeed || this.walkSpeed;

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
        buttons: [-Primrose.Input.Keyboard.C]
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

    this.gamepad = new Primrose.Input.Gamepad("gamepad", [{
        name: "strafe",
        axes: [Primrose.Input.Gamepad.LSX],
        deadzone: 0.15
    }, {
        name: "drive",
        axes: [Primrose.Input.Gamepad.LSY],
        deadzone: 0.15
    }, {
        name: "heading",
        axes: [-Primrose.Input.Gamepad.RSX],
        integrate: true,
        deadzone: 0.15
    }, {
        name: "dheading",
        commands: ["heading"],
        delta: true
    }, {
        name: "pitch",
        axes: [Primrose.Input.Gamepad.RSY],
        integrate: true
    }, {
        name: "float",
        axes: [-Primrose.Input.Gamepad.RSY],
        deadzone: 0.1
    }, {
        name: "zeroSensor",
        buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
        commandDown: this.zero.bind(this),
        dt: 0.25
    }]);
    this.gamepad.addEventListener("gamepadconnected",
        this.connectGamepad.bind(this), false);

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

            if (this.vrDisplay) {
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
    this.renderer.setClearColor(this.options.backgroundColor);
	this.renderer.shadowMapEnabled = true;
	this.renderer.shadowMapSoft = true;
	//this.renderer.shadowMapWidth = 2048; //1024;
	//this.renderer.shadowMapHeight = 2048; //1024;
    
    this.vrEffect = new THREE.VREffect(this.renderer);

    this.setPhysicsParams();

    /*
        console.log("creating empty scene...");
        this.scene = new THREE.Scene();
        // this.scene.overrideMaterial = new THREE.MeshLambertMaterial({color: 0xffee00});
        this.camera = new THREE.PerspectiveCamera(75, 1.77778, 0.1, 1000);
        this.scene.add(this.camera);
    */
    Primrose.ModelLoader.loadScene(sceneModel, function(sceneGraph) {
        console.log("loaded " + sceneModel);
        console.log(sceneGraph);
        this.scene = sceneGraph;

  //       var light = new THREE.DirectionalLight(0xffffff);
  //       light.position.set(-10, 20, 30);
		// light.target.position.set(0, 0, 0);

		// light.castShadow = true;
		// light.shadowDarkness = 0.8;
		// // light.shadowCameraVisible = true; // only for debugging
		// // these six values define the boundaries of the yellow box seen above
		// light.shadowCameraNear = 15;
		// light.shadowCameraFar = 200;
		// light.shadowCameraLeft = -20;
		// light.shadowCameraRight = 20;
		// light.shadowCameraTop = 20;
		// light.shadowCameraBottom = -20;

//        this.scene.add(light);

        if (options.avatarMesh) {
        	this.scene.add(options.avatarMesh);
        }

        console.log("adding camera...");
        this.camera = new THREE.PerspectiveCamera(75, 1.77778, 0.1, 1000);
        this.scene.add(this.camera);
    }.bind(this));


    function waitForResources(t) {
        this.lt = t;
        if (this.camera && this.scene && this.currentUser) {
            this.setSize();
            this.animate = this.animate.bind(this);
            this.fire("ready");
            requestAnimationFrame(this.animate);
        } else {
            requestAnimationFrame(waitForResources.bind(this));
        }
    }

    this.start = function() {
        requestAnimationFrame(waitForResources.bind(this));
    };

    window.addEventListener("resize", this.setSize.bind(this), false);

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

    this.currentUser = this.makeBall.call(
        this,
        options.avatarMesh,
        1,
        options.avatarRadius);
    console.log("added user");
    this.currentUser.position.set(0, 0, 0);

    this.ctrls.goRegular.addEventListener("click", function() {
        requestFullScreen(this.ctrls.frontBuffer);
        this.setSize();
    }.bind(this));

    this.ctrls.goVR.addEventListener("click", function() {
        requestFullScreen(this.ctrls.frontBuffer, this.vrDisplay);
        //this.ctrls.frontBuffer.webkitRequestPointerLock();
        //this.ctrls.outputContainer.webkitRequestPointerLock();
        this.inVR = true;
        this.setSize();
    }.bind(this));
}

inherit(WebVRApplication, Primrose.Application);

WebVRApplication.DEFAULTS = {
    gravity: 0, // the acceleration applied to falling objects
    backgroundColor: 0x000000, // the color that WebGL clears the background with before drawing
    drawDistance: 500, // the far plane of the camera
    chatTextSize: 0.25, // the size of a single line of text, in world units
    dtNetworkUpdate: 1000.0 // the amount of time to allow to elapse between sending state to teh server
};

WebVRApplication.prototype.addEventListener = function(event, thunk) {
    if (this.listeners[event]) {
        this.listeners[event].push(thunk);
    }
};

WebVRApplication.prototype.fire = function(name, arg1, arg2, arg3, arg4) {
    for (var i = 0; i < this.listeners[name].length; ++i) {
        this.listeners[name][i](arg1, arg2, arg3, arg4);
    }
};

WebVRApplication.prototype.setSize = function() {
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
    if (this.vrEffect) {
        this.vrEffect.setSize(canvasWidth, canvasHeight);
    }
};

WebVRApplication.prototype.connectGamepad = function(id) {
    if (!this.gamepad.isGamepadSet()) {
        this.gamepad.setGamepad(id);
    }
};

WebVRApplication.prototype.resetPosition = function() {
    this.currentUser.position.set(0, 2, 0);
    this.currentUser.velocity.set(0, 0, 0);
};

WebVRApplication.prototype.zero = function() {
    if (this.vrSensor) {
        this.vrSensor.resetSensor();
    }
};

WebVRApplication.prototype.jump = function() {
    if (this.onground) {
        this.currentUser.velocity.y += 10;
        this.onground = false;
    }
};

var heading = 0,
    strafe,
    drive,
    floatUp;

WebVRApplication.prototype.animate = function(t) {
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

    strafe = this.keyboard.getValue("strafeRight") +
        this.keyboard.getValue("strafeLeft") +
        this.gamepad.getValue("strafe");
    drive = this.keyboard.getValue("driveBack") +
        this.keyboard.getValue("driveForward") +
        this.gamepad.getValue("drive");
    floatUp = this.keyboard.getValue("floatUp") +
        this.keyboard.getValue("floatDown") +
        this.gamepad.getValue("float");
    floatUp *= this.floatSpeed;
    if (strafe || drive) {
        len = this.walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive +
            strafe * strafe));
    } else {
        len = 0;
    }

    this.currentUser.velocity.y = this.currentUser.velocity.y * 0.9 + floatUp * 0.1;

    strafe *= len;
    drive *= len;
    len = strafe * cosHeading + drive * sinHeading;
    drive = drive * cosHeading - strafe * sinHeading;
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

    this.fire("update", dt);

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
            this.pRift.copy(state.position); //.multiplyScalar(5);
            this.pRift.applyQuaternion(this.currentUser.quaternion);
        }

        this.camera.position.add(this.pRift);
    }

    this.renderScene(this.scene);
};
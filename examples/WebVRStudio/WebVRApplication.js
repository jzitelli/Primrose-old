/* global Primrose, THREE, WebVRManager, combineDefaults */

WebVRApplication = ( function () {
    function WebVRApplication(name, avatar, scene, options) {
        this.name = name;
        this.avatar = avatar;
        this.scene = scene;

        options = combineDefaults(options, {
            gravity: 0,
            backgroundColor: 0x000000
        });

        this.listeners = {
            ready: [],
            update: []
        };
        this.lt = 0;
        this.frame = 0;

        this.camera = new THREE.PerspectiveCamera(75, 1.77778, 0.25, 1000); // new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.25, 10000);

        if (options.fog) {
            this.scene.fog = options.fog;
        }

        // TODO: improve
        this.log = function(msg) {
            console.log(msg);
        };

        this.audio = new Primrose.Output.Audio3D();

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        if (options.shadowMap) {
            this.renderer.shadowMap.enabled = true;
        }

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(options.backgroundColor);
        document.body.appendChild(this.renderer.domElement);

        this.vrEffect = new THREE.VREffect(this.renderer);
        this.vrEffect.setSize(window.innerWidth, window.innerHeight);

        this.vrManager = new WebVRManager(this.renderer, this.vrEffect, {
            hideButton: false
        });

        this.vrControls = new THREE.VRControls(this.camera);
        this.vrControls.enabled = false;

        this.keyboard = new Primrose.Input.Keyboard("keyboard", window, options.keyboardCommands);
        this.mouse = new Primrose.Input.Mouse("mouse", window, options.mouseCommands);
        this.gamepad = new Primrose.Input.Gamepad("gamepad", options.gamepadCommands);
        // TODO: window?
        this.gamepad.addEventListener("gamepadconnected", function(id) {
            if (!this.gamepad.isGamepadSet()) {
                this.gamepad.setGamepad(id);
                console.log("gamepad " + id + " connected");
            }
        }.bind(this), false);

        window.addEventListener("resize", function () {
            var canvasWidth = window.innerWidth,
                canvasHeight = window.innerHeight;
            this.camera.aspect = canvasWidth / canvasHeight;
            this.camera.updateProjectionMatrix();
            this.vrEffect.setSize(canvasWidth, canvasHeight);
            if (this.vrManager.isVRMode()) {
                this.vrControls.enabled = true;
            }
        }.bind(this), false);

    }

    WebVRApplication.prototype.start = function(animate) {
        animate = animate || this.animate;
        function waitForResources(t) {
            this.lt = t;
            if (this.scene) {
                this.fire("ready");
                requestAnimationFrame(animate);
            } else {
                requestAnimationFrame(waitForResources);
            }
        }
        waitForResources.call(this, 0);
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

    WebVRApplication.prototype.animate = function(t) {
        var dt = (t - this.lt) * 0.001;
        this.lt = t;
        if (this.vrControls && this.vrControls.enabled) {
            this.vrControls.update();
        }
        this.vrManager.render(this.scene, this.camera, t);
        this.keyboard.update(dt);
        this.gamepad.update(dt);
        this.mouse.update(dt);
        this.fire("update", dt);
        requestAnimationFrame(this.animate);
    };

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
        }
        this.log("vrControls.enabled = " + this.vrControls.enabled);
    };

    WebVRApplication.prototype.resetVRSensor = function () {
        this.vrControls.resetSensor();
    };

    return WebVRApplication;
} )();
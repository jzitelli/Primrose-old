/* global Primrose, THREE, WebVRManager, combineDefaults */

WebVRApplication = ( function () {
    function WebVRApplication(name, avatar, scene, options) {
        this.name = name;
        this.avatar = avatar;
        this.scene = scene;

        options = combineDefaults(options, {
            gravity: 0,
            backgroundColor: 0x000000,
            keyboardCommands: [{name: "turnLeft", buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
                {name: "turnRight", buttons: [Primrose.Input.Keyboard.RIGHTARROW]},
                {name: "driveForward", buttons: [-Primrose.Input.Keyboard.W]},
                {name: "driveBack", buttons: [Primrose.Input.Keyboard.S]},
                {name: "strafeLeft", buttons: [-Primrose.Input.Keyboard.A]},
                {name: "strafeRight", buttons: [Primrose.Input.Keyboard.D]},
                {name: "floatUp", buttons: [Primrose.Input.Keyboard.E]},
                {name: "floatDown", buttons: [-Primrose.Input.Keyboard.C]},
                {name: "toggleVRControls", buttons: [Primrose.Input.Keyboard.V], commandDown: this.toggleVRControls.bind(this), dt: 0.25},
                {name: "toggleWireframe", buttons: [Primrose.Input.Keyboard.U], commandDown: this.toggleWireframe.bind(this), dt: 0.25},
                {name: 'resetVRSensor', buttons: [Primrose.Input.Keyboard.Z], commandDown: this.resetVRSensor.bind(this), dt: 0.25}],
            gamepadCommands: [{name: "strafe", axes: [Primrose.Input.Gamepad.LSX], deadzone: 0.15},
                {name: "drive", axes: [Primrose.Input.Gamepad.LSY], deadzone: 0.15},
                {name: "heading", axes: [-Primrose.Input.Gamepad.RSX], integrate: true, deadzone: 0.15},
                {name: "dheading", commands: ["heading"], delta: true},
                {name: "pitch", axes: [Primrose.Input.Gamepad.RSY], integrate: true, deadzone: 0.15, max: 0.5 * Math.PI, min: -0.5 * Math.PI},
                {name: "float", axes: [-Primrose.Input.Gamepad.LSY], deadzone: 0.12},
                {name: "toggleFloatMode", buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
                    commandDown: function () { application.avatar.floatMode = true; },
                    commandUp: function () { application.avatar.floatMode = false; } },
                {name: "resetVRSensor", buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                    commandDown: function () { application.resetVRSensor(); }, dt: 0.25}],
            mouseCommands: [{name: "dx", axes: [-Primrose.Input.Mouse.X], delta: true, scale: 0.5},
                {name: "heading", commands: ["dx"], integrate: true},
                {name: "dy", axes: [-Primrose.Input.Mouse.Y], delta: true, scale: 0.5},
                {name: "pitch", commands: ["dy"], integrate: true, min: -Math.PI * 0.5, max: Math.PI * 0.5}],
            moveSpeed: 1
        });

        this.lt = 0;

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

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
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.renderer.domElement);
        this.vrEffect = new THREE.VREffect(this.renderer);

        this.vrManager = new WebVRManager(this.renderer, this.vrEffect, {
            hideButton: false
        });

        this.vrControls = new THREE.VRControls(this.camera);
        this.vrControls.enabled = false;

        this.keyboard = new Primrose.Input.Keyboard("keyboard", window, options.keyboardCommands);

        this.mouse = new Primrose.Input.Mouse("mouse", this.renderer.domElement, options.mouseCommands);

        // TODO: dont understand Primrose.Input.Gamepad
        this.gamepad = new Primrose.Input.Gamepad("gamepad", options.gamepadCommands);
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
            this.renderer.setSize(canvasWidth, canvasHeight);
            if (this.vrManager.isVRMode()) {
                this.vrControls.enabled = true;
                pitch = 0;
            }
        }.bind(this), false);


        window.addEventListener("keydown", function (evt) {
            if (evt.keyCode === Primrose.Text.Keys.F) {
                requestFullScreen(this.renderer.domElement);
            }
        }.bind(this));


        var kbheading = 0,
            pitch = 0,
            pitchQuat = new THREE.Quaternion(),
            moveSpeed = options.moveSpeed,
            UP = new THREE.Vector3(0,1,0),
            RIGHT = new THREE.Vector3(1,0,0);
        this.animate = function(t) {

            var dt = (t - this.lt) * 0.001;
            this.lt = t;
            if (this.vrControls.enabled) {
                this.vrControls.update();
            }
            this.vrManager.render(this.scene, this.camera, t);

            this.keyboard.update(dt);
            this.mouse.update(dt);
            this.gamepad.update(dt);

            kbheading += -0.8 * dt * (this.keyboard.getValue("turnLeft") +
            this.keyboard.getValue("turnRight"));
            var heading = kbheading + this.gamepad.getValue("heading");
            var cosHeading = Math.cos(heading),
                sinHeading = Math.sin(heading);
            var cosPitch = 1,
                sinPitch = 0;
            if (!this.vrControls.enabled) {
                pitch = 0.3 * pitch - 0.7 * this.gamepad.getValue("pitch");
                cosPitch = Math.cos(pitch);
                sinPitch = Math.sin(pitch);
            }
            var strafe = this.keyboard.getValue("strafeRight") +
                this.keyboard.getValue("strafeLeft") +
                this.gamepad.getValue("strafe");
            var floatUp = this.keyboard.getValue("floatUp") + this.keyboard.getValue("floatDown");
            var drive = this.keyboard.getValue("driveBack") + this.keyboard.getValue("driveForward");
            if (this.avatar.floatMode) {
                floatUp += this.gamepad.getValue("float");
            } else {
                drive += this.gamepad.getValue("drive");
            }
            floatUp *= moveSpeed;
            if (strafe || drive) {
                var len = moveSpeed * Math.min(1, 1 / Math.sqrt(drive * drive +
                    strafe * strafe));
                strafe *= len;
                drive *= len;
            } else {
                strafe = 0;
                drive = 0;
            }

            this.avatar.quaternion.setFromAxisAngle(UP, heading);
            pitchQuat.setFromAxisAngle(RIGHT, pitch);
            this.avatar.quaternion.multiply(pitchQuat);
            this.avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
            this.avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
            this.avatar.position.y += dt * floatUp;

            requestAnimationFrame(this.animate);

        }.bind(this);

    }

    WebVRApplication.prototype.start = function(animate) {
        animate = animate || this.animate;
        function waitForResources(t) {
            this.lt = t;
            if (this.scene) {
                requestAnimationFrame(animate);
            } else {
                requestAnimationFrame(waitForResources);
            }
        }
        waitForResources.call(this, 0);
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
            this.vrControls.update();
        }
    };

    WebVRApplication.prototype.resetVRSensor = function () {
        this.vrControls.resetSensor();
    };


    // TODO:
    var quad = new THREE.PlaneBufferGeometry(1, 1);
    WebVRApplication.prototype.makeEditor = function ( id, w, h, options ) {
      options.size = options.size || new Primrose.Text.Size( 1024 * w, 1024 * h );
      options.fontSize = options.fontSize || 30;
      options.theme = options.theme || Primrose.Text.Themes.Dark;
      options.tokenizer = options.tokenizer || Primrose.Text.Grammars.PlainText;
      var t = new Primrose.Text.Controls.TextBox( id, options );
      var o = new THREE.Mesh(quad.clone(), new THREE.MeshBasicMaterial(0xffffff));
      return o;
    };

    var FORCE_VR_DISPLAY_PARAMETER = false;
    function requestFullScreen ( elem, vrDisplay ) {
      var fullScreenParam;
      if ( (!isMobile || FORCE_VR_DISPLAY_PARAMETER) && vrDisplay ) {
        fullScreenParam = { vrDisplay: vrDisplay };
      }
      if ( elem.webkitRequestFullscreen && fullScreenParam ) {
        elem.webkitRequestFullscreen( fullScreenParam );
      } else
      if ( elem.webkitRequestFullscreen ) {
        elem.webkitRequestFullscreen( window.Element.ALLOW_KEYBOARD_INPUT );
      } else
      if ( elem.requestFullscreen ) {
        elem.requestFullscreen();
      } else
      if ( elem.mozRequestFullScreen ) {
        elem.mozRequestFullScreen();
      } else if ( elem.msRequestFullscreen ) {
        elem.msRequestFullscreen();
      }

      if ( elem.requestPointerLock ) {
        elem.requestPointerLock();
      } else
      if ( elem.webkitRequestPointerLock ) {
        elem.webkitRequestPointerLock();
      } else
      if ( elem.mozRequestPointerLock ) {
        elem.mozRequestPointerLock();
      }
    }

    return WebVRApplication;
} )();
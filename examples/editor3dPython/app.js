/* global isOSX, Primrose, THREE, isMobile, requestFullScreen, CrapLoader, pyserver, JSON_SCENE, URL_PARAMS */

THREE.FresnelShader = {

    uniforms: {

        "mRefractionRatio": { type: "f", value: 1.02 },
        "mFresnelBias": { type: "f", value: 0.1 },
        "mFresnelPower": { type: "f", value: 2.0 },
        "mFresnelScale": { type: "f", value: 1.0 },
        "tCube": { type: "t", value: null }

    },

    vertexShader: [

        "uniform float mRefractionRatio;",
        "uniform float mFresnelBias;",
        "uniform float mFresnelScale;",
        "uniform float mFresnelPower;",

        "varying vec3 vReflect;",
        "varying vec3 vRefract[3];",
        "varying float vReflectionFactor;",

        "void main() {",

            "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
            "vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",

            "vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );",

            "vec3 I = worldPosition.xyz - cameraPosition;",

            "vReflect = reflect( I, worldNormal );",
            "vRefract[0] = refract( normalize( I ), worldNormal, mRefractionRatio );",
            "vRefract[1] = refract( normalize( I ), worldNormal, mRefractionRatio * 0.99 );",
            "vRefract[2] = refract( normalize( I ), worldNormal, mRefractionRatio * 0.98 );",
            "vReflectionFactor = mFresnelBias + mFresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), mFresnelPower );",

            "gl_Position = projectionMatrix * mvPosition;",

        "}"

    ].join( "\n" ),

    fragmentShader: [

        "uniform samplerCube tCube;",

        "varying vec3 vReflect;",
        "varying vec3 vRefract[3];",
        "varying float vReflectionFactor;",

        "void main() {",

            "vec4 reflectedColor = textureCube( tCube, vec3( -vReflect.x, vReflect.yz ) );",
            "vec4 refractedColor = vec4( 1.0 );",

            "refractedColor.r = textureCube( tCube, vec3( -vRefract[0].x, vRefract[0].yz ) ).r;",
            "refractedColor.g = textureCube( tCube, vec3( -vRefract[1].x, vRefract[1].yz ) ).g;",
            "refractedColor.b = textureCube( tCube, vec3( -vRefract[2].x, vRefract[2].yz ) ).b;",

            "gl_FragColor = mix( refractedColor, reflectedColor, clamp( vReflectionFactor, 0.0, 1.0 ) );",

        "}"

    ].join( "\n" )

};

function PrimroseDemo(vrDisplay, vrSensor, err) {
    "use strict";
    if (err) {
        console.error(err);
    }
    var vrParams,
        lastMouseX,
        lastMouseY,
        pointerX,
        pointerY,
        lastPointerX,
        lastPointerY,
        currentEditor,
        lastEditor,
        lt = 0,
        heading = 0,
        pitch = 0,
        SPEED = 0.001,
        inVR = false,
        dragging = false,
        keyState = {},
        modA = isOSX ? "metaKey" : "ctrlKey",
        modB = isOSX ? "altKey" : "shiftKey",
        cmdPre = isOSX ? "CMD+OPT" : "CTRL+SHIFT",
        pickingScene = new THREE.Scene(),
        ctrls = findEverything(),
        camera = new THREE.PerspectiveCamera(50, ctrls.output.width /
            ctrls.output.height, 0.1, 1000),
        mouse = new THREE.Vector3(0, 0, 0),
        raycaster = new THREE.Raycaster(new THREE.Vector3(),
            new THREE.Vector3(), 0, 50),
        pointer = textured(sphere(0.01, 4, 2), 0xff0000, true),
        renderer = new THREE.WebGLRenderer({
            canvas: ctrls.output,
            alpha: true,
            antialias: true
        }),
        gl = renderer.getContext(),
        UP = new THREE.Vector3(0, 1, 0),
        RIGHT = new THREE.Vector3(1, 0, 0),
        qPitch = new THREE.Quaternion(),
        qRift = new THREE.Quaternion(),
        position = new THREE.Vector3(0, 0, 0),
        vrEffect = new THREE.VREffect(renderer);

    var gamepad = new Primrose.Input.Gamepad("gamepad", [{
        name: "strafe",
        axes: [Primrose.Input.Gamepad.LSX]
    }, {
        name: "drive",
        axes: [Primrose.Input.Gamepad.LSY]
    }, {
        name: "heading",
        axes: [-Primrose.Input.Gamepad.RSX],
        integrate: true
    }, {
        name: "dheading",
        commands: ["heading"],
        delta: true
    }, {
        name: "pitch",
        axes: [Primrose.Input.Gamepad.RSY],
        integrate: true
    }]);
    gamepad.addEventListener( "gamepadconnected", function (id) {
        if (!gamepad.isGamepadSet()) {
            console.log("gamepad connected");
            gamepad.setGamepad(id);
        }
    }, false);

    var scene = CrapLoader.parse(JSON_SCENE);

    (function () {
        var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
        leapController.connect();
        var palm0 = new THREE.Mesh(new THREE.SphereBufferGeometry(0.02));
        var leapRoot = new THREE.Object3D();
        leapRoot.position.y -= 0.2;
        leapRoot.position.z -= 1.3;
        scene.add(leapRoot);
        leapRoot.add(palm0);
        var palm1 = new THREE.Mesh(new THREE.SphereBufferGeometry(0.02));
        leapRoot.add(palm1);
        var palms = [palm0, palm1];
        leapController.on('frame', onFrame);
        function onFrame(frame)
        {
            frame.hands.forEach(function (hand, i) {
                palms[i].position.set(hand.palmPosition[0] / 1000, hand.palmPosition[1] / 1000, hand.palmPosition[2] / 1000);
            });
        }
    })();

    GFXTablet(scene);

    var output = makeEditor(scene, pickingScene, "outputBox",
            1, 0.25, 0, -0.59, -2, -Math.PI / 4, 0, 0, {
                readOnly: true,
                hideLineNumbers: true
            }),
        documentation = makeEditor(scene, pickingScene, "docBox",
            1, 1, 0.85, 0, -2, 0, -Math.PI / 4, 0, {
                readOnly: true,
                hideLineNumbers: true,
                fontSize: 20,
                file: "INSTRUCTIONS:"
            }),
        editor = makeEditor(scene, pickingScene, "textEditor",
            1, 1, 0, 0, -2, 0, 0, 0, {
                tokenizer: Primrose.Text.Grammars.Python,
                file: 'print("Hello world!")'
            });
    
    pyserver.readFile("test.py", function (src) {
        editor.editor.value = src;
    });

    var log = function() {
        if (output.editor) {
            var msg = Array.prototype.join.call(arguments, ", ");
            output.editor.value += msg + "\n";
            output.editor.selectionStart = output.editor.selectionEnd = output.editor.value.length;
            output.editor.scrollIntoView(output.editor.frontCursor);
            output.editor.forceUpdate();
        }
    };

    log(fmt("$1+E to show/hide editor", cmdPre));
    log(fmt("$1+X to execute editor contents", cmdPre));

    var X_MAX = 12.5,
        X_MIN = -12.5,
        Z_MAX = 12.5,
        Z_MIN = -12.5;

    scene.add(pointer);

    CrapLoader.load("examples/models/ConfigUtilDeskScene.json", function (object) {
        object.position.z = -2;
        object.position.y = -0.85;
        scene.add(object);
    });

    window.addEventListener("resize", refreshSize);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", function(evt) {
        keyState[evt.keyCode] = false;
    });
    window.addEventListener("wheel", mouseWheel);
    window.addEventListener("paste", paste);

    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);

    var cmdLabels = document.querySelectorAll(".cmdLabel");
    for (var i = 0; i < cmdLabels.length; ++i) {
        cmdLabels[i].innerHTML = cmdPre;
    }

    var elems = [ctrls.leftKey, ctrls.rightKey, ctrls.forwardKey, ctrls.backKey];
    setupKeyOption(ctrls.leftKey, elems, 0, "A", 65);
    setupKeyOption(ctrls.rightKey, elems, 1, "D", 68);
    setupKeyOption(ctrls.forwardKey, elems, 2, "W", 87);
    setupKeyOption(ctrls.backKey, elems, 3, "S", 83);

    if (vrDisplay) {
        if (vrDisplay.getEyeParameters) {
            vrParams = {
                left: vrDisplay.getEyeParameters("left"),
                right: vrDisplay.getEyeParameters("right")
            };
        } else {
            vrParams = {
                left: {
                    renderRect: vrDisplay.getRecommendedEyeRenderRect("left"),
                    eyeTranslation: vrDisplay.getEyeTranslation("left"),
                    recommendedFieldOfView: vrDisplay.getRecommendedEyeFieldOfView(
                        "left")
                },
                right: {
                    renderRect: vrDisplay.getRecommendedEyeRenderRect("right"),
                    eyeTranslation: vrDisplay.getEyeTranslation("right"),
                    recommendedFieldOfView: vrDisplay.getRecommendedEyeFieldOfView(
                        "right")
                }
            };
        }
    }

    function onFullScreen(elem, vrDisplay) {
        requestFullScreen(elem, vrDisplay);
    }

    ctrls.goRegular.addEventListener("click", function() {
        onFullScreen(ctrls.output);
        refreshSize();
    });
    ctrls.goVR.style.display = !!vrDisplay ? "inline-block" : "none";
    ctrls.goVR.addEventListener("click", function() {
        onFullScreen(ctrls.output, vrDisplay);
        inVR = true;
        refreshSize();
    });

    refreshSize();

    requestAnimationFrame(render);

    function refreshSize() {
        var styleWidth = ctrls.outputContainer.clientWidth,
            styleHeight = ctrls.outputContainer.clientHeight,
            ratio = window.devicePixelRatio || 1,
            canvasWidth = styleWidth * ratio,
            canvasHeight = styleHeight * ratio,
            aspectWidth = canvasWidth;
        if (inVR) {
            canvasWidth = vrParams.left.renderRect.width +
                vrParams.right.renderRect.width;
            canvasHeight = Math.max(vrParams.left.renderRect.height,
                vrParams.right.renderRect.height);
            aspectWidth = canvasWidth / 2;
            vrEffect.setSize(canvasWidth, canvasHeight);
        }
        renderer.domElement.style.width = px(styleWidth);
        renderer.domElement.style.height = px(styleHeight);
        renderer.domElement.width = canvasWidth;
        renderer.domElement.height = canvasHeight;
        renderer.setViewport(0, 0, canvasWidth, canvasHeight);
        camera.aspect = aspectWidth / canvasHeight;
        camera.updateProjectionMatrix();
    }

    function keyDown(evt) {
        var mod = evt[modA] && evt[modB];
        if (mod && evt.keyCode === Primrose.Text.Keys.E) {
            documentation.visible = output.visible = editor.visible = !editor.visible;
            if (!editor.visible && lastEditor && lastEditor.focused) {
                lastEditor.blur();
                lastEditor = null;
            }
        } else if (mod && evt.keyCode === Primrose.Text.Keys.UPARROW) {
            lastEditor.increaseFontSize();
        } else if (mod && evt.keyCode === Primrose.Text.Keys.DOWNARROW) {
            lastEditor.decreaseFontSize();
        } else if (mod && evt.keyCode === Primrose.Text.Keys.X) {
            pyserver.exec(editor.editor.value, undefined, {log: log});
        } else if (!lastEditor || !lastEditor.focused) {
            keyState[evt.keyCode] = true;
        } else if (lastEditor && !lastEditor.readOnly) {
            lastEditor.keyDown(evt);
        } else if (evt.keyCode === Primrose.Text.Keys.V) {
            // toggle VRControls
        }
    }

    function setPointer(x, y) {
        if (lastPointerX !== undefined) {
            var dx = x - lastPointerX,
                dy = y - lastPointerY,
                nextX = pointerX + dx,
                nextY = pointerY + dy;
            if (nextX < 0 || nextX > ctrls.output.width) {
                dx = 0;
            }
            if (nextY < 0 || nextY > ctrls.output.height) {
                dy = 0;
            }
            pointerX += dx;
            pointerY += dy;

            mouse.set(
                2 * (pointerX / ctrls.output.width) - 1, -2 * (pointerY / ctrls.output.height) + 1);

            raycaster.setFromCamera(mouse, camera);
            if (currentEditor) {
                lastEditor = currentEditor;
            }
            currentEditor = null;
            var objects = raycaster.intersectObject(scene, true);
            var found = false;
            for (var i = 0; i < objects.length; ++i) {
                var obj = objects[i];
                if (obj.object.editor) {
                    pointer.position.set(0, 0, 0);
                    pointer.lookAt(obj.face.normal);
                    pointer.position.copy(obj.point);
                    currentEditor = obj.object.editor;
                    found = true;
                    break;
                }
            }
            if (!found) {
                pointer.position.copy(raycaster.ray.direction);
                pointer.position.multiplyScalar(3);
                pointer.position.add(raycaster.ray.origin);
            }
        } else {
            pointerX = x;
            pointerY = y;
        }
        lastPointerX = x;
        lastPointerY = y;
        var good = false;
        if (currentEditor) {
            currentEditor.focus();
            good = true;
        }

        if (!good && lastEditor && lastEditor.focused) {
            lastEditor.blur();
            lastEditor = null;
        }
    }

    function paste(evt) {
        if (lastEditor && !lastEditor.readOnly) {
            lastEditor.readClipboard(evt);
        }
    }

    function mouseWheel(evt) {
        if (lastEditor) {
            lastEditor.readWheel(evt);
        }
    }

    function mouseDown(evt) {
        dragging = true;
        if (!isPointerLocked()) {
            lastMouseX = evt.clientX;
            lastMouseY = evt.clientY;
        }

        setPointer(lastMouseX, lastMouseY);
        pick("start");
    }

    function mouseMove(evt) {
        var rotating = evt.shiftKey || !editor.visible;
        if (isPointerLocked()) {
            var dx = evt.movementX,
                dy = evt.movementY;
            if (dx === undefined) {
                dx = evt.mozMovementX;
                dy = evt.mozMovementY;
            }

            if (dx !== undefined) {
                if (rotating) {
                    heading -= dx * 0.001;
                    pitch += dy * 0.001;
                }
                if (lastMouseX === undefined) {
                    lastMouseX = dx;
                    lastMouseY = dy;
                } else {
                    lastMouseX += dx;
                    lastMouseY += dy;
                }
            }
        } else {
            var x = evt.clientX,
                y = evt.clientY;
            if (lastMouseX !== undefined && rotating) {
                heading -= (x - lastMouseX) * 0.001;
                pitch += (y - lastMouseY) * 0.001;
            }
            lastMouseX = x;
            lastMouseY = y;
        }

        if (lastMouseX !== undefined) {
            setPointer(lastMouseX, lastMouseY);
        }
    }

    function mouseUp(evt) {
        dragging = false;
        if (lastEditor && lastEditor.focused) {
            lastEditor.endPointer();
        }
    }


    function renderScene(s, rt, fc) {
        if (inVR) {
            vrEffect.render(s, camera);
        } else {
            renderer.render(s, camera, rt, fc);
        }
    }

    function pick(op) {
        // TODO
        // if (lastEditor && lastEditor.focused) {
        //     renderScene(pickingScene, back, true);
        //     lastEditor[op + "Picking"](gl, pointerX, ctrls.output.height -
        //         pointerY);
        // }
    }

    function update(dt) {
        var cos = Math.cos(heading),
            sin = Math.sin(heading),
            exp;
        if (keyState[ctrls.forwardKey.dataset.keycode]) {
            position.z -= dt * SPEED * cos;
            position.x -= dt * SPEED * sin;
        } else if (keyState[ctrls.backKey.dataset.keycode]) {
            position.z += dt * SPEED * cos;
            position.x += dt * SPEED * sin;
        }
        if (keyState[ctrls.leftKey.dataset.keycode]) {
            position.x -= dt * SPEED * cos;
            position.z += dt * SPEED * sin;
        } else if (keyState[ctrls.rightKey.dataset.keycode]) {
            position.x += dt * SPEED * cos;
            position.z -= dt * SPEED * sin;
        }

        position.x = Math.min(X_MAX, Math.max(X_MIN, position.x));
        position.z = Math.min(Z_MAX, Math.max(Z_MIN, position.z));
        camera.quaternion.setFromAxisAngle(UP, heading);
        if (!inVR) {
            qPitch.setFromAxisAngle(RIGHT, pitch);
            camera.quaternion.multiply(qPitch);
        }

        camera.position.copy(position);
        if (vrSensor) {
            var state = vrSensor.getState();
            if (state.orientation) {
                qRift.copy(state.orientation);
                camera.quaternion.multiply(qRift);
            }

            if (state.position) {
                camera.position.add(state.position);
            }
        }

        if (dragging) {
            pick("move");
        }
    }

    function render(t) {
        requestAnimationFrame(render);
        if (lt) {
            update(t - lt);
        }

        renderScene(scene);
        lt = t;
    }

}
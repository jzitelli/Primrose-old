/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var modA = isOSX ? "metaKey" : "ctrlKey";
var modB = isOSX ? "altKey" : "shiftKey";
var cmdPre = isOSX ? "CMD+OPT" : "CTRL+SHIFT";
var vrDisplay, vrSensor, vrEffect, renderer, lastTab;

function clearKeyOption(evt) {
    this.value = "";
    this.dataset.keycode = "";
}

function setKeyOption(evt) {
    this.dataset.keycode = evt.keyCode;
    this.value = this.value || Keys[evt.keyCode];
    this.value = this.value.toLowerCase().replace("arrow", " arrow");
    this.blur();
}

function setupKeyOption(elem, char, code) {
    elem.value = char.toLowerCase();
    elem.dataset.keycode = code;
    elem.addEventListener("keydown", clearKeyOption);
    elem.addEventListener("keyup", setKeyOption);
}

var mockVRDisplay = {
    getRecommendedEyeRenderRect: function (side) {
        if (side === "left") {
            return {x: 0, y: 0, width: 1182, height: 1461, top: 0, right: 1182, bottom: 1461, left: 0};
        }
        else {
            return {x: 1182, y: 0, width: 1182, height: 1461, top: 0, right: 2364, bottom: 1461, left: 1182};
        }
    },
    getEyeTranslation: function (side) {
        if (side === "left") {
            return {x: -0.03200000151991844, y: -0, z: -0, w: 0};
        }
        else {
            return {x: 0.03200000151991844, y: -0, z: -0, w: 0};
        }
    },
    getRecommendedEyeFieldOfView: function (side) {
        if (side === "left") {
            return {upDegrees: 53.0464661134181, rightDegrees: 47.527693754615306, downDegrees: 53.0464661134181, leftDegrees: 46.63209544498114};
        }
        else {
            return {upDegrees: 53.0464661134181, rightDegrees: 46.63209544498114, downDegrees: 53.0464661134181, leftDegrees: 47.527693754615306};
        }
    }
};

function goFullscreen() {
    showSection("");
    var elem = ctrls.output;
    if (vrDisplay) {
        if (!vrEffect) {
            vrEffect = new THREE.VREffect(renderer, vrDisplay);
        }
        if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen({vrDisplay: vrDisplay});
        }
        else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen({vrDisplay: vrDisplay});
        }
    }
    else {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        }
        else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
        else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        }
        else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }

    if (elem.requestPointerLock) {
        elem.requestPointerLock();
    }
    else if (elem.webkitRequestPointerLock) {
        elem.webkitRequestPointerLock();
    }
    else if (elem.mozRequestPointerLock) {
        elem.mozRequestPointerLock();
    }
}

function gotVRDevices(devices) {
    for (var i = 0; i < devices.length; ++i) {
        var device = devices[i];
        if (device instanceof HMDVRDevice) {
            vrDisplay = device;
        }
        else if (device instanceof PositionSensorVRDevice) {
            vrSensor = device;
        }
        if (vrSensor && vrDisplay) {
            break;
        }
    }
    PrimroseDemo();
}

function PrimroseDemo(err) {
    if (err) {
        console.error(err);
    }
    var lt = 0,
            dragging = false,
            lastMouseX, lastMouseY,
            lastTouchX, lastTouchY,
            pointerX, pointerY,
            currentObject, currentEditor,
            touchDrive = 0,
            touchStrafe = 0,
            SPEED = 0.002,
            heading = 0,
            pitch = 0,
            keyState = {},
            w1 = 1,
            h = 1,
            w2 = 2,
            prim1 = new Primrose("editor1", Renderers.Canvas, {
                width: (w1 * 512) + "px",
                height: (h * 512) + "px",
                tokenizer: Grammar.JavaScript,
                file: "var ball = textured(box(0.25, 0.25, 0.25), 'images/bg1.jpg');\n\
scene.add(ball);\n\n\
ball.position.y = 0.25;\n\
var radius = 3, angle = 0, dAngle = Math.PI / 360;\n\
setInterval(function(){\n\
    ball.position.x = radius * Math.cos(angle);\n\
    ball.position.z = radius * Math.sin(angle);\n\
    angle += dAngle;\n\
}, 16);\n\
\n\
// focus on this window and hit CTRL+SHIFT+SPACE (Windows/Linux) or CMD+OPT+E (OS X) to execute."
            }),
            prim2 = new Primrose("editor2", Renderers.Canvas, {
                width: (w2 * 256) + "px",
                height: (h * 256) + "px",
                file: "var ball = textured(sphere(0.25, // radius\n\
                            10, // slices\n\
                            10), // rings\n\
                     0xffff00); // a color hex code, an Image, a Canvas, a Primrose object, or string path to an image\n\
scene.add(ball);\n\
var radius = 3, angle = 0, dAngle = Math.PI / 360;\n\
setInterval(function(){\n\
    ball.position.x = radius * Math.cos(angle);\n\
    ball.position.y = radius * Math.sin(angle);\n\
    angle += dAngle;\n\
}, 16);\n\
\n\
// focus on this window and hit CTRL+SHIFT+SPACE (Windows/Linux) or CMD+OPT+E (OS X) to execute."
            }),
            scene = new THREE.Scene(),
            pickingScene = new THREE.Scene(),
            body = new THREE.Object3D(),
            camera = new THREE.PerspectiveCamera(50, ctrls.output.width / ctrls.output.height, 0.1, 1000),
            back = new THREE.WebGLRenderTarget(ctrls.output.width, ctrls.output.height, {
                wrapS: THREE.ClampToEdgeWrapping,
                wrapT: THREE.ClampToEdgeWrapping,
                magFilter: THREE.LinearFilter,
                minFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat, 
                type: THREE.UnsignedByteType,
                stencilBuffer: false
            }),
            fakeCamera = new THREE.PerspectiveCamera(50, ctrls.output.width / ctrls.output.height, 0.001, 1000),
            mouse = new THREE.Vector3(0, 0, 0),
            raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, 50),
            pointer = textured(sphere(0.01, 4, 2), 0xff0000);
    back.generateMipMaps = false;
    renderer = new THREE.WebGLRenderer({
        canvas: ctrls.output,
        alpha: true,
        antialias: true
    });

    var gl = renderer.getContext(),
            sky = textured(shell(50, 8, 4, Math.PI * 2, Math.PI), "images/bg4.jpg"),
            floor = textured(box(25, 1, 25), "images/deck.png", 25, 25),
            shellGeom = shell(w1, 5, 10),
            shellEditor = textured(shellGeom, prim1),
            shellEditorPicker = textured(shellGeom, prim1.getRenderer().getPickingTexture()),
            flatGeom = quad(w2, h),
            flatEditor = textured(flatGeom, prim2),
            flatEditorPicker = textured(flatGeom, prim2.getRenderer().getPickingTexture());

    body.position.set(0, 0, w1);
    floor.position.set(0, -3, 0);
    flatEditor.position.x = flatEditorPicker.position.x = 4;

    scene.add(sky);
    body.add(camera);
    scene.add(fakeCamera);
    scene.add(floor);
    scene.add(shellEditor);
    scene.add(flatEditor);
    scene.add(body);
    scene.add(pointer);

    pickingScene.add(shellEditorPicker);
    pickingScene.add(flatEditorPicker);

    window.addEventListener("resize", refreshSize);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("wheel", mouseWheel);
    ctrls.output.addEventListener("mousedown", mouseDown);
    ctrls.output.addEventListener("mousemove", mouseMove);
    ctrls.output.addEventListener("mouseup", mouseUp);
    ctrls.output.addEventListener("touchstart", touchStart);
    ctrls.output.addEventListener("touchmove", touchMove);
    ctrls.output.addEventListener("touchend", touchEnd);

    ctrls.controls.appendChild(prim1.operatingSystemSelect);
    ctrls.controls.appendChild(prim1.keyboardSelect);
    ctrls.controls.appendChild(prim1.themeSelect);
    ctrls.toggleLineNumbers.addEventListener("change", function(){
        prim1.setShowLineNumbers(ctrls.toggleLineNumbers.checked);
        prim2.setShowLineNumbers(ctrls.toggleLineNumbers.checked);
    });
    ctrls.toggleScrollBars.addEventListener("change", function(){
        prim1.setShowScrollBars(ctrls.toggleScrollBars.checked);
        prim2.setShowScrollBars(ctrls.toggleScrollBars.checked);
    });
    prim1.operatingSystemSelect.addEventListener("change", function () {
        prim2.setOperatingSystem(prim1.getOperatingSystem());
    });
    prim1.keyboardSelect.addEventListener("change", function () {
        prim2.setCodePage(prim1.getCodePage());
    });
    prim1.themeSelect.addEventListener("change", function () {
        prim2.setTheme(prim1.getTheme());
    });

    var cmdLabels = document.querySelectorAll(".cmdLabel");
    for (var i = 0; i < cmdLabels.length; ++i) {
        cmdLabels[i].innerHTML = cmdPre;
    }

    setupKeyOption(ctrls.leftKey, "A", 65);
    setupKeyOption(ctrls.rightKey, "D", 68);
    setupKeyOption(ctrls.forwardKey, "W", 87);
    setupKeyOption(ctrls.backKey, "S", 83);

    if (vrDisplay) {
        ctrls.goMobile.style.display = "none";
        ctrls.goRegular.style.display = "none";
        ctrls.nightly.display = "none";
    }
    else {
        ctrls.goMobile.style.display = "none";
        ctrls.goVR.style.display = "none";
    }

    refreshSize();

    requestAnimationFrame(render);

    function refreshSize() {
        var styleWidth = ctrls.outputContainer.clientWidth,
                styleHeight = ctrls.outputContainer.clientHeight,
                ratio = window.devicePixelRatio || 1,
                canvasWidth = styleWidth * ratio,
                canvasHeight = styleHeight * ratio;

        if (vrEffect) {
            var leftRect = vrDisplay.getRecommendedEyeRenderRect("left"),
                    rightRect = vrDisplay.getRecommendedEyeRenderRect("right");
            canvasWidth = leftRect.width + rightRect.width;
            canvasHeight = Math.max(leftRect.height, rightRect.height);
            prim1.forceUpdate();
            prim2.forceUpdate();
        }
        renderer.domElement.style.width = styleWidth + "px";
        renderer.domElement.style.height = styleHeight + "px";
        renderer.domElement.width = canvasWidth;
        renderer.domElement.height = canvasHeight;
        renderer.setViewport(0, 0, canvasWidth, canvasHeight);
        back.setSize(canvasWidth, canvasHeight);
        fakeCamera.aspect = camera.aspect = canvasWidth / canvasHeight;
        camera.updateProjectionMatrix();
        fakeCamera.updateProjectionMatrix();
    }

    function log(msg) {
        console.log(msg);
        if (currentEditor) {
            currentEditor.overwriteText(msg);
            currentEditor.drawText();
        }
    }

    function keyDown(evt) {
        if (evt.keyCode === Keys.ESCAPE) {
            vrEffect = null;
            refreshSize();
            prim1.forceUpdate();
            prim2.forceUpdate();
        }
        if (currentEditor && currentEditor.isFocused()) {
            currentEditor.editText(evt);
        }
        else {
            keyState[evt.keyCode] = true;
        }
        if (evt[modA] && evt[modB]) {
            if (evt.keyCode === 70) {
                goFullscreen();
                evt.preventDefault();
            }
            else if (currentEditor) {
                if ((isOSX && evt.keyCode === 69) || (!isOSX && evt.keyCode === 32)) {
                    try {
                        eval(currentEditor.getText());
                    }
                    catch (exp) {
                        log(exp.message);
                    }
                    evt.preventDefault();
                }
                else if (evt.keyCode === 38) {
                    currentEditor.increaseFontSize();
                    evt.preventDefault();
                }
                else if (evt.keyCode === 40) {
                    currentEditor.decreaseFontSize();
                    evt.preventDefault();
                }
            }
        }
    }

    function keyUp(evt) {
        keyState[evt.keyCode] = false;
    }

    function setPointer(x, y) {
        pointerX = x;
        pointerY = ctrls.output.height - y;
        mouse.set(2 * (x / ctrls.output.width) - 1, -2 * (y / ctrls.output.height) + 1);

        fakeCamera.position.copy(body.position);
        fakeCamera.rotation.copy(body.rotation);
        raycaster.setFromCamera(mouse, fakeCamera);
        currentObject = null;
        currentEditor = null;
        var objects = raycaster.intersectObject(scene, true);
        var firstObj = objects.length > 0 && objects[0].object;
        if(firstObj === sky || firstObj === floor){
            pointer.position.copy(raycaster.ray.direction);
            pointer.position.multiplyScalar(3);
            pointer.position.add(raycaster.ray.origin);
        }
        else{
            for (var i = 0; i < objects.length; ++i) {
                var obj = objects[i];
                if (obj.object !== pointer) {
                    pointer.position.set(0, 0, 0);
                    pointer.lookAt(obj.face.normal);
                    pointer.position.copy(obj.point);
                    currentObject = obj.object;
                    if (currentObject === shellEditor) {
                        currentEditor = prim1;
                    }
                    else if (currentObject === flatEditor) {
                        currentEditor = prim2;
                    }
                    break;
                }
            }
        }
    }

    function mouseWheel(evt) {
        if (currentEditor) {
            currentEditor.readWheel(evt);
        }
    }

    function mouseDown(evt) {
        if(evt.target === ctrls.output){
            dragging = true;
            if (!isPointerLocked()) {
                lastMouseX = evt.clientX;
                lastMouseY = evt.clientY;
                setPointer(lastMouseX, lastMouseY);
            }

            if (currentEditor) {
                currentEditor.focus();
                if(!window.onbeforeunload){
                    // ugh, this is really ugly.
                    window.onbeforeunload = function(){ return "Are you sure you want to leave?"; };
                }
            }
            else {
                prim1.blur();
                prim2.blur();
            }

            pick("start");
        }
        else{
            prim1.blur();
            prim2.blur();
            currentEditor = null;
        }
    }

    function mouseMove(evt) {
        if (isPointerLocked()) {
            var dx = evt.movementX,
                    dy = evt.movementY;
            if (dx === undefined) {
                dx = evt.mozMovementX;
                dy = evt.mozMovementY;
            }

            if (dx !== undefined) {
                if (evt.shiftKey) {
                    heading -= dx * 0.001;
                    pitch += dy * 0.001;
                }
                if (lastMouseX === undefined) {
                    lastMouseX = dx;
                    lastMouseY = dy;
                }
                else {
                    lastMouseX += dx;
                    lastMouseY += dy;
                }
            }
        }
        else {
            var x = evt.clientX,
                    y = evt.clientY;
            if (lastMouseX !== undefined && evt.shiftKey) {
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
        if (currentEditor && currentEditor.isFocused()) {
            currentEditor.endPointer();
        }
    }

    function touchStart(evt) {
        lastTouchX = evt.touches[0].clientX;
        lastTouchY = evt.touches[0].clientY;
        setPointer(lastTouchX, lastTouchY);
        pick("start");
    }

    function touchMove(evt) {
        var x = 0, y = 0;
        for (var i = 0; i < evt.touches.length; ++i) {
            x += evt.touches[i].clientX;
            y += evt.touches[i].clientY;
        }
        x /= evt.touches.length;
        y /= evt.touches.length;

        if (evt.shiftKey) {
            if (evt.touches.length === 1) {
                heading += (x - lastTouchX) * 0.005;
                pitch += (y - lastTouchY) * 0.005;
            }
            else {
                touchStrafe = (x - lastTouchX) / 2;
                touchDrive = (y - lastTouchY) / 2;
            }
        }
        lastTouchX = x;
        lastTouchY = y;
        setPointer(lastTouchX, lastTouchY);
        evt.preventDefault();
    }

    function touchEnd(evt) {
        if (evt.touches.length < 2) {
            touchStrafe = 0;
        }

        if (evt.touches.length === 0) {
            touchDrive = 0;
            if (currentEditor && currentEditor.isFocused()) {
                currentEditor.endPointer();
            }
        }
    }

    function update(dt) {
        var cos = Math.cos(heading),
                sin = Math.sin(heading);
        if (keyState[ctrls.forwardKey.dataset.keycode]) {
            body.position.z -= dt * SPEED * cos;
            body.position.x -= dt * SPEED * sin;
        }
        else if (keyState[ctrls.backKey.dataset.keycode]) {
            body.position.z += dt * SPEED * cos;
            body.position.x += dt * SPEED * sin;
        }
        if (keyState[ctrls.leftKey.dataset.keycode]) {
            body.position.x -= dt * SPEED * cos;
            body.position.z += dt * SPEED * sin;
        }
        else if (keyState[ctrls.rightKey.dataset.keycode]) {
            body.position.x += dt * SPEED * cos;
            body.position.z -= dt * SPEED * sin;
        }

        body.position.z += dt * SPEED * (touchStrafe * sin - touchDrive * cos);
        body.position.x -= dt * SPEED * (touchStrafe * cos + touchDrive * sin);
        body.position.x = Math.min(12.5, Math.max(-12.5, body.position.x));
        body.position.z = Math.min(12.5, Math.max(-12.5, body.position.z));

        body.rotation.set(0, 0, 0, 0);
        body.rotateY(heading);
        body.rotateX(pitch);

        sky.position.copy(body.position);

        if (vrSensor) {
            var state = vrSensor.getState();
            if (state.position) {
                camera.position.set(state.position.x, state.position.y, state.position.z);
            }
            if (state.orientation) {
                camera.quaternion.set(state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w);
            }
        }

        ctrls.loc.innerHTML = fmt("<$1.00, $2.00>", body.position.x, body.position.z);
        if (dragging) {
            pick("move");
        }
    }

    function render(t) {
        requestAnimationFrame(render);
        if (lt) {
            update(t - lt);
        }
        var r = vrEffect || renderer;
        r.render(scene, camera);
        lt = t;
    }

    function textured(geometry, txt, s, t) {
        var material;

        if (typeof (txt) === "number") {
            material = new THREE.MeshBasicMaterial({
                transparent: true,
                color: txt,
                useScreenCoordinates: false,
                shading: THREE.FlatShading
            });
        }
        else {
            var texture;
            if (typeof (txt) === "string") {
                texture = THREE.ImageUtils.loadTexture(txt);
                texture.anisotropy = renderer.getMaxAnisotropy();
            }
            else if (txt instanceof Primrose) {
                texture = txt.getRenderer().getTexture(renderer.getMaxAnisotropy());
            }
            else {
                texture = txt;
            }

            material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                map: texture,
                transparent: false,
                shading: THREE.FlatShading,
                side: THREE.DoubleSide
            });

            if (s * t > 1) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(s, t);
            }
        }

        var obj = new THREE.Mesh(geometry, material);
        return obj;
    }

    function quad(w, h) {
        return new THREE.PlaneBufferGeometry(w, h);
    }

    function box(w, h, l) {
        return new THREE.BoxGeometry(w, h, l);
    }

    function sphere(r, slices, rings) {
        return new THREE.SphereGeometry(r, slices, rings);
    }

    function shell(r, slices, rings, phi, theta) {
        if (phi === undefined) {
            phi = Math.PI * 0.5;
        }
        if (theta === undefined) {
            theta = Math.PI * 0.5;
        }
        var phiStart = Math.PI + phi * 0.5;
        var thetaStart = (Math.PI - theta) * 0.5;
        var geom = new THREE.InsideSphereGeometry(r, slices, rings, phiStart, phi, thetaStart, theta, true);
        return geom;
    }

    function pick(op) {
        if (currentEditor && currentEditor.isFocused()) {
            var r = vrEffect ? vrEffect : renderer;
            scene.remove(body);
            pickingScene.add(body);
            r.render(pickingScene, camera, back, true);
            pickingScene.remove(body);
            scene.add(body);
            currentEditor[op + "Picking"](gl, pointerX, pointerY);
        }
    }
}

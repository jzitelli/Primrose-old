//Setup three.js WebGL renderer
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);

// Append the canvas element created by the renderer to document body element.
document.body.appendChild(renderer.domElement);

// Create a three.js scene
var scene = new THREE.Scene();

// Create a three.js camera
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.3, 10000);

// Apply VR headset positional data to camera.
var controls = new THREE.VRControls(camera);

// Apply VR stereo rendering to renderer
var effect = new THREE.VREffect(renderer);

effect.setSize(window.innerWidth, window.innerHeight);

// Create a VR manager helper to enter and exit VR mode.
var vrmgr = new WebVRManager(effect);

// Create 3d objects
var geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
var material = new THREE.MeshNormalMaterial();
var cube = new THREE.Mesh(geometry, material);

// Position cube mesh
cube.position.z = -1;

// Add cube mesh to your three.js scene
scene.add(cube);


// from PRIMROSE demo.js
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
            w2 = 2;
var prim1 = new Primrose("editor1", Renderers.Canvas, {
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
            });


var            prim2 = new Primrose("editor2", Renderers.Canvas, {
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
            });

    var pickingScene = new THREE.Scene();

    var body = new THREE.Object3D();

    var pointer = textured(sphere(0.01, 4, 2), 0xff0000);

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
    //scene.add(fakeCamera);
    scene.add(floor);
    scene.add(shellEditor);
    scene.add(flatEditor);
    scene.add(body);
    scene.add(pointer);

    pickingScene.add(shellEditorPicker);
    pickingScene.add(flatEditorPicker);

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

// END PRIMROSE


// Request animation frame loop function
function animate() {
  // Apply rotation to cube mesh
  //cube.rotation.y += 0.01;

  // Update VR headset position and apply to camera.
  controls.update();

  // Render the scene through the VREffect, but only if it's in VR mode.
  if (vrmgr.isVRMode()) {
    effect.render(scene, camera);
  } else {
    renderer.render(scene, camera);
  }

  requestAnimationFrame( animate );
}

// Kick off animation loop
animate();

// Listen for keyboard event and zero positional sensor on appropriate keypress.
function onKey(event) {
  if (event.keyCode == 90) { // z
    controls.zeroSensor();
  }
};

window.addEventListener('keydown', onKey, true);

// Handle window resizes
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  effect.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener('resize', onWindowResize, false);

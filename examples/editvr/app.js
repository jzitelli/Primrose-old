/* global THREE, CrapLoader, JSON_SCENE, WebVRApplication */

var application;

function onLoad() {
    "use strict";
    var avatar = new THREE.Object3D();
    var scene;
    if (JSON_SCENE) {
        scene = CrapLoader.parse(JSON_SCENE);
    } else {
        scene = new THREE.Scene();
    }

    function executePython() {
        pyserver.exec(editorMesh.textBox.value, function (returned) {
            console.log("execution returned value:");
            console.log(returned);
        }, {log: application.log});
    }

    var options = {
        keyboardCommands: [{name: 'exec',
                            buttons: [Primrose.Input.Keyboard.CTRL, Primrose.Input.Keyboard.X],
                            commandDown: executePython, dt: 0.25}]
    };
    application = new WebVRApplication("editvr", avatar, scene, options);

    scene.add(avatar);
    avatar.add(application.camera);


    GFXTablet(scene);


    CrapLoader.load("models/ConfigUtilDeskScene.json", function (object) {
        object.position.z = -2;
        object.position.y = -0.85;
        object.scale.set(0.01, 0.01, 0.01);
        scene.add(object);
    });


    addHands(avatar);


    var mousePointer = new THREE.Mesh(new THREE.SphereBufferGeometry(0.02));
    mousePointer.position.z = -2;
    avatar.add(mousePointer);
    mousePointer.visible = false;
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
    var rectGeom = new THREE.PlaneBufferGeometry(1, 1).translate(0.5, -0.5, 0);
    var rectMesh = new THREE.Mesh(rectGeom, new THREE.MeshBasicMaterial({color: 0x0022ee, side: THREE.DoubleSide, transparent: true, opacity: 0.8}));
    avatar.add(rectMesh);
    rectMesh.visible = false;
    var drawingRect = false;
    var popupMenu = new THREE.Mesh(rectGeom);
    popupMenu.visible = false;
    scene.add(popupMenu);
    window.addEventListener("mousedown", function (evt) {
        if (!mousePointer.visible) {
            return;
        }
        if (evt.buttons == 1) {
            drawingRect = true;
            // mousePointer.visible = false;
            rectMesh.position.copy(mousePointer.position);
        } else
        if (evt.buttons == 2) {
            scene.remove(popupMenu);
            avatar.add(popupMenu);
            popupMenu.position.copy(mousePointer.position);
            popupMenu.quaternion.set(0,0,0,1);
            popupMenu.visible = true;
        }
    });
    window.addEventListener("mouseup", function (evt) {
        if (!mousePointer.visible) {
            return;
        }
        if (drawingRect) {
            drawingRect = false;
            var newMesh = rectMesh.clone();
            newMesh.position.copy(avatar.localToWorld(rectMesh.position));
            newMesh.quaternion.copy(avatar.quaternion);
            scene.add(newMesh);
            rectMesh.visible = false;
            // mousePointer.visible = true;
        } else
        if (popupMenu.visible) {
            avatar.remove(popupMenu);
            scene.add(popupMenu);
            popupMenu.position.copy(avatar.localToWorld(popupMenu.position));
            popupMenu.quaternion.copy(avatar.quaternion);
        }
    });
    window.addEventListener("mousemove", function (evt) {
        var dx = evt.movementX,
            dy = evt.movementY;
        mousePointer.position.x += 0.003*dx;
        mousePointer.position.x = Math.max(Math.min(mousePointer.position.x, 2.25), -2.25);
        mousePointer.position.y -= 0.003*dy;
        mousePointer.position.y = Math.max(Math.min(mousePointer.position.y, 1.5), -1);
        if (drawingRect) {
            var xScale = mousePointer.position.x - rectMesh.position.x,
                yScale = rectMesh.position.y - mousePointer.position.y;
            if (xScale > 0.1 && yScale > 0.1) {
                rectMesh.scale.set(xScale, yScale, 1)
                rectMesh.visible = true;
            } else {
                rectMesh.visible = false;
            }
        }
    });
    window.addEventListener("wheel", function (evt) {

    });

    // TODO: investigate slow firefox performance:
    var editorMesh = application.makeEditor("python_editor", 1, 1, {tokenizer: Primrose.Text.Grammars.Python});
    editorMesh.position.set(2, 1, -3);
    pyserver.readFile('examples/editvr/test.py', function (text) {
        editorMesh.textBox.value = text;
        scene.add(editorMesh);
    });

    application.start();
}

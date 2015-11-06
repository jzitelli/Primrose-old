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
        application.setPicking(true);
    });


    addHands(avatar);


    var mousePointer = application.mousePointer;
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
        if (evt.button === 1) {
            drawingRect = true;
            rectMesh.position.copy(mousePointer.position);
            application.setPicking(false);
        } else
        if (evt.button === 2) {
            scene.remove(popupMenu);
            avatar.add(popupMenu);
            popupMenu.position.copy(mousePointer.position);
            popupMenu.quaternion.set(0,0,0,1);
            popupMenu.visible = true;
            application.setPicking(false);
        }
    });
    window.addEventListener("mouseup", function (evt) {
        if (!mousePointer.visible) {
            return;
        }
        if (evt.button === 1) {
            drawingRect = false;
            var newMesh = rectMesh.clone();
            newMesh.material = rectMesh.material.clone();
            newMesh.position.copy(avatar.localToWorld(rectMesh.position));
            newMesh.quaternion.copy(avatar.quaternion);
            scene.add(newMesh);
            rectMesh.visible = false;
            application.setPicking(true);
        } else
        if (evt.button === 2) {
            avatar.remove(popupMenu);
            scene.add(popupMenu);
            popupMenu.position.copy(avatar.localToWorld(popupMenu.position));
            popupMenu.quaternion.copy(avatar.quaternion);
            application.setPicking(true);
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
        else if (popupMenu.visible && evt.buttons === 2) {
            popupMenu.position.copy(mousePointer.position);
        }
    });
    window.addEventListener("wheel", function (evt) {
    });

    // TODO: investigate slow firefox performance:
    var editorMesh = application.makeEditor("python_editor", 2, 2, {tokenizer: Primrose.Text.Grammars.Python});
    editorMesh.position.set(1.25, 0, -1.5);
    pyserver.readFile('examples/editvr/test.py', function (text) {
        editorMesh.textBox.value = text;
        scene.add(editorMesh);
    });

    application.start();
}

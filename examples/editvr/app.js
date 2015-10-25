/* global THREE, CrapLoader, JSON_SCENE, WebVRApplication */

var application;

function onLoad() {
    "use strict";
    var avatar = new THREE.Object3D();
    avatar.name = "user_00000000";

    var scene;
    if (JSON_SCENE) {
        scene = CrapLoader.parse(JSON_SCENE);
    } else {
        scene = new THREE.Scene();
    }

    var options = {};
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


    // (function () {
    //     var audioContext = application.audioContext;
    //     var source = audioContext.createBufferSource();
    //     var request = new XMLHttpRequest();
    //     var gainNode = audioContext.createGain();
    //     gainNode.connect(audioContext.destination);
    //     gainNode.gain.value = 0.5;
    //     request.open('GET', 'sounds/wind.ogg', true);
    //     request.responseType = 'arraybuffer';
    //     request.onload = function() {
    //         var audioData = request.response;
    //         audioContext.decodeAudioData( audioData ).then(function(buffer) {
    //             source.buffer = buffer;
    //             source.connect(gainNode);
    //             source.loop = true;
    //             source.start(0);
    //           });
    //     };
    //     request.send();
    // })();


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

    var editorMesh = application.makeEditor("python_editor", 1, 1, {tokenizer: Primrose.Text.Grammars.Python});
    editorMesh.position.set(2, 2, -5);
    pyserver.readFile('examples/editvr/test.py', function (text) {
        editorMesh.textBox.value = text;
        scene.add(editorMesh);
    });

	application.start();
}

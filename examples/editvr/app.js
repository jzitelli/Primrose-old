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


    // Create particle group and emitter
    var particleGroup,
        emitter;
    function initParticles() {
        particleGroup = new SPE.Group({
            texture: {
                value: THREE.ImageUtils.loadTexture('images/bubble5.png')
            }
        });
        emitter = new SPE.Emitter({
            maxAge: {
                value: 1
            },
            position: {
                value: new THREE.Vector3(0, 0, 0),
                spread: new THREE.Vector3( 10, 0.5, 10 )
            },
            acceleration: {
                value: new THREE.Vector3(0, 0.04, 0),
                spread: new THREE.Vector3( 0.01, 0.001, 0.01 )
            },
            velocity: {
                value: new THREE.Vector3(0, 2, 0),
                spread: new THREE.Vector3(2.0, 4.5/2, 2.0 )
            },
            color: {
                value: [ new THREE.Color('white'), new THREE.Color('green') ]
            },
            size: {
                value: 0.11
            },
            particleCount: 500,
            activeMultiplier: 1
        });
        particleGroup.addEmitter( emitter );
        particleGroup.mesh.position.y -= 1;
        scene.add( particleGroup.mesh );
        application.particleGroups.push(particleGroup);
    }
    if (true || URL_PARAMS.SPE) {
        initParticles();
    }


    addHands(avatar);


    (function () {
        var audioContext = application.audioContext;
        var source = audioContext.createBufferSource();
        var request = new XMLHttpRequest();
        var gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 0.5;
        request.open('GET', 'sounds/wind.ogg', true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            var audioData = request.response;
            audioContext.decodeAudioData( audioData ).then(function(buffer) {
                source.buffer = buffer;
                source.connect(gainNode);
                source.loop = true;
                source.start(0);
              });
        };
        request.send();
    })();


    var mousePointer = application.mousePointer;
    var rectMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1).translate(0.5, -0.5, 0), new THREE.MeshBasicMaterial({color: 0x0022ee, side: THREE.DoubleSide, transparent: true, opacity: 0.8}));
    avatar.add(rectMesh);
    rectMesh.visible = false;
    var drawingRect = false;
    window.addEventListener("mousemove", function (evt) {
        var dx = evt.movementX,
            dy = evt.movementY;
        mousePointer.position.x += 0.003*dx;
        mousePointer.position.x = Math.max(Math.min(mousePointer.position.x, 2.5), -2.5);
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
    window.addEventListener("mousedown", function (evt) {
        if (evt.buttons == 1) {
            drawingRect = true;
            mousePointer.visible = false;
            rectMesh.position.copy(mousePointer.position);
        }
    });
    window.addEventListener("mouseup", function (evt) {
        if (drawingRect) {
            drawingRect = false;
            var newMesh = rectMesh.clone();
            newMesh.position.copy(avatar.localToWorld(rectMesh.position));
            newMesh.quaternion.copy(avatar.quaternion);
            scene.add(newMesh);
            rectMesh.visible = false;
            mousePointer.visible = true;
        }
    });


    // window.addEventListener("wheel", function (evt) {
    // });

    // window.addEventListener("paste", function (evt) {
    // });


    // var editorMesh = application.makeEditor("python_editor", 1, 1, {tokenizer: Primrose.Text.Grammars.Python});
    // pyserver.readFile('test.py', function (text) {
    //     editorMesh.textBox.value = text;
    // });
    // scene.add(editorMesh);

	application.start();
}

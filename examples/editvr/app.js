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


    CrapLoader.load("examples/models/ConfigUtilDeskScene.json", function (object) {
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
                    value: THREE.ImageUtils.loadTexture('images/star.png')
                }
            });

            emitter = new SPE.Emitter({
                maxAge: {
                    value: 0.5
                },
                position: {
                    value: new THREE.Vector3(0, 0, 0),
                    spread: new THREE.Vector3( 0, 0, 0 )
                },
                acceleration: {
                    value: new THREE.Vector3(0, -7, 0),
                    spread: new THREE.Vector3( 5, 0, 5 )
                },
                velocity: {
                    value: new THREE.Vector3(0, 5, 0),
                    spread: new THREE.Vector3(5.5, 7.5/2, 5.5 )
                },
                color: {
                    value: [ new THREE.Color('white'), new THREE.Color('red') ]
                },
                size: {
                    value: 0.2
                },
                particleCount: 4000,
                activeMultiplier: 1
            });
            particleGroup.addEmitter( emitter );
            scene.add( particleGroup.mesh );
            application.particleGroups.push(particleGroup);
        }
    if (URL_PARAMS.SPE) {

        initParticles();

    }

    var mousePointer = new THREE.Mesh(new THREE.SphereBufferGeometry(0.03));
    mousePointer.position.z -= 3;
    avatar.add(mousePointer);
    window.addEventListener("mousemove", function (evt) {
        var dx = evt.movementX,
            dy = evt.movementY;
        mousePointer.position.x += 0.003*dx;
        mousePointer.position.y -= 0.003*dy;
    });


    addHands(scene);


    (function () {
        var audioContext = application.audioContext;
        var source = audioContext.createBufferSource();
        var request = new XMLHttpRequest();
        request.open('GET', 'sounds/wind.ogg', true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            var audioData = request.response;
            audioContext.decodeAudioData( audioData ).then(function(buffer) {
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.loop = true;
                source.start(0);
              });
        };
        request.send();
    })();

    // window.addEventListener("wheel", function (evt) {
    // });


    // window.addEventListener("paste", function (evt) {
    // });


    // window.addEventListener("mousedown", function (evt) {
    // });


    // window.addEventListener("mouseup", function (evt) {
    // });


    // var editorMesh = application.makeEditor("python_editor", 1, 1, {tokenizer: Primrose.Text.Grammars.Python});
    // pyserver.readFile('test.py', function (text) {
    //     editorMesh.textBox.value = text;
    // });
    // scene.add(editorMesh);

	application.start();
}

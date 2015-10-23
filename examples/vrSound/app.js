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
    application = new WebVRApplication("vrSound", avatar, scene, options);


	scene.add(avatar);
	avatar.add(application.camera);


    GFXTablet(scene);


    CrapLoader.load("examples/models/ConfigUtilDeskScene.json", function (object) {
        object.position.z = -2;
        object.position.y = -0.85;
        object.scale.set(0.01, 0.01, 0.01);
        scene.add(object);
    });


    var mousePointer = new THREE.Mesh(new THREE.SphereBufferGeometry(0.025));
    mousePointer.position.z -= 3;
    avatar.add(mousePointer);
    window.addEventListener("mousemove", function (evt) {
        var dx = evt.movementX,
            dy = evt.movementY;
        mousePointer.position.x += 0.0025*dx;
        mousePointer.position.y -= 0.0025*dy;
    });

    addHands(scene);

    var audioContext = application.audioContext;
    var source = audioContext.createBufferSource();
    var request = new XMLHttpRequest();
    request.open('GET', 'examples/vrSound/underwater.ogg', true);
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

    navigator.getUserMedia (
      // constraints - only audio needed for this app
      {
        audio: true
      },
      // Success callback
      function(stream) {
        source = audioContext.createMediaStreamSource(stream);
        source.connect(audioContext.destination);
        source.start(0);
      },
      // Error callback
      function(err) {
        console.log('The following gUM error occured: ' + err);
      }
    );

    // window.addEventListener("wheel", function (evt) {
    // });

    // window.addEventListener("mousedown", function (evt) {
    // });

    application.start();
}

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


    CrapLoader.load("models/ConfigUtilDeskScene.json", function (object) {
        object.position.z = -2;
        object.position.y = -0.85;
        object.scale.set(0.01, 0.01, 0.01);
        scene.add(object);
    });


    var audioContext = application.audioContext;
    var source;
    var gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.75;

    // var request = new XMLHttpRequest();
    // request.open('GET', 'examples/vrSound/underwater.ogg', true);
    // request.responseType = 'arraybuffer';
    // request.onload = function() {
    //     var audioData = request.response;
    //     source = audioContext.createBufferSource();
    //     audioContext.decodeAudioData( audioData ).then(function(buffer) {
    //         source.buffer = buffer;
    //         source.connect(gainNode);
    //         source.loop = true;
    //         source.start(0);
    //       });
    // };
    // request.send();

    navigator.getUserMedia (
      // constraints - only audio needed for this app
      {
        audio: true
      },
      // Success callback
      function(stream) {
        source = audioContext.createMediaStreamSource(stream);
        source.connect(gainNode);
      },
      // Error callback
      function(err) {
        console.log('The following gUM error occured: ' + err);
      }
    );

    application.start();
}

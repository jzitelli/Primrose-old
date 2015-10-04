/* global THREE, CrapLoader, JSON_SCENE, WebVRApplication */

var application;
var options = {};

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

    application = new WebVRApplication("WebVR studio", avatar, scene, options);
	GFXTablet(scene);
	scene.add(avatar);
	avatar.add(application.camera);

    CrapLoader.load("examples/models/ConfigUtilDeskScene.json", function (object) {
        object.position.z = -2;
        object.position.y = -0.85;
        scene.add(object);
    });

	application.start();

	console.log("starting WebVR studio...");
}

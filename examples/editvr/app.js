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

    window.addEventListener("mousemove", function (evt) {
        var dx = evt.movementX,
            dy = evt.movementY;
    });

    // window.addEventListener("wheel", function (evt) {
    // });

    // window.addEventListener("paste", function (evt) {
    // });

    // window.addEventListener("mousedown", function (evt) {
    // });

    // window.addEventListener("mouseup", function (evt) {
    // });

    addHands(scene);

    // var editorMesh = application.makeEditor("python_editor", 1, 1, {tokenizer: Primrose.Text.Grammars.Python});
    // pyserver.readFile('test.py', function (text) {
    //     editorMesh.textBox.value = text;
    // });
    // scene.add(editorMesh);

	application.start();
}

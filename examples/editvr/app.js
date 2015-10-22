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

    function initParticles() {
        particleGroup = new SPE.Group({
            texture: THREE.ImageUtils.loadTexture('images/star.png'),
            maxAge: 2,
            blending: THREE.AdditiveBlending,
            maxParticleCount: 1000
        });

        emitter = new SPE.Emitter({
            positionSpread: new THREE.Vector3(100, 100, 100),
            acceleration: new THREE.Vector3(0, 0, 10),
            velocity: new THREE.Vector3(0, 0, 10),
            colorStart: new THREE.Color('white'),
            colorEnd: new THREE.Color('white'),
            sizeStart: 2,
            sizeEnd: 2,
            opacityStart: 0,
            opacityMiddle: 1,
            opacityEnd: 0,
            particleCount: 100
        });

        particleGroup.addEmitter( emitter );
        scene.add( particleGroup.mesh );
        application.particleGroups.push(particleGroup);
    }
    // TODO: investigate
    // initParticles();


    var mousePointer = new THREE.Mesh(new THREE.SphereBufferGeometry(0.03));
    mousePointer.position.z -= 3;
    avatar.add(mousePointer);
    window.addEventListener("mousemove", function (evt) {
        var dx = evt.movementX,
            dy = evt.movementY;
        mousePointer.position.x += 0.003*dx;
        mousePointer.position.y -= 0.003*dy;
    });


    // addHands(scene);


    var particleGroup,
        emitter;


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

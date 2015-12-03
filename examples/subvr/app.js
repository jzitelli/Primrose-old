/* global WebVRApplication, CrapLoader, THREE, CANNON, URL_PARAMS, JSON_SCENE, SPE, shootCube */

var application;
var avatarModel = "models/pod_01.dae";
var avatar = new THREE.Object3D();
var options = {
    backgroundColor: 0x000121,
    moveSpeed: 2.5,
    vrPitching: true,
    showMousePointerOnLock: true
};
options.keyboardCommands = {
    pitchUp: {buttons: [Primrose.Input.Keyboard.UPARROW]},
    pitchDown: {buttons: [-Primrose.Input.Keyboard.DOWNARROW]},
    shootCube: {buttons: [Primrose.Input.Keyboard.SPACEBAR],
                commandDown: shootCube, dt: 0.2}
};
options.gamepadCommands = {
    shootCube: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightTrigger],
                commandDown: shootCube, dt: 0.2}
};

function onLoad() {
    "use strict";
    var scene;
    if (JSON_SCENE) {
        scene = CrapLoader.parse(JSON_SCENE);
        scene.children.forEach(function (c) { c.visible = false; });
    } else {
        scene = new THREE.Scene();
    }
    scene.fog = new THREE.FogExp2(options.backgroundColor, 0.08, 15, 800);

    application = new WebVRApplication("subvr", avatar, scene, options);
    application.mousePointer.position.z = -0.6;

    CrapLoader.load(avatarModel, function(loaded) {
        loaded.traverse(function(obj) {
            if (obj instanceof THREE.Mesh) {
                var mesh = obj;
                mesh.castShadow = true;
                mesh.receiveShadow = false;
                if (mesh.material instanceof THREE.MeshFaceMaterial) {
                    mesh.material.materials.forEach(function(e) {
                        e.shading = THREE.FlatShading;
                        e.needsUpdate = true;
                    });
                }
                avatar.add(mesh);
                if (avatar.boundingMesh) {
                    if (avatar.boundingMesh.geometry.boundingSphere.radius < mesh.geometry.boundingSphere.radius) {
                        avatar.boundingMesh = mesh;
                    }
                } else {
                    avatar.boundingMesh = mesh;
                }
                mesh.visible = false;
            }
        });

        avatar.position.y += 2;
        avatar.add(application.camera);
        application.scene.add(avatar);

        // can't deal with general collada models atm, also maybe better to simplify avatar physics to sphere
        avatar.body = new CANNON.Body({mass: 1,
            shape: new CANNON.Sphere(avatar.boundingMesh.geometry.boundingSphere.radius)});
        avatar.body.position.copy(avatar.position);
        application.world.addBody(avatar.body);
        avatar.body.mesh = avatar;

        // TODO:
        //addHands(avatar);

        // var particleGroup,
        //     emitter;
        // function initParticles() {
        //     particleGroup = new SPE.Group({
        //         texture: {value: THREE.ImageUtils.loadTexture('images/bubble4.png')},
        //         maxParticleCount: 1000
        //     });
        //     emitter = new SPE.Emitter({
        //         maxAge: {value: 8, spread: 1},
        //         position: {value: new THREE.Vector3(0, 0, 0), spread: new THREE.Vector3( 10, 0.5, 10 )},
        //         acceleration: {value: new THREE.Vector3(0, 0.04, 0), spread: new THREE.Vector3( 0.01, 0.002, 0.01 )},
        //         velocity: {value: new THREE.Vector3(0, 2, 0), spread: new THREE.Vector3(1.0, 4.5/2, 1.0 )},
        //         color: {value: [ new THREE.Color('white'), new THREE.Color('green') ]},
        //         size: {value: 0.11},
        //         particleCount: 1000,
        //         activeMultiplier: 1
        //     });
        //     particleGroup.addEmitter( emitter );
        //     particleGroup.mesh.position.y -= 1;
        //     scene.add( particleGroup.mesh );
        //     application.addEventListener("update", particleGroup.tick);
        // }
        // initParticles();
        bubbleParticles();

        application.gainNode.value = 0.5;
        application.playSound("sounds/underwater.ogg", true);

        var mousePointer = application.mousePointer;
        window.addEventListener("mousemove", function (evt) {
            var dx = evt.movementX,
                dy = evt.movementY;
            if (mousePointer.visible) {
                mousePointer.position.x += 0.001*dx;
                mousePointer.position.x = Math.max(Math.min(mousePointer.position.x, 0.7), -0.7);
                mousePointer.position.y -= 0.001*dy;
                mousePointer.position.y = Math.max(Math.min(mousePointer.position.y, 0.5), -0.5);
            }
        });
        window.addEventListener("mousedown", function (evt) {
            if (mousePointer.visible && application.picked && application.picked.userData.onClick) {
                application.picked.userData.onClick();
            }
        });

        var menu = setupMenu();
        avatar.add(menu);

        application.setPicking(true, menu.children.slice(1));

        //CubeSnake(new THREE.Vector3(14+15, 2, -9));
        CubeSnake(new THREE.Vector3(17+15, 0, -12));
        CubeSnake(new THREE.Vector3(21+15, 4, -4));
        CubeSnake(new THREE.Vector3(25+15, 6, -2));
        CubeSnake(new THREE.Vector3(59+15, 3, -10));
        //CubeSnake(new THREE.Vector3(66+15, 0, -2.5));

        application.start();
    });

}

function setupMenu() {
    "use strict";
    var textGeometryOptions = {
        size: 0.09,
        height: 0,
        font: 'anonymous pro',
        weight: 'normal',
        curveSegments: 2
    };
    var menu = new THREE.Object3D();
    menu.position.y -= 0.1;
    menu.position.z -= 0.7;
    var menuMaterial = new THREE.MeshBasicMaterial({color: 0x69f556});
    var menuMesh;
    menuMesh = new THREE.Mesh(
        new THREE.TextGeometry("SUBVR", {size: 0.14, height: 0, font: 'anonymous pro', weight: 'normal', curveSegments: 3}),
        menuMaterial);
    menuMesh.position.x = -0.555;
    menuMesh.position.y = 0.331;
    menu.add(menuMesh);
    menuMesh = new THREE.Mesh(new THREE.TextGeometry("START", textGeometryOptions), menuMaterial.clone());
    menuMesh.userData = {onClick: function () {
        application.scene.traverse(function (obj) { obj.visible = true; });
        menu.visible = false;
        application.setPicking(false);
        application.mousePointer.visible = false;
    }};
    menuMesh.position.x = 0.0808;
    menuMesh.position.y = 0.333 - 0.15;
    menu.add(menuMesh);
    menuMesh = new THREE.Mesh(new THREE.TextGeometry("OPTIONS", textGeometryOptions), menuMaterial.clone());
    menuMesh.position.x = 0.0808;
    menuMesh.position.y = 0.333 - 0.15 - 0.09 * 1.23;
    menu.add(menuMesh);
    // menuMesh = new THREE.Mesh(new THREE.TextGeometry("PLAYBACK", textGeometryOptions), menuMaterial.clone());
    // menuMesh.position.x = 0.0808;
    // menuMesh.position.y = 0.333 - 0.15 - 2 * 0.09 * 1.23;
    // menu.add(menuMesh);
    return menu;
}

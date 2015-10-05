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
    application = new WebVRApplication("WebVR Studio", avatar, scene, options);
	
	scene.add(avatar);
	avatar.add(application.camera);
    
    GFXTablet(scene);

    CrapLoader.load("examples/models/ConfigUtilDeskScene.json", function (object) {
        object.position.z = -2;
        object.position.y = -0.85;
        scene.add(object);
    });

    addHands(scene);

    var sphere = scene.getObjectByName("sphere");
    if (sphere) {
        // var path = "examples/WebVRStudio/Park2/";
        // var format = '.jpg';
        // var urls = [
        //         path + 'posx' + format, path + 'negx' + format,
        //         path + 'posy' + format, path + 'negy' + format,
        //         path + 'posz' + format, path + 'negz' + format
        //     ];
        // var textureCube = THREE.ImageUtils.loadTextureCube( urls );
        // textureCube.format = THREE.RGBFormat;
        // sphere.material.uniforms.tCube.value = textureCube;
        // // Skybox
        // var shader = THREE.ShaderLib[ "cube" ];
        // shader.uniforms[ "tCube" ].value = textureCube;
        // var material = new THREE.ShaderMaterial( {
        //     fragmentShader: shader.fragmentShader,
        //     vertexShader: shader.vertexShader,
        //     uniforms: shader.uniforms,
        //     side: THREE.BackSide
        // } );
        // var mesh = new THREE.Mesh( new THREE.BoxGeometry( 666, 666, 666 ), material );
        // scene.add( mesh );
    }

	application.start();
}

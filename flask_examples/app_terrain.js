var worldWidth = 256,
    worldDepth = 256,
    worldHalfWidth = worldWidth / 2,
    worldHalfDepth = worldDepth / 2;

var clock = new THREE.Clock();

function generateHeight(width, height) {
    var size = width * height,
        data = new Uint8Array(size),
        perlin = new ImprovedNoise(),
        quality = 1,
        z = Math.random() * 100;
    for (var j = 0; j < 4; j++) {
        for (var i = 0; i < size; i++) {
            var x = i % width,
                y = ~~ (i / width);
            data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75);
        }
        quality *= 5;
    }
    return data;
}

function generateTexture(data, width, height) {
    var canvas, canvasScaled, context, image, imageData,
        level, diff, vector3, sun, shade;
    vector3 = new THREE.Vector3(0, 0, 0);
    sun = new THREE.Vector3(1, 1, 1);
    sun.normalize();
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    context = canvas.getContext('2d');
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    image = context.getImageData(0, 0, canvas.width, canvas.height);
    imageData = image.data;
    for (var i = 0, j = 0, l = imageData.length; i < l; i += 4, j++) {
        vector3.x = data[j - 2] - data[j + 2];
        vector3.y = 2;
        vector3.z = data[j - width * 2] - data[j + width * 2];
        vector3.normalize();
        shade = vector3.dot(sun);
        imageData[i] = (96 + shade * 128) * (0.5 + data[j] * 0.007);
        imageData[i + 1] = (32 + shade * 96) * (0.5 + data[j] * 0.007);
        imageData[i + 2] = (shade * 96) * (0.5 + data[j] * 0.007);
    }
    context.putImageData(image, 0, 0);

    var scale = 4;
    canvasScaled = document.createElement('canvas');
    canvasScaled.width = width * scale;
    canvasScaled.height = height * scale;
    context = canvasScaled.getContext('2d');
    context.scale(scale, scale);
    context.drawImage(canvas, 0, 0);
    image = context.getImageData(0, 0, canvasScaled.width, canvasScaled.height);
    imageData = image.data;
    for (var i = 0, l = imageData.length; i < l; i += 4) {
        var v = ~~ (Math.random() * 5);
        imageData[i] += v;
        imageData[i + 1] += v;
        imageData[i + 2] += v;
    }
    context.putImageData(image, 0, 0);
    return canvasScaled;
}

var data = generateHeight(worldWidth, worldDepth);
var geometry = new THREE.PlaneBufferGeometry(7500, 7500, worldWidth - 1, worldDepth - 1);
geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
var vertices = geometry.attributes.position.array;
for (var i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
    vertices[j + 1] = data[i];
}

var texture = new THREE.Texture(generateTexture(data, worldWidth, worldDepth), THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping);
texture.needsUpdate = true;
var terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({
        side: THREE.DoubleSide,
        color: 0x112244
    }));
    // new THREE.MeshLambertMaterial({
    //     side: THREE.DoubleSide,
    //     map: texture
    // }));
geometry.computeBoundingBox();
var yScale = 10 / (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
terrain.scale.set(30 / (geometry.boundingBox.max.x - geometry.boundingBox.min.x),
    yScale,
    30 / (geometry.boundingBox.max.z - geometry.boundingBox.min.z));
geometry.computeBoundingBox();
terrain.position.y = 0; //10 + -0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);

geometry.computeFaceNormals();
geometry.computeVertexNormals();







var sceneModel = $.QueryString['sceneModel'] || "flask_examples/models/scene2.json";


var skyBoxTexture = $.QueryString['skyBoxTexture'] || "flask_examples/images/pana1.jpg";
var skyBoxPosition = qd['skyBoxPosition'];
if (skyBoxPosition) {
    skyBoxPosition = skyBoxPosition.map(
        function(item) {
            return parseFloat(item);
        }
    );
} else {
    skyBoxPosition = [0, 0, 0];
}
var skyBox = textured(
    shell(200, 12, 7, Math.PI * 2, Math.PI / 1.666),
    skyBoxTexture, true);


var floorLength = $.QueryString['floorLength'];
var floorWidth = $.QueryString['floorWidth'];
var floorTexture = $.QueryString['floorTexture'];
var floorTextureST = qd['floorTextureST'];
if (floorTextureST) {
    floorTextureST = floorTextureST.map(
        function(item) {
            return parseFloat(item);
        }
    );
} else if (!floorTexture) {
    floorTexture = 'examples/models/holodeck.png';
    floorTextureST = [floorLength, floorWidth];
} else {
    floorTextureST = [1, 1];
}
var floorPosition = qd['floorPosition'];
if (floorPosition) {
    floorPosition = floorPosition.map(
        function(item) {
            return parseFloat(item);
        }
    );
} else {
    floorPosition = [0, 0.25, 0];
}
var floor;
if (floorLength || floorWidth) {
    floor = textured(
        quad(floorLength || 1, floorWidth || 1),
        floorTexture, false, 1, floorTextureST[0], floorTextureST[1]);
    floor.rotation.set(Math.PI / 2, 0, 0); //x = Math.PI / 2;
    floor.position.set(floorPosition[0], floorPosition[1], floorPosition[2]);
}

var gridX = $.QueryString['gridX'] || 0;
var gridY = $.QueryString['gridY'] || 0;
var gridZ = $.QueryString['gridZ'] || 0;

var backgroundSound = $.QueryString['backgroundSound'];





TerrainApplication = (function() {

    function TerrainApplication(name, sceneModel, buttonModel, buttonOptions,
        avatarHeight, walkSpeed, options) {
        Primrose.VRApplication.call(this, name, sceneModel, buttonModel, buttonOptions,
            avatarHeight, walkSpeed, options);

        this.pointer = textured(sphere(0.01, 4, 2), 0xff0000, true);

        function waitForResources(t) {
            this.lt = t;
            if (this.camera && this.scene && this.currentUser &&
                this.buttonFactory.template) {

                this.setSize( );
                this.animate = this.animate.bind( this );

                if (this.skyBox) {
                  this.scene.add(this.skyBox);
                }
                if (this.floor) {
                  this.scene.add(this.floor);
                }
                if (this.options.terrain) {
                    this.scene.add(this.options.terrain);
                }

                if (this.options.editors) {
                    for (var i = 0; i < this.options.editors.length; ++i) {
                        var editorConfig = this.options.editors[i];
                        makeEditor(this.scene, this.pickingScene,
                            editorConfig.id,
                            editorConfig.w, editorConfig.h,
                            editorConfig.x, editorConfig.y, editorConfig.z,
                            editorConfig.rx, editorConfig.ry, editorConfig.rz,
                            editorConfig.options);
                    }
                }

                this.fire("ready");
                requestAnimationFrame(this.animate);
            } else {
                requestAnimationFrame(waitForResources.bind(this));
            }
        }

        this.start = function() {
            requestAnimationFrame(waitForResources.bind(this));
        }
    }

    inherit(TerrainApplication, Primrose.VRApplication);

    return TerrainApplication;
})();


/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */

var DEBUG_VR = false;

function StartDemo() {
    "use strict";
    var application = new TerrainApplication(
        "Terrain App",
        sceneModel,
        "flask_examples/models/button.json", {
            maxThrow: 0.1,
            minDeflection: 10,
            colorUnpressed: 0x7f0000,
            colorPressed: 0x007f00,
            toggle: true
        },
        3, 1.1, {
            backgroundColor: 0x5fafbf,
            gravity: 0,
            drawDistance: 1000,
            dtNetworkUpdate: 10,
            skyBox: skyBox,
            skyBoxPosition: skyBoxPosition,
            floor: floor,
            terrain: terrain,
            editors: [{
                id: 'editor0',
                w: 2,
                h: 2,
                x: 0,
                y: 4,
                z: 0,
                rx: 0,
                ry: 0,
                rz: 0,
                options: {
                    file: "editor 0 initial contents"
                }
            }, {
                id: 'editor1',
                w: 2,
                h: 2,
                x: -8,
                y: 4,
                z: 0,
                rx: 0,
                ry: 0,
                rz: 0,
                options: {
                    file: "editor 1 ishithshtishtistnitial contents"
                },
                hudx: 0,
                hudy: 0,
                hudz: 2
            }]
        }
    );

    var btns = [];
    application.addEventListener("ready", function() {
        for (var i = 0; i < 5; ++i) {
            btns.push(application.makeButton());
            btns[i].moveBy((i - 2) * 2, 0, -2);
        }
    });

    var t = 0;
    application.addEventListener("update", function(dt) {
        t += dt;
    });


    var audio3d = new Primrose.Output.Audio3D();

    function playSound(buffer, time) {
        var source = audio3d.context.createBufferSource();
        source.buffer = buffer;
        source.connect(audio3d.context.destination);
        source[source.start ? 'start' : 'noteOn'](time);
    }

    if (backgroundSound) {
        audio3d.loadBuffer(
            backgroundSound,
            null,
            function(buffer) {
                playSound(buffer, 0);
            }
        );
    }

    application.start();
}
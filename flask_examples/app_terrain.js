var DEBUG_APP = $.QueryString['debug']; //1;

var sceneModel = $.QueryString['sceneModel'] || "flask_examples/models/scene2.json";

var skyBoxTexture = $.QueryString['skyBoxTexture'] || "flask_examples/images/axes_1_b.png";
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
    shell(70, 12, 7, Math.PI * 2, Math.PI / 1.666),
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


/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */
var DEBUG_VR = false;

function StartDemo() {
    "use strict";
    var application = new TerrainApplication(
        "Terrain Demo",
        sceneModel,
        "flask_examples/models/button.json", {
            maxThrow: 0.1,
            minDeflection: 10,
            colorUnpressed: 0x7f0000,
            colorPressed: 0x007f00,
            toggle: true
        },
        3, 1.1, {
            fog: new THREE.Fog(0x00ff00),
            backgroundColor: 0x5fafbf,
            gravity: 0.08,
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
                y: 8,
                z: -3,
                rx: 0,
                ry: 0,
                rz: 0,
                options: {
                    file: "",
                    filename: "editor0.js"
                },
                scale: 3
            }, {
                id: 'editor1',
                w: 2,
                h: 2,
                x: -8,
                y: 4,
                z: 0,
                rx: 0,
                ry: Math.PI / 4,
                rz: 0,
                options: {
                    file: "",
                    filename: "editor1.py"
                },
                scale: 2,
                hudx: -4,
                hudy: 0.5,
                hudz: -2
            }, {
                id: 'editor2',
                w: 2,
                h: 2,
                x: 8,
                y: 4,
                z: 0,
                rx: 0,
                ry: -Math.PI / 4,
                rz: 0,
                scale: 2,
                options: {
                    file: "// Q: toggle HUD\n// P: reset position\n// F: focus nearest editor\n// R: VR recenter"
                },
                hudx: 4,
                hudy: 0.5,
                hudz: -2
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
    if (DEBUG_APP) {
        $("#main").hide();
    }
}


var worldWidth = 512,
    worldDepth = 512,
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

//var texture = new THREE.Texture(generateTexture(data, worldWidth, worldDepth), THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping);
//texture.needsUpdate = true;
var terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({
        side: THREE.DoubleSide,
        color: 0x112288
    }));
// new THREE.MeshLambertMaterial({
//     side: THREE.DoubleSide,
//     map: texture
// }));
geometry.computeBoundingBox();
var yScale = 7 / (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
terrain.scale.set(30 / (geometry.boundingBox.max.x - geometry.boundingBox.min.x),
    yScale,
    30 / (geometry.boundingBox.max.z - geometry.boundingBox.min.z));
geometry.computeBoundingBox();
terrain.position.y = 0; //10 + -0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);

geometry.computeFaceNormals();
geometry.computeVertexNormals();





var TerrainApplication = (function() {
    var logMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide
    });
    var scene;
    var camera;
    var hudGroup;

    var log_msgs = [];
    var log_meshes = [];
    var log_displayed = [];
    var buffsize = 10;

    function log(msg) {
        var mesh;
        var size = 0.5;
        log_msgs.push(msg);
        if (log_msgs.slice(0, -1).indexOf(msg) > -1) {
            mesh = log_meshes[log_msgs.indexOf(msg)].clone();
        } else {
            var height = 0.0; //height || size / 17;
            var font = 'janda manatee solid';
            var weight = 'normal';
            var options = {
                size: size,
                height: height,
                font: font,
                weight: weight,
                curveSegments: 3
            };
            var geometry = new THREE.TextGeometry(msg, options);
            mesh = new THREE.Mesh(geometry, logMaterial);
        }
        log_meshes.push(mesh);
        //hudGroup.add(mesh);
        log_displayed.push(mesh);
        scene.add(mesh);
        if (log_displayed.length > buffsize) {
            scene.remove(log_displayed.shift());
        }
        for (var i = 0; i < log_displayed.length; ++i) {
            mesh = log_displayed[i];
            mesh.position.x = camera.position.x - 10.0;
            mesh.position.z = camera.position.z - 10.0;
            mesh.position.y = 10 + (log_displayed.length - i - 1) * 1.75 * size;
        }
    }

    function TerrainApplication(name, sceneModel, buttonModel, buttonOptions,
        avatarHeight, walkSpeed, options) {
        Primrose.VRApplication.call(this, name, sceneModel, buttonModel, buttonOptions,
            avatarHeight, walkSpeed, options);

        var pointerX, pointerY;
        // do more things...
        this.setPointer = function (x, y) {
            pointerX = x;
            pointerY = ctrls.output.height - y;
            mouse.set(2 * (x / ctrls.output.width) - 1, -2 * (y /
                ctrls.output.height) + 1);
            raycaster.setFromCamera(mouse, camera);
            currentObject = null;
            currentEditor = null;
            var objects = raycaster.intersectObject(scene, true);
            var firstObj = objects.length > 0 && objects[0].object;
            if (firstObj === sky || firstObj === floor) {
                pointer.position.copy(raycaster.ray.direction);
                pointer.position.multiplyScalar(3);
                pointer.position.add(raycaster.ray.origin);
            } else {
                for (var i = 0; i < objects.length; ++i) {
                    var obj = objects[i];
                    if (obj.object !== pointer) {
                        try {
                            pointer.position.set(0, 0, 0);
                            pointer.lookAt(obj.face.normal);
                            pointer.position.copy(obj.point);
                            currentObject = obj.object;
                            for (var j = 0; j < editor_geoms.length; ++j) {
                                if (currentObject === editor_geoms[j]) {
                                    currentEditor = editors[j];
                                    break;
                                }
                            }
                            break;
                        } catch (exp) {}
                    }
                }
            }
        }

        function waitForResources(t) {
            this.lt = t;
            if (this.camera && this.scene && this.currentUser &&
                this.buttonFactory.template) {
                this.setSize();

                if (this.passthrough) {
                    this.camera.add(this.passthrough.mesh);
                }

                scene = this.scene;
                camera = this.camera;
                hudGroup = this.hudGroup;

                log("Instructions:");
                log("P: reset position");
                log("Alt + N: focus next editor");
                log("Alt + Q: toggle HUD");

                this.animate = this.animate.bind(this);

                if (this.floor) {
                    this.scene.add(this.floor);
                }
                if (this.pointer) {
                    this.scene.add(this.pointer);
                }
                if (this.skyBox) {
                    this.scene.add(this.skyBox);
                }
                if (this.terrain) {
                    this.scene.add(this.terrain);
                }
                if (this.pointer) {
                    this.scene.add(this.pointer);
                }
                if (this.hudGroup) {
                    this.scene.add(this.hudGroup);
                }

                if (this.options.editors) {
                    for (var i = 0; i < this.options.editors.length; ++i) {
                        var editorConfig = this.options.editors[i];
                        editorConfig.options = editorConfig.options || {};
                        editorConfig.options.autoBindEvents = true;
                        //editorConfig.options.keyEventSource = window;
                        var mesh = makeEditor(this.scene, this.pickingScene,
                            editorConfig.id,
                            editorConfig.w, editorConfig.h,
                            editorConfig.x, editorConfig.y, editorConfig.z,
                            editorConfig.rx, editorConfig.ry, editorConfig.rz,
                            editorConfig.options);
                        if (editorConfig.scale) {
                            mesh.scale.x *= editorConfig.scale;
                            mesh.scale.y *= editorConfig.scale;
                            mesh.scale.z *= editorConfig.scale;
                        }
                        var editor = mesh.editor;
                        this.currentEditor = editor;
                        if (editorConfig.options.filename) {
                            $.ajax({
                                url: "/read?filename=" + editorConfig.options.filename
                            }).
                            done(function(data) {
                                console.log("loaded " + data.args.filename);
                                this.value = '' + data.value;
                            }.bind(editor)).
                            fail(function() {
                                console.log("problem!!!");
                            });
                        }

                        this.editors.push(mesh.editor);
                        if (editorConfig.hudx || editorConfig.hudy || editorConfig.hudz) {
                            var hudMesh = mesh.clone();
                            hudMesh.position.set(
                                editorConfig.hudx || 0,
                                editorConfig.hudy || 0,
                                editorConfig.hudz || 0
                            );
                            this.hudGroup.add(hudMesh);
                            this.hudEditors.push(mesh.editor);
                        }
                        this.currentEditor = mesh.editor;
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
        };
    }
    inherit(TerrainApplication, Primrose.VRApplication);

    TerrainApplication.prototype.evalEditor = function() {
        if (this.currentEditor) {
            this.currentEditor.blur();
            console.log("editor contents to eval:");
            console.log(this.currentEditor.getLines().join(''));
            try {
                console.log("trying javascript eval...");
                eval(this.currentEditor.getLines().join(''));
            } catch (exp) {
                console.log("caught javascript exception:");
                console.log(exp.message);
                console.log("trying python exec...");
                $.ajax({
                    url: '/python_eval?pystr=' + this.currentEditor.getLines().join('%0A')
                })
                    .done(function(data) {
                        var lines = data.out.split('\n');
                        for (var i = 0; i < lines.length; ++i) {
                            console.log(lines[i]);
                        }
                        console.log("");
                        console.log("python returned:");
                        console.log(data.value);
                    })
                    .fail(function(jqXHR, textStatus) {
                        console.log(textStatus);
                    });
            }
        }
    };

  TerrainApplication.prototype.enterFreeMode = function () {
    if (this.currentEditor) {
      this.currentEditor.blur();
    }
    // for (var i = 0; i < this.editors.length; ++i) {
    // }
  };

  TerrainApplication.prototype.focusNearestEditor = function () {
    if (this.currentEditor) {
      if (this.currentEditor.focused) {
        this.currentEditor.blur();
      } else {
        this.currentEditor.focus();
        this.currentUser.velocity.set(0,0,0);
      }
    }
    // for (var i = 0; i < this.editors.length; ++i) {
    // }
  };

  TerrainApplication.prototype.focusNextEditor = function () {
    if (this.currentEditor) {
      this.currentEditor.blur();
    }
    for (var i = 0; i < this.editors.length; ++i) {
      var editor = this.editors[i];
      if (editor === this.currentEditor) {
        if (i === this.editors.length - 1) {
          this.currentEditor = this.editors[0];
        } else {
          this.currentEditor = this.editors[i+1];
        }
        break;
      }
    }
    this.focusNearestEditor();
    // this.currentEditor.focus();
  };

  return TerrainApplication;
})();
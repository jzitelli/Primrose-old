/* global THREE, CANNON */

var CrapLoader = ( function () {

    var manager = THREE.DefaultLoadingManager;

    var colladaLoader = new THREE.ColladaLoader(manager),
        objectLoader = new THREE.ObjectLoader(manager),
        imageLoader = new THREE.ImageLoader(manager);

    colladaLoader.setPreferredShading(THREE.FlatShading);

    function load(url, success, onProgress, onError) {

        if (url.endsWith(".json")) {
            objectLoader.load(url, onLoad, onProgress, onError);
        } else
        if (url.endsWith(".dae")) {
            colladaLoader.load(url, function (loaded) {
                onLoad(loaded.scene);
            }, onProgress, onError);
        }

        function onLoad(obj) {
            obj.traverse( function (node) {
                if (node instanceof THREE.Mesh) {
                    node.geometry.computeBoundingSphere();
                    node.geometry.computeBoundingBox();
                }
            });
            loadHeightfields(obj);
            if (success) {
                success(obj);
            }
        }

    }

    function parse(json, success) {
        if (json.materials) {
            json.materials.forEach( function (mat) {
                if (mat.type === "ShaderMaterial" && mat.uniforms) {
                    var uniforms = mat.uniforms;
                    for (var key in uniforms) {
                        var uniform = uniforms[key];
                        if (uniform.type === 't') {
                            if (Array.isArray(uniform.value) && uniform.value.length == 6) {
                                // texture cube specified by urls
                                uniform.value = THREE.ImageUtils.loadTextureCube(uniform.value);
                            } else
                            if (typeof uniform.value === 'string') {
                                // single texture specified by url
                                uniform.value = THREE.ImageUtils.loadTexture(uniform.value);
                            }
                        }
                    }
                }
            });
        }
        return objectLoader.parse(json, function (obj) {
            obj.traverse( function (node) {
                if (node instanceof THREE.Mesh) {
                    node.geometry.computeBoundingSphere();
                    node.geometry.computeBoundingBox();
                }
            });
            loadHeightfields(obj);
            if (success) {
                success(obj);
            }
        });

    }

    function loadHeightfields(obj) {

        function getPixel(imagedata, x, y) {
            var position = (x + imagedata.width * y) * 4,
                data = imagedata.data;
            return {
                r: data[position],
                g: data[position + 1],
                b: data[position + 2],
                a: data[position + 3]
            };
        }

        obj.traverse( function (node) {

            if (node.userData && node.userData.heightmap) {
                imageLoader.load(node.userData.heightmap, function(image) {

                    var canvas = document.createElement('canvas');
                    canvas.width = image.width;
                    canvas.height = image.height;
                    var context = canvas.getContext('2d');
                    context.drawImage(image, 0, 0);
                    var imageData = context.getImageData(0, 0, image.width, image.height);
                    var attribute = node.geometry.getAttribute('position');
                    var gridX1 = node.geometry.parameters.widthSegments + 1;
                    var gridY1 = node.geometry.parameters.heightSegments + 1;
                    if (gridX1 != gridY1 || imageData.width != imageData.height) {
                        alert("heightmap: currently only square images are supported");
                    }
                    if (gridX1 != imageData.width) {
                        alert("heightmap: widthSegments + 1 != image width");
                    }
                    var i = 0;
                    for (var iy = 0; iy < gridY1; ++iy) {
                        for (var ix = 0; ix < gridX1; ++ix) {
                            var pixel = getPixel(imageData, ix, iy);
                            attribute.setZ(i++, 0.01 * (pixel.r + pixel.g + pixel.b));
                        }
                    }
                    attribute.needsUpdate = true;
                    node.geometry.computeFaceNormals();
                    node.geometry.computeVertexNormals();
                    node.geometry.normalsNeedUpdate = true;
                    node.geometry.computeBoundingSphere();
                    node.geometry.computeBoundingBox();

                });
            }

        });

    }

    function CANNONize(obj, world) {
        obj.traverse(function(node) {
            if (node.userData && node.userData.cannonData) {
                var body = makeCANNON(node, node.userData.cannonData);
                if (world) {
                    world.addBody(body);
                }
            }
        });

        function makeCANNON(node, cannonData) {
            if (node.physics) {
                return node.physics;
            }
            var body = new CANNON.Body({
                mass: cannonData.mass,
                position: node.position,
                quaternion: node.quaternion
            });
            body.graphics = node;
            cannonData.shapes.forEach(function(e, i, a) {
                var shape,
                    position,
                    quaternion;
                switch (e) {
                    case 'Plane':
                        shape = new CANNON.Plane();
                        quaternion = new CANNON.Quaternion();
                        quaternion.setFromEuler(-Math.PI / 2, 0, 0, 'XYZ');
                        break;
                    case 'Box':
                        var halfExtents = new CANNON.Vec3();
                        halfExtents.x = (node.geometry.boundingBox.max.x - node.geometry.boundingBox.min.x) / 2;
                        halfExtents.y = (node.geometry.boundingBox.max.y - node.geometry.boundingBox.min.y) / 2;
                        halfExtents.z = (node.geometry.boundingBox.max.z - node.geometry.boundingBox.min.z) / 2;
                        shape = new CANNON.Box(halfExtents);
                        break;
                    case 'Sphere':
                        shape = new CANNON.Sphere(node.geometry.boundingSphere.radius);
                        break;
                    case 'ConvexPolyhedron':
                        var vertices = [];
                        var array = node.geometry.getAttribute('position').array;
                        for (var i = 0; i < array.length; i += 3) {
                            vertices.push(new CANNON.Vec3(array[i], array[i + 1], array[i + 2]));
                        }
                        var faces = [];
                        array = node.geometry.getAttribute('index').array;
                        for (var i = 0; i < array.length; i += 3) {
                            // cannon wants use face.indexOf....
                            // var face = new Uint16Array(3);
                            var face = [0, 0, 0];
                            face[0] = array[i];
                            face[1] = array[i + 1];
                            face[2] = array[i + 2];
                            faces.push(face);
                        }
                        shape = new CANNON.ConvexPolyhedron(vertices, faces);
                        break;
                    case 'Heightfield':
                        var array = node.geometry.getAttribute('position').array;
                        var gridX1 = node.geometry.parameters.widthSegments + 1;
                        var gridY1 = node.geometry.parameters.heightSegments + 1;
                        var dx = node.geometry.parameters.width / node.geometry.parameters.widthSegments;
                        var data = [];
                        for (var ix = 0; ix < gridX1; ++ix) {
                            data.push(new Float32Array(gridY1));
                            for (var iy = 0; iy < gridY1; ++iy) {
                                data[ix][iy] = array[3 * (gridX1 * (gridY1 - iy - 1) + ix) + 2];
                            }
                        }
                        shape = new CANNON.Heightfield(data, {
                            elementSize: dx
                        });
                        // center to match THREE.PlaneBufferGeometry:
                        position = new CANNON.Vec3();
                        position.x = -node.geometry.parameters.width / 2;
                        position.y = -node.geometry.parameters.height / 2;
                        break;
                    case 'Cylinder':
                        shape = new CANNON.Cylinder(node.geometry.parameters.radiusTop,
                            node.geometry.parameters.radiusBottom,
                            node.geometry.parameters.height,
                            node.geometry.parameters.radialSegments);
                        break;
                    default:
                        console.log("unknown shape type: " + e);
                        break;
                }
                body.addShape(shape, position, quaternion);
            });
            node.physics = body;
            return body;
        }
    }

    return {
        load: load,
        parse: parse,
        CANNONize: CANNONize
    };

} )();
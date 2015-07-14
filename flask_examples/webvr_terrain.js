function webvr_terrain() {
    var imageurl = $.QueryString['terrainImage'] ||
        'flask_examples/images/terrain128.png';

    function generateHeight(width, height) {
        var size = width * height,
            data = new Uint8Array(size),
            perlin = new ImprovedNoise(),
            quality = 1,
            z = Math.random() * 100;
        for (var j = 0; j < 4; j++) {
            for (var i = 0; i < size; i++) {
                var x = i % width,
                    y = ~~(i / width);
                data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75);
            }
            quality *= 5;
        }
        return data;
    }

    function generateHeightFromImage(url) {
        // TODO: stackexchange reference
        function getImageData(image) {
            var canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            var context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            return context.getImageData(0, 0, image.width, image.height);
        }

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

        var texture;
        if (url) {
            texture = THREE.ImageUtils.loadTexture(url, THREE.UVMapping, function(texture) {
                var imageData = getImageData(texture.image);
                var worldWidth = texture.image.width,
                    worldDepth = texture.image.height,
                    worldHalfWidth = worldWidth / 2,
                    worldHalfDepth = worldDepth / 2;
                var geometry = new THREE.PlaneBufferGeometry(7500, 7500, worldWidth - 1, worldDepth - 1);
                geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
                geometry.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI / 2));

                var vertices = geometry.attributes.position.array;
                var data = [];
                for (var i = 0, k = 0; i < texture.image.width; i++) {
                    data.push([]);
                    for (var j = 0; j < texture.image.height; ++j, k += 3) {
                        //vertices[k + 1] = getPixel(imageData, i, j).r + 256*getPixel(imageData, i, j).g + 256*256*getPixel(imageData, i, j).b;
                        vertices[k + 1] = getPixel(imageData, i, j).r + getPixel(imageData, i, j).g + getPixel(imageData, i, j).b;
                        data[i].push(vertices[k + 1]);
                    }
                }
                // var data = generateHeight(worldWidth, worldDepth);
                // for (var i = 0, k = 0; i < data.length; ++i, k += 3) {
                //     vertices[k + 1] = data[i];
                // }
                var color = SPE.utils.randomColor(new THREE.Color("#ffeebb"), new THREE.Vector3(3, 2, 1)).getHex(); //0xffffff;
                var material = new THREE.MeshLambertMaterial({
                    side: THREE.FrontSide,
                    color: color
                    //map: texture,
                });
                console.log("terrain color: " + color.toString(16));
                var terrain = new THREE.Mesh(geometry, material);
                terrain.receiveShadow = true;
                // terrain.castShadow = true;
                
                geometry.computeBoundingBox();
                var yScale = 10 / (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
                terrain.scale.set(30 / (geometry.boundingBox.max.x - geometry.boundingBox.min.x),
                    yScale,
                    30 / (geometry.boundingBox.max.z - geometry.boundingBox.min.z));
                terrain.position.y = -10;

                geometry.computeFaceNormals();
                geometry.computeVertexNormals();

                this.scene.add(terrain);

                for (var i = 0; i < data.length; i++) {
                    for (var j = 0; j < data[i].length; ++j) {
                        data[i][j] *= yScale;
                    }
                }
                var shape = new CANNON.Heightfield(data, {
                    elementSize: 30 / worldWidth
                });
                var quaternion = new CANNON.Quaternion();
                quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
                var body = new CANNON.Body({
                    mass: 0
                });
                body.addShape(shape, new CANNON.Vec3(-15, -10, 15), quaternion);
                this.world.add(body);
            }.bind(this));
        }
        return texture;
    }
    var texture = generateHeightFromImage.call(this, imageurl);
}
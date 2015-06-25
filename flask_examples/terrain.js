(function() {

    var worldWidth = 512,
        worldDepth = 512,
        worldHalfWidth = worldWidth / 2,
        worldHalfDepth = worldDepth / 2;

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

    var geometry = new THREE.PlaneBufferGeometry(7500, 7500, worldWidth - 1, worldDepth - 1);
    geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    var vertices = geometry.attributes.position.array;

    var imageData;

    function generateHeight(width, height) {
        var size = width * height;
        var texture = THREE.ImageUtils.loadTexture('flask_examples/images/terrain5.png', THREE.UVMapping,
            function(texture) {
                imageData = getImageData(texture.image);
                for (var i = 0, k = 0; i < texture.image.width; i++) {
                    for (var j = 0; j < texture.image.height; ++j, k += 3) {
                        vertices[k + 1] = getPixel(imageData, i, j).r + 256*getPixel(imageData, i, j).g + 256*256*getPixel(imageData, i, j).b;
                    }
                }
                var material = new THREE.MeshLambertMaterial({
                        side: THREE.DoubleSide,
                        color: 0xffffff,
                        map: texture
                    });

                var terrain = new THREE.Mesh(
                    geometry,
                    material);

                geometry.computeBoundingBox();
                var yScale = 7 / (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
                terrain.scale.set(30 / (geometry.boundingBox.max.x - geometry.boundingBox.min.x),
                    yScale,
                    30 / (geometry.boundingBox.max.z - geometry.boundingBox.min.z));
                terrain.position.y = 0;

                geometry.computeFaceNormals();
                geometry.computeVertexNormals();

                scene.add(new THREE.DirectionalLight(0xffffff, 1, 20, 3));

                scene.add(terrain);

                var shape = CANNON.Heightfield(imageData, {
                    elementSize: 30 / worldWidth
                });
                var body = CANNON.Body({mass: 0});
                body.addShape(shape);
                world.add(body);
            });
        return texture;
    }

    var texture = generateHeight(worldWidth, worldDepth);
})();

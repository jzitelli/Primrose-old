function renderUnderwater() {
	"use strict";
}

function renderInterior() {
	"use strict";
}

function renderWaterSurfaces() {
	"use strict";
}

var bubbleParticles = function(L, n) {
	"use strict";
    var geometry = new THREE.Geometry();
    var sprite = THREE.ImageUtils.loadTexture("images/bubble4.png");
    var colors = [];
    L = L || 25;
    n = n || 16000;
    for (var i = 0; i < n; i++) {
        var vertex = new THREE.Vector3();
        vertex.x = L * Math.random() - L / 2;
        vertex.y = L / 4 - (0.6 * L * (Math.random() * Math.random()));
        vertex.z = L * Math.random() - L / 2;
        geometry.vertices.push(vertex);
        colors[i] = new THREE.Color(0xffffff);
        colors[i].setHSL((vertex.x + L / 2) / L,
            1, //(vertex.y + L / 2) / L, // 1,
            0.75);
    }
    geometry.colors = colors;
    var material = new THREE.PointCloudMaterial({
        size: 0.13,
        map: sprite,
        vertexColors: THREE.VertexColors,
        //alphaTest: 0.5,
        transparent: true
    });
    //material.color.setHSL(1.0, 0.2, 0.7);
    var particles = new THREE.PointCloud(geometry, material);
    application.scene.add(particles);
    application.bubbles = particles;
    var clone = particles.clone();
    clone.position.y -= 15;
    particles.add(clone);
    application.addEventListener("update", function(dt) {
        particles.position.y += 0.4 * (1 + 0.2 * Math.random()) * dt;
        particles.position.x += 0.1666 * (0.5*0.5*0.5 - Math.random()*Math.random()*Math.random()) * dt;//particles.position.x += 0.3 * (0.25 - Math.random()*Math.random()) * dt;
        particles.position.z += 0.1666 * (0.5*0.5*0.5 - Math.random()*Math.random()*Math.random() +
            0.5 - Math.random()) * dt;
        if (particles.position.y > 15) {
            particles.position.y -= 15;
        }
    });
};

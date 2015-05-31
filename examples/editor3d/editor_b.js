var textgeom = new THREE.TextGeometry("Hello World!", {
  size: 1.0,
  height: 0.4,
  font: 'janda manatee solid',
  weight: 'normal',
  bevelThickness: 0.04,
  bevelSize: 0.04,
  bevelEnabled: true
});

var mesh = new THREE.Mesh(textgeom,
  new THREE.MeshLambertMaterial({color: 0xff2345,
      transparent: false,
      side: THREE.DoubleSide
    }));
mesh.position.x = body.position.x + 0.2;
mesh.position.y = 0.35;
mesh.position.z = body.position.z + 2;

scene.add(mesh);

$.ajax({
  url: "fourier_surface?m=128&n=128",
  success: function(data) {
    console.log(data.points);
  }
});

var radius = 3,
    angle = 0,
    dAngle = Math.PI / 360;

setInterval(function () {
  mesh.position.x = radius * Math.cos(angle);
  mesh.position.z = radius * Math.sin(angle);
  mesh.rotation.y = angle / 2;
  angle += dAngle;
}, 8);

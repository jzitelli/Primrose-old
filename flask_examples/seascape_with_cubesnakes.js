var t3 = THREE;

var light = new t3.PointLight();
light.position.set(-4, 1, 0);
scene.add(light);

var light2 = new t3.PointLight(0x32ffee);
light2.position.set(-6, -6, -10);
scene.add(light2);

var makeCube = function (x, y, z, c) {
  var cube = new t3.Mesh(
    new t3.BoxGeometry(1, 1.1, 1),
    new t3.MeshLambertMaterial({color: c})
  );
  cube.position.set(x, y, z); // 0, 0, 0).add(
      // new t3.Vector3(x, y, z));
  scene.add(cube);
  return cube;
};

var nx = 128;
var ny = 128;
var makePlane = function (x, y, z, w, h, c) {
  var plane = new t3.Mesh(
    new t3.PlaneGeometry(w, h, nx, ny),
    new t3.MeshLambertMaterial({color: c, side: t3.DoubleSide})
  );
  plane.position.set(x, y, z);
  scene.add(plane);
  return plane;
};

var plane = makePlane(0, 5, 1, 10, 10);
plane.rotation.x = -3.14 / 2;
for (var i = 0; i < nx; i++) {
  for (var j = 0; j < ny; j++) {
    plane.geometry.vertices[j*nx + i].z = 1.0*Math.sin(0.1115*j);
  };
};
plane.geometry.verticesNeedUpdate = false;

var cube0 = makeCube(1, 0.3, 2, 'red');
var cube1 = makeCube(4, 1, 3, 'yellow');
var cube2 = makeCube(-5, 1.3, 2, 'blue');
var cube3 = makeCube(-2, 3, 2, 'green');

var n = 200;
var colors = ['red',
              'green',
              'orange',
              'purple', 'yellow',
              'blue', 'gold'];
var snake_cubes = [];
for (i = 1; i < n; i++) {
  snake_cubes.push(makeCube(4+0.0001*i, 8.9-0.00039*i*i, 0.000025*i*i*i,
                            colors[((i-1)/2)%colors.length]));
}

i = 0;
setInterval( function () {
  i += -0.02;
  cube0.rotation.y = 3*i;
  cube1.rotation.y = i*5;
  cube2.rotation.y = i*0.2;
  cube2.position.z -= 0.0003*i;
  light.position.y -= 0.0001*i;
  light2.position.x -= 0.0003*i;
  for (var j = 0; j < snake_cubes.length; j++) {
    snake_cubes[j].position.x += 0.01*Math.sin(0.1*j + i);
    snake_cubes[j].position.y += 0.04*Math.sin(0.1*j + 0.4*i);
  }
}, 8);
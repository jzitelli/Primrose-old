import os
import shutil
import logging

from flask import Flask, render_template, request, Markup
STATIC_FOLDER = os.getcwd()
app = Flask(__name__, static_url_path='', static_folder=STATIC_FOLDER)

@app.route("/")
def editor3d():
    logger = logging.getLogger(__name__)
    if 'sky_texture' in request.args:
        sky_texture = Markup('<div id="#sky-texture">images/%s</div>' % request.args['sky_texture'])
    else:
        sky_texture = ''
    if 'floor_texture' in request.args:
        floor_texture = Markup('<div id="#floor-texture">images/%s</div>' % request.args['floor_texture'])
    else:
        floor_texture = ''

    return render_template("index.html",
                           editor_js_a=editor_js_a,
                           editor_js_b=editor_js_b,
                           sky_texture=sky_texture,
                           floor_texture=floor_texture)



editor_js_a = Markup(r"""log("Hello world!");


//var ball = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25),
//    new THREE.MeshLambertMaterial(
//        {map: THREE.ImageUtils.loadTexture("bg1.jpg"),
//         minFilter: THREE.NearestFilter}));
//
//ball.position.y = 0.25;
//scene.add(ball);
//
//var radius = 3, angle = 0, dAngle = Math.PI / 360;
//setInterval(function() {
//    ball.position.x = radius * Math.cos(angle);
//    ball.position.z = radius * Math.sin(angle);
//    angle += dAngle;
//}, 8);


// focus on this window and hit CTRL+SHIFT+SPACE (Windows/Linux) or CMD+OPT+E (OS X) to execute.
""")

# with open('editor_b.js', 'r') as f:
#     editor_js_b = Markup(f.read())
editor_js_b = Markup(r"""log('editor B!');

var textgeom = new THREE.TextGeometry('Hello, World!',
    {size: 1, height: 0.2, curveSegments: 3,
     font: 'janda manatee solid', weight: 'normal',
     bevelThickness: 3, bevelSize: 3, bevelEnabled: false});
//var textgeom = new THREE.TextGeometry('asdfasdfasgdsfgsdhsdg',
//    {size: 1, height: 0.2, font: 'helvetiker', weight: 'normal'});

var mesh = new THREE.Mesh(textgeom,
    new THREE.MeshLambertMaterial({color: 0xfff000}));

mesh.position.y = 0.25;

scene.add(mesh);

var radiusb = 3, angleb = 0, dAngleb = Math.PI / 360;

setInterval(function() {
  mesh.position.x = radiusb * Math.cos(angleb);
  mesh.position.z = radiusb * Math.sin(angleb);
  mesh.rotation.y = angleb / 2;
  angleb += dAngleb;
}, 8);

// focus on this window and hit CTRL+SHIFT+SPACE (Windows/Linux) or CMD+OPT+E (OS X) to execute.
""")


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)

    src_root = os.path.abspath(os.path.join(STATIC_FOLDER, os.path.pardir, os.path.pardir))
    core_js = os.path.join(src_root, 'core.js')
    try:
        shutil.copy(core_js, STATIC_FOLDER)
    except IOError:
        print("couldn't copy %s, i don't care" % core_js)
    for dir_ in ['dist', 'lib', 'test']:
        src_dir = os.path.join(src_root, dir_)
        path = os.path.join(STATIC_FOLDER, dir_)
        try:
            shutil.rmtree(path)
        except IOError:
            print("couldn't clean directory %s, i don't care" % path)
        except WindowsError:
            print("stupid WindowsError, i don't care!!")
        shutil.copytree(src_dir, path)

    app.run()

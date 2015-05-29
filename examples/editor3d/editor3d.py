import os
import shutil
import logging

from flask import Flask, Markup, render_template, request

STATIC_FOLDER = os.getcwd()

app = Flask(__name__, static_url_path='', static_folder=STATIC_FOLDER)

@app.route("/")
def editor3d():
    logger = logging.getLogger(__name__)

    if 'sky_texture' in request.args:
        sky_texture = "images/%s" % request.args['sky_texture']
    else:
        sky_texture = Markup("bg2.jpg")

    if 'floor_texture' in request.args:
        floor_texture = "images/%s" % request.args['floor_texture']
    else:
        floor_texture = Markup("deck.png")

    with open('editor_a.js', 'r') as f:
        editor_js_a = Markup(f.read())

    with open('editor_b.js', 'r') as f:
        editor_js_b = Markup(f.read())

    logger.debug("sky_texture = %s" % sky_texture)
    logger.debug("floor_texture = %s" % floor_texture)

    return render_template("index.html",
                           editor_js_a="editor_a.js", #editor_js_a,
                           editor_js_b="editor_b.js", #editor_js_b,
                           sky_texture=sky_texture,
                           floor_texture=floor_texture)

@app.route("/script_contents")
def script_contents():
    filename = request.args['filename']
    with open(filename, 'r') as f:
        contents = f.read()
    return jsonify(filename=filename, contents=contents)


def main():
    primrose_root = os.getenv("PRIMROSE_PATH", os.path.abspath(os.path.join(STATIC_FOLDER, os.path.pardir, os.path.pardir)))
    for dir_ in ['dist', 'lib', 'test']:
        src_dir = os.path.join(primrose_root, dir_)
        path = os.path.join(STATIC_FOLDER, dir_)
        try:
            shutil.rmtree(path)
        except IOError:
            print("couldn't clean directory %s, i don't care" % path)
        except WindowsError:
            print("stupid WindowsError, i don't care!!")
        shutil.copytree(src_dir, path)
    app.run()


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    main()

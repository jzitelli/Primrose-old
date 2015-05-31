import os
import shutil
import logging

from flask import Flask, Markup, render_template, request, jsonify

STATIC_FOLDER = os.getcwd()

app = Flask(__name__, static_url_path='', static_folder=STATIC_FOLDER)

@app.route("/")
def editor3d():
    logger = logging.getLogger(__name__)
    if 'sky_texture' in request.args:
        sky_texture = "images/%s" % request.args['sky_texture']
    else:
        sky_texture = os.getenv("PRIMROSE_SKY_TEXTURE", "bg2.jpg")

    if 'floor_texture' in request.args:
        floor_texture = "images/%s" % request.args['floor_texture']
    else:
        floor_texture = os.getenv("PRIMROSE_FLOOR_TEXTURE", "deck.png")

    logger.debug("sky_texture = %s" % sky_texture)
    logger.debug("floor_texture = %s" % floor_texture)

    return render_template("index.html",
                           sky_texture=sky_texture,
                           floor_texture=floor_texture)

@app.route("/script_contents")
def script_contents():
    logger = logging.getLogger(__name__)
    filename = request.args['filename']
    with open(filename, 'r') as f:
        contents = f.read()
    logger.debug("sending back %s:\n\n\n%s\n\n\n" % (filename, contents))
    return jsonify(filename=filename, contents=contents)

@app.route("/fourier_surface")
def fourier_surface():
    logger = logging.getLogger(__name__)
    m, n = request.args['m'], request.args['n']
    return jsonify(m=m, n=n, points=range(5))

# TODO: how to automatically install all dependencies
# def setup():
#     import urllib.request
#     if not os.path.exists(os.path.join(STATIC_FOLDER,
#                                        'lib',
#                                        'helvetiker_regular.typeface.js')):
#         pass #urllib.request.urlopen()


def main():
    primrose_root = os.getenv("PRIMROSE_ROOT",
                              os.path.abspath(os.path.join(STATIC_FOLDER,
                                              os.path.pardir,
                                              os.path.pardir)))
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

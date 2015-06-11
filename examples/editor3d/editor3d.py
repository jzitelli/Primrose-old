import os
import shutil
import json
import sys
from cStringIO import StringIO

import jsonschema

from flask import Flask, Markup, render_template, render_template_string, request, jsonify

import logging
_logger = logging.getLogger(__name__)


STATIC_FOLDER = os.getcwd()
PRIMROSE_ROOT = os.getenv("PRIMROSE_ROOT",
                          os.path.abspath(os.path.join(STATIC_FOLDER,
                                                       os.path.pardir,
                                                       os.path.pardir)))
SAVE_FOLDER = "saved"

TEMPLATE_STRING = r"""<!DOCTYPE html>
<html>
<!--
    ------- HEAD -------
 -->
<head>
{{ git_url if git_url else '' }}
%s
</head>
<!--
    ------- BODY -------
 -->
%s
</html>
"""
with open(os.path.join("templates", "head.html"), 'r') as f:
    HEAD = f.read()
with open(os.path.join("templates", "body.html"), 'r') as f:
    BODY = f.read()

with open(os.path.join("schema", "scene_schema.json"), 'r') as f:
    SCENE_SCHEMA = json.loads(f.read())


app = Flask(__name__, static_url_path='', static_folder=STATIC_FOLDER)


@app.route("/index")
def editor3d_index():
    # todo: scene with links, directory listing, repo listing
    return render_template("index.html")


@app.route("/tour")
def editor3d_tour():
    return render_template("tour.html")


def render_scene_template_string(scene_config):
    scene_config = Markup(
        '<script id="sceneConfig" type="text/json">%s</script>' % json.dumps(scene_config))
    image_dir = "images"
    floor_default = "deck.png"
    sky_default = "bg2.jpg"
    textures = [floor_default, sky_default] + [os.path.join(image_dir, os.path.basename(f)) for f in os.listdir(
        image_dir) if os.path.splitext(f)[1] in ('.png', '.jpg')]
    texture_options = [Markup('<option value="%s">%s</option>' % (texture, os.path.basename(texture)))
                       for texture in textures]
    floor_options = '\n'.join([Markup('<option selected="selected" value="%s">%s</option>' % (floor_default,
                                           os.path.basename(floor_default)))] +
                                texture_options)
    sky_options = '\n'.join([Markup('<option selected="selected" value="%s">%s</option>' % (sky_default,
                                          os.path.basename(sky_default)))] +
                                texture_options)
    return render_template_string(TEMPLATE_STRING % (HEAD, BODY),
                                  js="editor3d.js",
                                  onload="editor3d()",
                                  scene_config=scene_config,
                                  floor_textures=floor_options,
                                  sky_textures=sky_options)
    

@app.route("/")
def configured_scene():
    with open(os.path.join("data", "default_scene.json"), 'r') as f:
        DEFAULT_CONFIG = json.loads(f.read())
    try:
        config = request.args['config']
    except KeyError as err:
        config = json.dumps(DEFAULT_CONFIG)
    try:
        config = json.loads(config)
    except Exception as err:
        config = DEFAULT_CONFIG.copy()
        config['editors'][0]['text'] = "an exception occurred:\n%s" % str(err)
    response = render_scene_template_string(config)
    _logger.debug(response)
    return response


@app.route("/git_url")
def git_url():
    import git
    # check out url:
    url = request.args.get('url', 'local version')
    # git.checkout(url, "gitclone") # TODO: default to origin of clone
    head = request.args.get('head', os.path.join('templates', 'head.html'))
    with open(head, 'r') as f:
        head = f.read()
    body = request.args.get('body', os.path.join('templates', 'body.html'))
    with open(body, 'r') as f:
        body = f.read()
    return render_template_string(TEMPLATE_STRING % (head, body),
                                  git_url=Markup('<meta git_url="%s">' % url))


@app.route("/read")
def read_file():
    filename = request.args['filename']
    with open(filename, 'r') as f:
        value = f.read()
    return jsonify(args=request.args, value=value)


@app.route("/save", methods=['POST'])
def save_scene():
    def newfile(name):
        name = os.path.join(SAVE_FOLDER, name)
        suf = ".json"
        n = 0
        while os.path.exists(name + suf):
            suf = "__%d.json" % n
            n += 1
        return name + suf
    filename = newfile(request.form['name'])
    with open(filename, 'w') as f:
        f.write(json.dumps(request.form))
    _logger.debug(str(json.loads(json.dumps(request.form))))
    return jsonify(filename=filename, args=request.args)


@app.route("/load")
def load_scene():
    filename = request.args['filename']
    with open(filename, 'r') as f:
        config = json.loads(f.read())
    _logger.debug("loading:\n%s" % str(config))
    return jsonify(filename, sceneConfig)
    # return render_scene_template_string(config)


@app.route("/log")
def debug_log():
    _logger.debug(request.args['string'])
    return jsonify(args=request.args)


@app.route("/python_eval")
def python_eval():
    pystr = request.args['pystr']
    _logger.debug("""executing...
----------------------------------------------------
%s
----------------------------------------------------""" % pystr)
    # see http://stackoverflow.com/q/5136611/1911963
    # setup the environment
    backup = sys.stdout
    # ####
    sys.stdout = StringIO()     # capture output
    execlocals = locals()
    execlocals.pop("backup")
    execlocals.pop('value', None)
    try:
        exec(pystr, globals(), execlocals)
        value = execlocals['value']
    except Exception as err:
        value = "an exception occurred: %s" % str(err)
    finally:
        out = sys.stdout.getvalue()  # release output
        # ####
        sys.stdout.close()  # close the stream
        sys.stdout = backup  # restore original stdout
    return jsonify(value=value, args=request.args, out=out)


@app.route("/fourier_surface")
def fourier_surface():
    m, n = request.args['m'], request.args['n']
    return jsonify(points=range(5), args=request.args)


@app.route('/shutdown', methods=['POST'])
def shutdown():
    _logger.debug("shutting down...")
    shutdown_server()
    return 'server shutting down...'


def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()


def main():
    for dir_ in ['dist', 'lib', 'test']:
        src_dir = os.path.join(PRIMROSE_ROOT, dir_)
        path = os.path.join(STATIC_FOLDER, dir_)
        try:
            shutil.rmtree(path)
        except IOError as err:
            print("couldn't clean directory %s, i don't care" % path)
        except WindowsError as err:
            print("stupid WindowsError (shutil.rmtree), i don't care!!\n%s" % str(err))
        try:
                shutil.copytree(src_dir, path)
        except WindowsError as err:
            print("stupid WindowsError (shutil.copytree), i don't care!!\n%s" % str(err))
    app.run()

if __name__ == '__main__':
    logging.basicConfig(
        level=logging.DEBUG, format="%(levelname)s %(name)s %(funcName)s %(lineno)d:\n%(message)s\n")
    main()
    #import subprocess
    #

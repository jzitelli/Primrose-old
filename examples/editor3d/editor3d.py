import os
import shutil
import json

import jsonschema

from flask import Flask, Markup, render_template, render_template_string, request, jsonify

import logging
_logger = logging.getLogger(__name__)


STATIC_FOLDER = os.getcwd()
PRIMROSE_ROOT = os.getenv("PRIMROSE_ROOT",
                          os.path.abspath(os.path.join(STATIC_FOLDER,
                                                       os.path.pardir,
                                                       os.path.pardir)))


app = Flask(__name__, static_url_path='', static_folder=STATIC_FOLDER)


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

@app.route("/index")
def editor3d():
    return render_template("index.html")

@app.route("/tour")
def editor3d_tour():
    return render_template("tour.html")

@app.route("/")
def configured_scene():
    with open(os.path.join("data", "default_scene.json"), 'r') as f:
        DEFAULT_CONFIG = json.loads(f.read())
    jsonschema.validate(DEFAULT_CONFIG, SCENE_SCHEMA)
    try:
        config = json.loads(request.args['config'])
    except KeyError as err:
        config = DEFAULT_CONFIG.copy()
        #config['editors'][0]['text'] = "'config' was not in args"
    except Exception as err:
        config = DEFAULT_CONFIG.copy()
        config['editors'][0]['text'] = "an exception occurred:\n%s" % str(err)
    # create editor and other control DOM elements:
    editors = '\n'.join([Markup('<script id="%sConfig" type="text/json">%s</script>'
                                % (editor['id'], json.dumps(editor)))
                         for editor in config['editors']])
    image_dir = "images"
    floor_default = "deck.png"
    sky_default = os.path.join(image_dir, "beach3.jpg")
    textures = [f for f in os.listdir(image_dir) if os.path.splitext(f)[1] in ('.png', '.jpg')]
    floor_textures = '\n'.join([Markup('<option selected="selected" value="deck.png">deck.png</option>')] +
                               [Markup('<option value="%s">%s</option>' % (os.path.join(image_dir, texture), os.path.basename(texture)))
                                for texture in textures])
    sky_textures = '\n'.join([Markup('<option selected="selected" value="%s">%s</option>' % (sky_default, os.path.basename(sky_default)))] +
                             [Markup('<option value="%s">%s</option>' % (os.path.join(image_dir, texture), os.path.basename(texture)))
                              for texture in textures])
    response = render_template_string(TEMPLATE_STRING % (HEAD, BODY),
                                      js="editor3d_flask.js",
                                      editors=editors,
                                      floor_textures=floor_textures,
                                      sky_textures=sky_textures)
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


@app.route("/log")
def debug_log():
    _logger.debug(request.args['string'])
    return jsonify(args=request.args)


# function which will output to javascript console
# capture stdout during execution
# is there javascript exec/eval equivalent?
#def prlog()

@app.route("/python_eval")
def python_eval():
    pystr = request.args['pystr']
    _logger.debug("""executing...
----------------------------------------------------
%s
----------------------------------------------------""" % pystr)
    execlocals = locals()
    execlocals.pop('value', None)
    try:
        exec(pystr, globals(), execlocals)
        value = execlocals['value']
    except Exception as err:
        value = "an exception occurred: %s" % str(err)
    return jsonify(value=value, args=request.args)


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
        except IOError:
            print("couldn't clean directory %s, i don't care" % path)
        except WindowsError:
            print("stupid WindowsError, i don't care!!")
        try:
            shutil.copytree(src_dir, path)
        except WindowsError:
            print("stupid WindowsError, i don't care!!")
    app.run()


if __name__ == '__main__':
    logging.basicConfig(
        level=logging.DEBUG, format="%(levelname)s %(name)s %(funcName)s %(lineno)d:\n%(message)s\n")
    main()

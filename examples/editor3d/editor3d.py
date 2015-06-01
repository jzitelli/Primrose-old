import os
import shutil
import logging
import json
import jsonschema
logger = logging.getLogger(__name__)

from flask import Flask, Markup, render_template, render_template_string, request, jsonify

STATIC_FOLDER = os.getcwd()
PRIMROSE_ROOT = os.getenv("PRIMROSE_ROOT",
                          os.path.abspath(os.path.join(STATIC_FOLDER,
                                          os.path.pardir,
                                          os.path.pardir)))

with open("schema/scene_schema.json") as f:
    SCENE_SCHEMA = json.loads(f.read())

app = Flask(__name__, static_url_path='', static_folder=STATIC_FOLDER)

@app.route("/")
def editor3d():
    return render_template("index.html")


@app.route("/tour")
def editor3d_tour():
    return render_template("tour.html")


@app.route("/git_url")
def git_url():
    # check out url:
    url = request.args.get('url', 'local version')
    #git.checkout(url, "gitclone") # TODO: default to origin of clone
    head = request.args.get('head', os.path.join('templates', 'head.html'))
    with open(head, 'r') as f:
        head = f.read();
    body = request.args.get('body', os.path.join('templates', 'body.html'))
    with open(body, 'r') as f:
        body = f.read();
    return render_template_string(r"""<!DOCTYPE html>
<html>

<!-- 
#
 -->
<head>
<meta git_url="{{git_url}}">
%s
</head>
<!-- 
#
 -->
%s

</html>
""" % (head, body), git_url=url)

@app.route("/read")
def read_file():
    filename = request.args['filename']
    with open(filename, 'r') as f:
        value = f.read()
    return jsonify(args=request.args, value=value)

@app.route("/log")
def debug_log():
    logger.debug(request.args['string'])
    return jsonify(args=request.args)

@app.route("/python_eval")
def python_eval():
    pystr = request.args['pystr']
    logger.debug("""executing...
----------------------------------------------------
%s
----------------------------------------------------""" % pystr)
    try:
        execlocals = locals()
        execlocals.pop('value', None)
        exec(pystr, globals(), execlocals)
        value = execlocals['value']
    except Exception as err:
        value = str(err)
    return jsonify(value=value, args=request.args)

@app.route("/fourier_surface")
def fourier_surface():
    m, n = request.args['m'], request.args['n']
    return jsonify(points=range(5), args=request.args)


# TODO: how to automatically install all dependencies
# def setup():
#     import urllib.request
#     if not os.path.exists(os.path.join(STATIC_FOLDER,
#                                        'lib',
#                                        'helvetiker_regular.typeface.js')):
#         pass #urllib.request.urlopen()


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


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format="%(levelname)s %(name)s %(funcName)s %(lineno)d:\n%(message)s\n")
    main()
    app.run()

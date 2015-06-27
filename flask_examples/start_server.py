import sys
import os
from StringIO import StringIO

from flask import Flask, render_template, request, jsonify
import logging
_logger = logging.getLogger(__name__)

STATIC_FOLDER = os.getcwd()
PRIMROSE_ROOT = os.getenv("PRIMROSE_ROOT",
                          os.path.abspath(os.path.join(STATIC_FOLDER,
                                                       os.path.pardir)))
app = Flask(__name__, static_folder=PRIMROSE_ROOT, static_url_path='')

@app.route("/")
def simple_app():
    return render_template("app_terrain.html", title="Simple Demo")

@app.route("/terrain")
def terrain_demo():
    return render_template("app_terrain.html", title="Terrain Demo")

@app.route("/cannon")
def cannon_demo():
    return render_template("app_terrain.html", title="CANNON Demo")


@app.route("/read")
def read_file():
    filename = request.args['filename']
    with open(filename, 'r') as f:
        value = f.read()
    return jsonify(args=request.args, value=value)


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


def main():
    app.run(host='0.0.0.0')

if __name__ == '__main__':
    logging.basicConfig(
        level=logging.DEBUG, format="%(levelname)s %(name)s %(funcName)s %(lineno)d:\n%(message)s\n")
    main()
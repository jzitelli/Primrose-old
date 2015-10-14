"""Flask application enabling server-side execution of Python code entered in
Primrose editors.

This script may be executed from the Primrose root directory to host a local
server (with a subset of the functionality available from the Tornado server [see start.py]) ::

    $ python pyserver/flask_app.py

The server can then be accessed locally at 127.0.0.1:5000."""

import os
import sys
import logging
try:
    from StringIO import StringIO
except ImportError:
    from io import StringIO
import subprocess
import json

from flask import Flask, render_template, request, jsonify, Markup, render_template_string

import scenes

import default_settings

if default_settings.DEBUG:
    STATIC_FOLDER = os.path.join(os.getcwd())

_example = "editvr"

app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            template_folder=os.path.join(os.getcwd(), 'examples', _example),
            static_url_path='')
app.config.from_object(default_settings)


_logger = logging.getLogger(__name__)


@app.route('/')
def home():
    """Serves HTML for a Primrose app."""
    if (app.debug or app.testing) and app.config.get('ALWAYS_GRUNT'):
        subprocess.call("grunt quick", shell=True)
    scene = request.args.get('scene', 'some_room')
    return render_template('index.html',
        json_config=Markup(r"""<script>
var JSON_CONFIG = %s;
var JSON_SCENE = %s;
</script>""" % (json.dumps({k: v for k, v in app.config.items()
                            if k in ['DEBUG', 'TESTING', 'WEBSOCKETS']}),
                json.dumps(getattr(scenes, scene)(),
                           indent=(2 if app.debug else None)))))


@app.route('/pyexec', methods=['POST'])
def pyexec():
    """Handles Python execution requests.  The JSON formatted response can have the following properties:
        'return_value' - by convention, if any value is assigned to a local variable called 'return_value' when the
                         execution finishes successfully, it will be copied/serialized here
        'stdout'       - output to stdout which was performed during execution
        'error'        - if an error occured during execution, the string representation of the raised Python exception
    """
    src = request.form['src']
    # see http://stackoverflow.com/q/5136611/1911963 :
    stdout_bak = sys.stdout
    sys.stdout = StringIO()
    execlocals = locals()
    execlocals.pop("stdout_bak")
    execlocals.pop('return_value', None)
    error = None
    _logger.debug(src)
    try:
        exec(src, globals(), execlocals)
    except Exception as err:
        error = str(err)
        _logger.error("an exception occurred while attempting to execute Python code:\n%s" % error)
    finally:
        stdout = sys.stdout.getvalue()
        sys.stdout.close()
        sys.stdout = stdout_bak
    response = {'stdout': stdout}
    if 'return_value' in execlocals:
        response['return_value'] = execlocals['return_value']
    if error is not None:
        response['error'] = error
    return jsonify(response)


@app.route("/read")
def read():
    """Handles requests to read file contents (files are assumed to be in examples/[_example])"""
    filename = os.path.join(os.getcwd(), 'examples', _example, request.args['file'])
    response = {}
    try:
        with open(filename, 'r') as f:
            response['text'] = f.read()
    except Exception as err:
        response['error'] = str(err)
    return jsonify(response)


@app.route("/write", methods=['POST'])
def write():
    filename = os.path.join(os.getcwd(), 'writes', os.path.split(request.args['file'])[1])
    try:
        if request.json is not None:
            with open(filename, 'w') as f:
                f.write(json.dumps(request.json))
        else:
            with open(filename, 'w') as f:
                f.write(request.form['text'])
        response = {'filename': filename}
    except Exception as err:
        response = {'error': str(err)}
    return jsonify(response)


@app.route("/testing")
def testing():
    return render_template_string(u"""<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=0">
    <title>pointer events test</title>
  </head>

  <body onload="onLoad();">

    <script type="text/javascript">

    var socket;

    function pointermoveHandler(evt) {
      if (evt.pointerType === "pen" && evt.pressure > 0) {
        //console.log(evt.pressure);
        if (socket.readyState == 1) {
          socket.send({x: evt.x, y: evt.y, p: evt.pressure});
        }
      }
    }

    function pointerdownHandler(evt) {
      if (evt.pointerType === "pen") {
        //console.log(evt.x + ' ' + evt.y);
      }
    }

    function onLoad() {
      socket = new WebSocket('ws://' + document.domain + ':' + location.port + '/pointerevents');
      socket.onopen = function () {
        console.log("WebSocket opened");
        window.addEventListener('pointermove', pointermoveHandler, false);
        //window.addEventListener('pointerdown', pointerdownHandler, false);
      };
      socket.onerror = function (error) {
        console.log("could not connect to PointerEvents WebSocket");
      };
      socket.onmessage = function (message) {
        //console.log(message);
      };
    }

    </script>

  </body>
</html>
""")


def main():
    app.config['WEBSOCKETS'] = []
    app.run(host='0.0.0.0')


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else None),
                        format="%(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()

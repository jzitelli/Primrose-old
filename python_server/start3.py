"""Flask/Tornado-based server enabling server-side execution of Python code entered in
Primrose editors.  Also communicates Android tablet input data to the client via WebSocket.

This script is called start3.py because Python 3 is required.
It should be executed from the Primrose root directory, i.e. ::

    $ python python_server/start3.py

The server can then be accessed locally at 127.0.0.1:5000."""

import os
import sys
import logging
import io
import subprocess
import json
import functools

from flask import Flask, render_template, request, jsonify, Markup

from tornado.wsgi import WSGIContainer
from tornado.web import Application, FallbackHandler
from tornado.ioloop import IOLoop

import default_settings
import three
from gfxtablet import GFXTabletHandler


_logger = logging.getLogger(__name__)

_example = 'editor3dPython'

app = Flask(__name__,
    static_folder=os.path.join(os.getcwd()),
    template_folder=os.path.join(os.getcwd(), 'examples', _example),
    static_url_path='')
app.config.from_object(default_settings)


@app.route('/')
def editor3d():
    """Serves HTML for a Primrose app based on the editor3d example."""
    if app.debug or app.testing:
        subprocess.call("grunt quick", shell=True)
    return render_template('index.html', json_config=Markup(r"<script>%s</script>" % json.dumps(three.scene_gen())))


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
    sys.stdout = io.StringIO()
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


def main():
    handlers = [('.*', FallbackHandler, dict(fallback=WSGIContainer(app)))]
    if default_settings.GFXTABLET:
        handlers.insert(-1, ('/gfxtablet', GFXTabletHandler))

    tornado_app = Application(handlers, debug=app.debug)
    tornado_app.listen(5000)
    _logger.debug("starting IO loop...")
    IOLoop.instance().start()


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else None))
    main()
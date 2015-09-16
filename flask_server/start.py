"""Flask-based server enabling server-side execution of Python code entered in
Primrose editors.

This script should be executed from the Primrose root directory, i.e. ::

    $ python flask_server/start.py

The server can then be accessed locally at 127.0.0.1:5000."""

import os
import sys
import logging
import StringIO
import subprocess
import json
from flask import Flask, render_template, request, jsonify, Markup

import default_settings
import three

app = Flask(__name__,
    static_folder=os.path.join(os.getcwd()),
    template_folder=os.path.join(os.getcwd(), 'examples', 'editor3dFlask'),
    static_url_path='')

app.config.from_object(default_settings)


_logger = logging.getLogger(__name__)


@app.route('/')
def editor3d():
    """Serves HTML for a Primrose app based on the editor3d example."""
    if app.debug or app.testing:
        subprocess.call("grunt quick", shell=True)
    with open(os.path.join(os.getcwd(), 'examples', 'editor3dFlask', 'room.json'), 'w') as f:
        f.write(json.dumps(three.scene_gen(), indent=2))
    return render_template('index.html')


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
    sys.stdout = StringIO.StringIO()
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
    """Handles requests to read file contents (files are assumed to be in examples/editor3dFlask)"""
    filename = os.path.join(os.getcwd(), 'examples', 'editor3dFlask', request.args['file'])
    response = {}
    try:
        with open(filename, 'r') as f:
            response['text'] = f.read()
    except Exception as err:
        response['error'] = str(err)
    return jsonify(response)


def main():
    app.run(host='0.0.0.0')


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else None))
    main()
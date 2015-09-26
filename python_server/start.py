"""Flask/Tornado-based server enabling server-side execution of Python code entered in
Primrose editors.  Also communicates Android tablet input data to the client via WebSocket.

This script is called start3.py because Python 3 is required.
It should be executed from the Primrose root directory, i.e. ::

    $ python python_server/start3.py

The server can then be accessed locally at 127.0.0.1:5000."""

import logging

from tornado.wsgi import WSGIContainer
from tornado.web import Application, FallbackHandler
from tornado.ioloop import IOLoop

from flask_app import app
import default_settings
from gfxtablet import GFXTabletHandler

_logger = logging.getLogger(__name__)


handlers = [('.*', FallbackHandler, dict(fallback=WSGIContainer(app)))]
if default_settings.GFXTABLET:
    handlers.insert(-1, ('/gfxtablet', GFXTabletHandler))


def main():
    tornado_app = Application(handlers, debug=app.debug)
    tornado_app.listen(5000)
    _logger.debug("starting IO loop...")
    IOLoop.instance().start()


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else None))
    main()
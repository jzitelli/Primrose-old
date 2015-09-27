"""Flask/Tornado-based server enabling server-side execution of Python code entered in
Primrose editors.  Also communicates Android tablet input data to the client via WebSocket.

Python 3 is recommended.  Run the script from the Primrose root directory, i.e. ::

    $ python python_server/start.py

The server can then be accessed locally at 127.0.0.1:5000."""

import logging

from tornado.wsgi import WSGIContainer
from tornado.web import Application, FallbackHandler
from tornado.ioloop import IOLoop

from flask_app import app, default_settings

from gfxtablet import GFXTabletHandler


_logger = logging.getLogger(__name__)


websocket_handlers = []
if default_settings.GFXTABLET:
    websocket_handlers.append(('/gfxtablet', GFXTabletHandler))
handlers = websocket_handlers + [('.*', FallbackHandler, dict(fallback=WSGIContainer(app)))]


def main():
    app.config['WEBSOCKETS'] = [wh[0] for wh in websocket_handlers]
    tornado_app = Application(handlers, debug=app.debug)
    tornado_app.listen(5000)
    _logger.debug("starting IO loop...")
    IOLoop.instance().start()


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else None))
    main()
"""Flask/Tornado-based server enabling server-side execution of Python code entered in
Primrose editors.  Also communicates Android tablet input data to the client via WebSocket.

Python 3 is recommended.  Run the script from the Primrose root directory, i.e. ::

    $ python python_server/tornado_app.py

"""
import os
import socket

from tornado.wsgi import WSGIContainer
from tornado.web import Application, FallbackHandler, StaticFileHandler
from tornado.ioloop import IOLoop

from flask_app import app, default_settings, STATIC_FOLDER, TEMPLATE_FOLDER

from gfxtablet import GFXTabletHandler
from PointerEventHandler import PointerEventHandler

import logging


_logger = logging.getLogger(__name__)


websocket_handlers = []
if default_settings.GFXTABLET:
    websocket_handlers.append((r'/gfxtablet', GFXTabletHandler))
if default_settings.POINTEREVENTS:
    websocket_handlers.append((r'/pointerevents', PointerEventHandler))


handlers = websocket_handlers + [(r'.*', FallbackHandler, dict(fallback=WSGIContainer(app)))]


def main():
    app.config['WEBSOCKETS'] = [wh[0] for wh in websocket_handlers]
    tornado_app = Application(handlers, debug=app.debug)
    _logger.info("flask_app.config:\n%s\n" % str(app.config))
    _logger.info("tornado_app.settings:\n%s\n" % str(tornado_app.settings))
    if app.debug:
        port = 5000
    else:
        port = 80
    tornado_app.listen(port)

    _logger.debug("server's local IP:  %s" % socket.gethostbyname(socket.gethostname()))
    _logger.info("STATIC_FOLDER = %s" % STATIC_FOLDER)
    _logger.info("TEMPLATE_FOLDER = %s" % TEMPLATE_FOLDER)
    _logger.info("listening on port %d" % port)
    _logger.info("starting IO loop...")
    _logger.info("press CTRL-C to terminate the server")
    IOLoop.instance().start()


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s: %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()

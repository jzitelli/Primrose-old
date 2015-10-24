"""Flask/Tornado-based server enabling server-side execution of Python code entered in
Primrose editors.  Also communicates Android tablet input data to the client via WebSocket.

Python 3 is recommended.  Run the script from the Primrose root directory, i.e. ::

    $ python python_server/tornado_app.py

On Linux, the bash script "start.sh" can be used instead.

The server can be accessed locally at 127.0.0.1:5000.
"""

from tornado.wsgi import WSGIContainer
from tornado.web import Application, FallbackHandler
from tornado.ioloop import IOLoop

from flask_app import app, default_settings, STATIC_FOLDER, TEMPLATE_FOLDER

from gfxtablet import GFXTabletHandler
from PointerEventHandler import PointerEventHandler

import socket
import logging


_logger = logging.getLogger(__name__)


websocket_handlers = []
if default_settings.GFXTABLET:
    websocket_handlers.append(('/gfxtablet', GFXTabletHandler))
    websocket_handlers.append(('/pointerevents', PointerEventHandler))
handlers = websocket_handlers + [('.*', FallbackHandler, dict(fallback=WSGIContainer(app)))]


def main():
    app.config['WEBSOCKETS'] = [wh[0] for wh in websocket_handlers]
    tornado_app = Application(handlers, debug=app.debug)
    tornado_app.listen(5000)
    _logger.info("STATIC_FOLDER = %s" % STATIC_FOLDER)
    _logger.info("TEMPLATE_FOLDER = %s" % TEMPLATE_FOLDER)
    _logger.debug("server's local IP:  %s" % socket.gethostbyname(socket.gethostname()))
    _logger.debug("starting IO loop...")
    _logger.info("press CTRL-C to terminate the server")
    IOLoop.instance().start()


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
				    	format="%(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()

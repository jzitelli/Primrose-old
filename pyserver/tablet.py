"""Sends input data from a locally connected Wacom tablet to WebSocket client.
"""

import logging
from tornado.websocket import WebSocketHandler
from tornado.ioloop import IOLoop, PeriodicCallback

import wintab32

_logger = logging.getLogger(__name__)


class TabletHandler(WebSocketHandler):
    def initialize(self):
        self.read_tablet_callback = PeriodicCallback(self.handle_input, 50)
    def open(self):
        _logger.debug("WebSocket opened")
        self.set_nodelay(True) # maybe better to not do this?
        hctx = wintab32.open()
        _logger.debug("WTOpen returned %d" % hctx)
        self.read_tablet_callback.start()
    def on_message(self, message):
        _logger.debug(message)
    def on_close(self):
        _logger.debug("WebSocket closed")
        self.read_tablet_callback.stop()
        status = wintab32.close()
        if status != 0:
            _logger.debug("tablet context closed")
    def handle_input(self):
        n, buf = wintab32.read()
        if n > 0:
            _logger.debug("%d %d %d %d" % (n, buf[0].pkX, buf[0].pkY, buf[0].pkNormalPressure))
            self.write_message({'n': n})

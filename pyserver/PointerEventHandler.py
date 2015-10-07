"""Receives input data from a device / browser supporting PointerEvent API.
"""

import logging
from tornado.websocket import WebSocketHandler
from tornado.ioloop import IOLoop


_logger = logging.getLogger(__name__)


# class PointerEventOutHandler(WebSocketHandler):
#     def open(self):
#         _logger.debug("%s WebSocket opened" % self.__class__.__name__)
#         self.set_nodelay(True) # maybe better to not do this?
#     def on_close(self):
#         _logger.debug("%s WebSocket closed" % self.__class__.__name__)


class PointerEventHandler(WebSocketHandler):
    def open(self):
        _logger.debug("%s WebSocket opened" % self.__class__.__name__)
        self.set_nodelay(True)
    def on_message(self, message):
        pass
        # _logger.debug(message)
        # self.write_message({'x': x, 'y': y, 'p': p})
    def on_close(self):
        _logger.debug("%s WebSocket closed" % self.__class__.__name__)

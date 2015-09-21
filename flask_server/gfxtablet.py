import logging
import socket
from tornado.websocket import WebSocketHandler
from tornado.ioloop import IOLoop
from tornado.web import Application

_logger = logging.getLogger(__name__)

class GFXTabletHandler(WebSocketHandler):
    # see http://www.bbarrows.com/blog/2013/01/27/udptornado/
    def open(self):
        _logger.debug("WebSocket opened")
        self.udpsock = socket.socket(type=socket.SOCK_DGRAM)
        self.udpsock.bind(('0.0.0.0', 40118))
        self.udpsock.setblocking(False)
        self._buf = bytearray(1024)
        self.set_nodelay(True)
        ioloop = IOLoop.instance()
        ioloop.add_handler(self.udpsock.fileno(), self.handle_input, ioloop.READ)
    def on_message(self, message):
        _logger.debug(message)
    def on_close(self):
        _logger.debug("WebSocket closed")
        #self.udpsock.close()
    def handle_input(self, fd, events):
        # TODO: android app sends width, height, use it
        width, height = 2560, 1600
        buf = self._buf
        self.udpsock.recv_into(buf)
        event_type = buf[11]
        x = (256 * buf[11 + 1] + buf[11 + 2]) / 2.0**16 * width
        y = (256 * buf[11 + 3] + buf[11 + 4]) / 2.0**16 * height
        p = (256 * buf[11 + 5] + buf[11 + 6]) / 2.0**16
        if event_type == 0:
            self.write_message({'x': x, 'y': y, 'p': p})
        elif event_type == 1:
            # button event
            pass


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    app = Application([(r'/gfxtablet', GFXTabletHandler)])
    app.listen(5001)
    _logger.debug("waiting for websocket connection")
    IOLoop.instance().start()

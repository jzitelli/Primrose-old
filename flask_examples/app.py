import os
from flask import Flask, render_template
import logging
_logger = logging.getLogger(__name__)

STATIC_FOLDER = os.getcwd()
PRIMROSE_ROOT = os.getenv("PRIMROSE_ROOT",
                          os.path.abspath(os.path.join(STATIC_FOLDER,
                                                       os.path.pardir)))
app = Flask(__name__, static_folder=PRIMROSE_ROOT, static_url_path='')

@app.route("/")
def simple_app():
    return render_template("index.html", title="Simple App")

@app.route("/terrain")
def terrain_demo():
    return render_template("app_terrain.html", title="Terrain Demo")

def main():
    app.run(host='0.0.0.0')

if __name__ == '__main__':
    logging.basicConfig(
        level=logging.DEBUG, format="%(levelname)s %(name)s %(funcName)s %(lineno)d:\n%(message)s\n")
    main()
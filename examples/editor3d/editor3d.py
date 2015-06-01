import os
import shutil
import logging
logger = logging.getLogger(__name__)

from flask import Flask, Markup, render_template, request, jsonify

STATIC_FOLDER = os.getcwd()
PRIMROSE_ROOT = os.getenv("PRIMROSE_ROOT",
                          os.path.abspath(os.path.join(STATIC_FOLDER,
                                          os.path.pardir,
                                          os.path.pardir)))

app = Flask(__name__, static_url_path='', static_folder=STATIC_FOLDER)

@app.route("/")
def editor3d():
    return render_template("index.html")

@app.route("/tour")
def editor3d_tour():
    return render_template("tour.html")

@app.route("/git_url")
def git_url():
    # check out url:
    url = request.args.get('url', 'local version')
    head = request.args.get('head', os.path.join('templates', 'head.html'))
    body = request.args.get('body', os.path.join('templates', 'body.html'))
    #git.checkout(url, "gitclone") # TODO: default to origin of clone
    # generate head html:
    with open(head, 'r') as f:
        head = f.read();
        #logger.debug(head)
    with open(body, 'r') as f:
        body = f.read();
        #logger.debug(body)
    return render_template("git_url.html", git_url=url, head=Markup(head), body=Markup(body))

@app.route("/read")
def read_file():
    filename = request.args['filename']
    with open(filename, 'r') as f:
        value = f.read()
    #logger.debug("sending back %s:\n\n\n%s\n\n\n" % (filename, value))
    return jsonify(args=request.args, value=value)

@app.route("/log")
def debug_log():
    logger.debug(request.args['string'])
    return jsonify(string=request.args['string'])

@app.route("/python_eval")
def python_eval():
    pystr = request.args['pystr']
    return jsonify(value=eval(pystr), args=request.args)

@app.route("/fourier_surface")
def fourier_surface():
    m, n = request.args['m'], request.args['n']
    return jsonify(points=range(5), args=request.args)


# TODO: how to automatically install all dependencies
# def setup():
#     import urllib.request
#     if not os.path.exists(os.path.join(STATIC_FOLDER,
#                                        'lib',
#                                        'helvetiker_regular.typeface.js')):
#         pass #urllib.request.urlopen()


def main():
    for dir_ in ['dist', 'lib', 'test']:
        src_dir = os.path.join(PRIMROSE_ROOT, dir_)
        path = os.path.join(STATIC_FOLDER, dir_)
        try:
            shutil.rmtree(path)
        except IOError:
            print("couldn't clean directory %s, i don't care" % path)
        except WindowsError:
            print("stupid WindowsError, i don't care!!")
        try:
            shutil.copytree(src_dir, path)
        except WindowsError:
            print("stupid WindowsError, i don't care!!")


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    main()
    app.run()

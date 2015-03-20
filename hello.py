from flask import Flask
app = Flask(__name__, static_url_path='')

@app.route("/")
def my_webservice():
    with open("index.html") as f:
        html = f.read()
    return html

if __name__ == '__main__':
    app.run()

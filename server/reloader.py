# Adapted from https://maxhalford.github.io/blog/flask-sse-no-deps/

import queue

from flask import Flask, Response
from flask_cors import CORS


class MessageAnnouncer:
    def __init__(self):
        self.listeners = []

    def listen(self):
        q = queue.Queue(maxsize=5)
        self.listeners.append(q)
        return q

    def announce(self, msg):
        for i in reversed(range(len(self.listeners))):
            try:
                self.listeners[i].put_nowait(msg)
            except queue.Full:
                del self.listeners[i]


def format_sse(data: str, event=None) -> str:
    msg = f"data: {data}\n\n"
    if event is not None:
        msg = f"event: {event}\n{msg}"
    return msg


app = Flask(__name__)
CORS(app)
announcer = MessageAnnouncer()


@app.route("/update")
def ping():
    msg = format_sse(data="update")
    announcer.announce(msg=msg)
    return {}


@app.route("/listen", methods=["GET"])
def listen():
    def stream():
        messages = announcer.listen()  # returns a queue.Queue
        while True:
            msg = messages.get()  # blocks until a new message arrives
            yield msg

    return Response(stream(), mimetype="text/event-stream")


if __name__ == "__main__":
    app.run(port=3333)

import os
from gtts import gTTS

hello = os.path.join("static", "sounds", "hello.mp3")
if not os.path.exists(hello):
    gTTS(text='Hello.  Welcome.  To.  sub ver.',
         lang='en').save(hello)

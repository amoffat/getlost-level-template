from spindler.construct import render
from spindler.parser import parse

with open("Level.twee", "r") as h:
    text = h.read()


passages = parse(text)
print(render(passages))

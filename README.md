couch-irc-stats
===============

This couchapp renders an interactive stats page for an IRC channel. It reads the
document format that the bot [rochako](https://github.com/rochack/rochako)
writes, and [couchgrams](https://github.com/clehner/couchgrams) also reads.

Currently, **couch-irc-stats** is set up for the *##rochack* channel, but it
could be changed to work for another channel, or multiple arbitrary channels.

Installation
------------

Use the utility [erica](https://github.com/benoitc/erica) (or python couchapp):

    erica push . http://localhost:5984/<your_db>

Todo
----
- Integrate log viewer
- Add per-user stats
- Add list of top links posted
- Your suggestion here

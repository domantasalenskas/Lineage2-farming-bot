# Description

* It's a small project, which is an autonomous program simulating a player in Lineage II

* The bot was made only for Asterios.tm (a private server of the Lineage II, which uses "__High Five__" update of the game),
I haven't tested it on other servers and chronicles(updates), so keep that in mind. It might work well on any High Five server (provided the interface position and size are the same).

* The bot was tested only in Windows 10.

* The bot should adjust itself to any resolution.

* It's a melee bot, meaning that it works well mostly for the melee classes in the game (The range classes will attack only from */targetnext* range and won't be able to pick up the loot).


# Before starting the script

* Watch the video to see how the bot works.

* The script should be started from Windows Command Line __with administrator privileges__.

* The game should be started in the windowed mode, __it won't work in the fullscreen mode__. To do so press _Alt + Enter_ combination in the game.

* The bot will open the window of the game automatically and it __has to be open all the time while the bot is working__.
It won't work if the window is in the background, so don't change the focus of the window.

* The bot should be started with full HP (it saves the colors of HP bars at the moment of starting).

* To stop the bot press __space bar__.

# Requirements

- Node
- Packages:
  - node-gyp
  - keysender
  - image-pixels
  - ini

# Video

# Description

* It's a small project, which is an autonomous program simulating a player in Lineage II

* The bot was tested only on Asterios.tm (a private server of the Lineage II, which uses "__High Five__" version of the game),
I haven't tested it on other servers and chronicles, so keep that in mind. It might work well on any High Five server (provided the interface position and size are the same). If you want to use it with other servers you need to change the name of the window, which you can get from __getAllWindows()__ function.

* The bot was tested only in Windows 10.

* The bot should adjust itself to any resolution.

* It's a melee bot, meaning that it works well mostly for melee classes in the game (The range classes will attack only from */targetnext* range and won't be able to pick the loot).


# Before starting the script

* Watch the video to see how the bot works.

* The script should be started from Command Prompt __with administrator privileges__.

* The game should be started in the windowed mode, __it won't work in the fullscreen mode__. To do so press _Alt + Enter_ combination in the game.

* The bot will open the window of the game automatically and it __has to be open all the time while bot is working__.
It won't work if the window is in the background, so don't change the focus of the window.

* The bot should be started with his __full__ hp bar.

* __To stop the bot press space bar__.

# Requirements

- Node
- Packages:
  - node-gyp
  - keysender
  - image-pixels
  - ini

# Video

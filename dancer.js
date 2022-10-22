const { Virtual, Hardware, getAllWindows, sleep, GlobalHotkey } = require("keysender");
const pixels = require("image-pixels");

/* find the name of the window by using getAllWindows function and change this regExp */
const serverName = /Asterios/;

/* Find the window with the given tittle and determine delay of the clicks/keys sending */
let gameWindow = getAllWindows().find(({ title }) => serverName.test(title));
if (!gameWindow) throw new Error(`The game isn't opened. Open the game first.`);
const { handle } = gameWindow;

const { workwindow: w, mouse: m, keyboard: k } = new Hardware(handle)
const display = w.getView();

w.setForeground();

const delay = 1;

m.buttonTogglerDelay = delay;
k.keyTogglerDelay = delay;
k.keySenderDelay = delay


async function runBot() {


  /* main loop */
  for (; ;) {
    k.sendKey(`f8`, delay, delay);
    sleep(115000 + Math.floor(Math.random() * 5000));

  }
  /* finish main loop */
};

runBot();

const { Virtual, Hardware, getAllWindows, sleep, GlobalHotkey } = require("keysender");
const pixels = require("image-pixels");
const { parse } = require("ini")
const { readFileSync } = require("fs");

let option = parse(readFileSync("./option.ini", "utf8"));

/* The bot will activate these buffs when launched and will rebuff
 each buff after the given period of time */

const playerBuffs = option.buffs

/* The bot will use these skills during attacking
 process with the provided interval */

const playerSkills = option.skills

/* The speed of the bot determines when it should analyze radar again after
reaching a point of destination, it should be the same as the speed of your character */

const speed = Number(option.bot.botSpeed);

/* find the name of the window by using getAllWindows function and change this regExp */
const serverName = /Asterios/;

/* Find the window with the given tittle and determine delay of the clicks/keys sending */
let gameWindow = getAllWindows().find(({ title }) => serverName.test(title));
if (!gameWindow) throw new Error(`The game isn't opened. Open the game first.`);
const { handle } = gameWindow;

const { workwindow: w, mouse: m, keyboard: k } = new Hardware(handle)
const display = w.getView();

w.setForeground();

const delay = Number(option.bot.botDelay);
const dps = speed * 0.60;

m.buttonTogglerDelay = delay;
k.keyTogglerDelay = delay;
k.keySenderDelay = delay


class Vec {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  plus(vec) {
    return new Vec(this.x + vec.x, this.y + vec.y);
  }

  get dist() {
    return Math.sqrt(Math.pow(Math.abs(this.x), 2) + Math.pow(Math.abs(this.y), 2));
  }

  click(repeat = 1) {
    m.moveTo(this.x, this.y, delay);
    for (let i = 0; i < repeat; i++) {
      m.click("left", delay, delay)
    }
  }

  get colorNow() {
    return w.colorAt(this.x, this.y);
  }
}

class Buff {
  constructor(op, time) {
    this.op = op;
    this.time = time;
    this.wait = false
  }

  active() {
    if (!this.wait) {
      console.log(`Used skill on "${this.op}" position.`);
      k.sendKey(this.op, delay, delay);
      sleep(1000); /* casting time */
      this.wait = true;
      setTimeout(() => {
        this.wait = false;
      }, this.time);
    }
  };
}

class Bot {
  constructor(ui) {
    this.ui = ui;
    this.state = "working";
    this.memory = [];
    this.stuckTime = Date.now();
  }

  async analyze() {

    /* We capture the radar image and check for the red points on it to find
       the closest monster in relation to the center of the radar */

    console.log(`Bot state: Analyzing`);
    let { radar } = this.ui;

    let mobs = [];
    let height = Math.floor(radar.height / 2);
    let width = Math.floor(radar.width / 2);

    let { data: rgb } = await pixels(w.capture(radar).data, { width: radar.width, height: radar.height });

    for (let y = -height, i = 0; y < height; y++) {
      for (let x = -width; x < width; x++, i += 4) {
        if ((rgb[i] - rgb[i + 1] > 100) && (rgb[i] - rgb[i + 2] > 100)) {
          mobs.push(new Vec(x, y));
        }
      }
    }

    if (mobs.length < 1) return null;

    let closestMob = mobs.reduce((a, b) => {
      if (a.dist < b.dist)
        return a
      else
        return b
    });

    return closestMob;
  };

  async move(dir) {

    /* We move to the given position in relation to the center of the game window,
       we need to make move function async because if the bot stuck we need to pause
       the main loop */

    console.log(`Bot state: Moving`);
    let { center } = this.ui;

    if (this.state != `stuck`)
      this.memory.push(new Vec(-dir.x, -dir.y));


    /* if we haven't got a target in 20 sec we are probably stuck */
    if (Date.now() - this.stuckTime > 20000) {
      await this.unstuck();
    } else {
      center.plus(dir).click();
    }

  }

  check(dir) {
    console.log(`Bot state: Checking`);
    let { mobEnd } = this.ui;

    /* We find how much time do we need before the next analyze of the radar,
       we don't need it to run 100% of the distance and keep it at 70% so the bot
       never stops after reaching the destination */

    let checkTime = ((dir.dist / dps) * 1000) * 0.70;

    return new Promise((resolve, reject) => {
      let startTime = Date.now();

      function checking() {
        /* We give some time (150ms) for the window with hp to open */
        k.sendKey(`f1`, delay, 150);

        /* We check if there's a window with mob hp*/
        if (mobEnd.colorNow == mobEnd.color)
          resolve(true);
        else if (Date.now() - startTime > checkTime)
          resolve(false);
        else
          setImmediate(checking);
      };

      setImmediate(checking);
    });
  };

  attack() {
    console.log(`Bot state: Attacking`);

    let { mobEnd, mobStart, botEnd, botStart } = this.ui;

    let skills = [];
    for (let skill of Object.keys(playerSkills)) {
      skills.push(new Buff(skill, Number(playerSkills[skill]) * 1000));
    }


    k.sendKey("f2", delay, delay);
    this.stuckTime = Date.now();

    if (option.bot.botSpoil) {
      k.sendKey(option.spoil.spoilKey, delay, delay);
    }

    return new Promise((resolve, reject) => {
      let bot = this;
      function attacking() {

        /* We reapply all the skills at the given perion of time */
        for (let skill of skills) skill.active();

        /* We drink potion if our hp isn't full */
        if (botEnd.colorNow != botEnd.color)
          k.sendKey("f4", delay, delay)

        /* If the bot is dead we stop the script */
        if (botStart.colorNow != botStart.color) {
          process.exit();
        }

        if (mobStart.colorNow != mobStart.color) {
          /* We wait 250 ms before picking cuz sometimes bot makes
          1-2 blows even if the mob is already dead */
          sleep(250);
          for (let i = 0; i < 8; i++) {
            /* 150ms delay after every picking cuz it might take some
            time for the bot to run up to the loot lying around */
            k.sendKey("f3", delay, 150)
          }

          if (option.bot.botSpoil) {
            k.sendKey(option.spoil.sweepKey, delay, 250);
          }

          k.sendKey(`escape`, delay, delay);
          /* reset stuckTime */
          bot.stuckTime = Date.now();
          resolve();
        } else if (Date.now() - bot.stuckTime > 20000 && mobEnd.colorNow == mobEnd.color) {
          /* if we haven't inflicted any damage in 20 sec, we are probably stuck (or mob is in textures) */
          console.log(`Bot state: Stuked in textures + mob`);
          k.sendKey(`escape`, delay, delay);;
          bot.unstuck(resolve);
        } else {
          setTimeout(attacking, 100);
        }
      }

      setTimeout(attacking, 100);
    });
  };

  async unstuck(resolve) {
    /* Unstucking process is just running 3 move functions back where we came from using the memory */

    console.log(`Bot state: unstucking`);
    this.stuckTime = Date.now();
    this.state = `stuck`;
    for (let i = 0; i < 5; i++) {
      let dir = this.memory.pop();
      if (!dir) {
        throw new Error(`No memory paths available, find a spot with the mobs`)
        process.exit();
      }
      this.move(dir);
      sleep((dir.dist / dps) * 1000);
    }; ""
    this.state = `working`;
    if (resolve) resolve();
  }

  static create() {
    let { width, height } = display;

    let center = new Vec(width / 2, height / 2);
    let radar = { x: width - 113, y: 67, width: 44, height: 44 };
    let hp = {
      mobStart: new Vec(center.x - 65, 28),
      mobEnd: new Vec(center.x + 286, 28),
      botStart: new Vec(22, 47),
      botMid: new Vec(250, 47),
      botEnd: new Vec(325, 47),
    };

    // resetUi(center, hp);

    let buffs = [];
    for (let buff of Object.keys(playerBuffs)) {
      buffs.push(new Buff(buff, Number(playerBuffs[buff]) * 1000));
    }

    let ui = { center, radar, ...hp, buffs };
    return new Bot(ui);
  }
}

function relDir({ x, y }) {
  /* relative to the main screen coordinates */
  x *= 58;
  y *= 58;

  let { width, height } = display;

  /* we limit the area to make the analyzing more precise (by making it more often because of limitation) */
  let maxX = Math.floor(width * 0.30);
  let maxY = Math.floor(height * 0.30);

  if (x < -maxX) x = -maxX;
  else if (x > maxX) x = maxX;

  if (y < -maxY) y = -maxY;
  else if (y > maxY) y = maxY;

  return new Vec(x, y)
}

function resetUi(center, hp) {
  /* reset the UI */

  k.sendKey([`alt`, `l`], delay, 500);

  /* relocate buffs info-panel */

  if (option.bot.relocateUiBuffs) {
    m.moveTo(185, 5);
    m.toggle(true, "left", delay);
    m.move(210, 0, delay);
    m.toggle(false, "left", delay);
  }

  /* make bot's and mob's hp wider */

  hp.botStart.click();
  sleep(500);
  m.moveTo(177, 60, delay);
  m.toggle(true, "left");
  m.moveTo(177 + 210, 60, delay);
  m.toggle(false, "left");
  m.moveTo(center.x + 93, 30, delay);
  m.toggle(true, "left");
  m.moveTo(center.x + 93 + 210, 30, delay);
  m.toggle(false, "left");

  /* get hp colors */

  for (let i of Object.keys(hp)) {
    hp[i].color = hp[i].colorNow;
  }

  /* camera optimization */

  m.moveTo(center.x, center.y, delay);
  m.toggle(true, "right");
  let { x, y } = center.plus(new Vec(0, 300));
  m.moveTo(x, y);
  m.toggle(false, "right");

  for (let i = 0; i < 50; i++) {
    m.scrollWheel(1);
  }

  /* enlarge radar */

  m.moveTo(display.width - 15, 135);
  for (let i = 0; i < 3; i++) {
    m.click("left", delay, delay);
  }

  k.sendKey(`escape`, delay, delay);
}

let fishingActive = false;
let middleWidth = display.width / 2;
let middleHeight = display.height / 2;
let fishingVec = new Vec(middleWidth - 225, middleHeight - 140)
let reelingVec = new Vec(fishingVec.x + 122, fishingVec.y + 248);
let clockVec = new Vec(fishingVec.x + 114, fishingVec.y + 229);
let lastColor = null;

let lastKnownHealth = null;
let healthMovedCounter = 0;
let healthStayCounter = 0;
let reelingInProgress = false;



function startFishing() {
  console.log('start fishing...');
  k.sendKey(`f1`, delay, delay);
  fishingActive = true;
}

function reelFish() {
  color = w.colorAt(reelingVec.x, reelingVec.y);
  let clockColor = w.colorAt(clockVec.x, clockVec.y);
  if (clockColor === 'dedbde' || clockColor === '8f8e68') {
    if (!reelingInProgress) {
      reelingInProgress = true;
      sleep(100);
    }
    lastColor = color;

    let health = getBarPercentage();
    
    if (health !== null && health !== 0) {
      if (lastKnownHealth !== null) {
        if (health > lastKnownHealth) {
          console.log(lastKnownHealth, health);
          lastKnownHealth = health;
          console.log('Health increased!')
          healthMovedCounter++;
          healthStayCounter = 0;
        } else {
          console.log('Health not moving...');
          healthStayCounter++;
        }
      }
    } else {
      console.log('health null :(');
    }
    if (healthStayCounter > 2) {
      healthStayCounter = 0;
      healthMovedCounter = 0;
      lastKnownHealth = null;
      k.sendKey(`f2`, delay, delay);
      sleep(2300);
    } else if (healthMovedCounter > 0) {
        healthStayCounter = 0;
        healthMovedCounter = 0;
        lastKnownHealth = null;
        k.sendKey(`f3`, delay, delay);
        sleep(2300);
    } else {
      if (lastKnownHealth === null && health !== 0 && health !== null) {
        console.log('Last know health from NULL to', health);
        lastKnownHealth = health;
      }
      if (health !== null && health !== 0) {
        sleep(250);
      } else {
        sleep(25);
      }
    }

   
  } else if (reelingInProgress) {
    reelingInProgress = false;
    fishingActive = false;
    lastKnownHealth = null;
    healthStayCounter = 0;
    healthMovedCounter = 0;
    sleep(500);
    k.sendKey(`f4`, delay, delay);
    sleep(100);
    k.sendKey(`f5`, delay, delay);
    sleep(100);
  }

}

function getBarPercentage() {
  let toReturArray = [];
  for (let t = 0; t < 4; t++) {
    let total = 0;
    let health = 0;
    for (let i = -105; i <= 115; i = i + 5) {
      let color = w.colorAt(reelingVec.x + i, reelingVec.y);
      const valueHp = colorDistance('00689f', color);
      const valueEmpty = colorDistance('260c0b', color);
      // console.log(color, valueHp, valueEmpty);
      if (valueHp >= 0 && valueHp <= 10) {
        total++;
        health++;
      } else {
        total++;
      }
      // sleep(100);
    }
    // sleep(1000)
    // console.log('===');
    toReturArray.push(Math.floor(health / total * 100));
  }

  const allEqual = arr => arr.every( v => v === arr[0] )
  // console.log(toReturArray)
  if (allEqual(toReturArray)) {
    return toReturArray[0];
  }
  return null;
}

function colorDistance(color, pixel) {

  const { r: colorRed, g: colorGreen, b: colorBlue } = hexToRgb(color);
  const { r: pixelRed, g: pixelGreen, b: pixelBlue } = hexToRgb(pixel);

  var diffR, diffG, diffB;

  // distance to color
  diffR = (colorRed - pixelRed);
  diffG = (colorGreen - pixelGreen);
  diffB = (colorBlue - pixelBlue);
  return (Math.floor(Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB)));

}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

async function runBot() {

  let bot = Bot.create();

  // new GlobalHotkey({
  //   key: "space",
  //   action() {
  //     console.log(`Closing the bot...`);
  //     process.exit();
  //   }
  // });


  /* main loop */
  for (; ;) {
    if (!fishingActive) {
      startFishing();
    }
    reelFish();
    
  }
  /* finish main loop */
};

runBot();

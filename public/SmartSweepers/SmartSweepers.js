var Params = {
  pi: Math.PI,
  halfPi: Math.PI / 2,
  twoPi: Math.PI * 2,
  windowWidth: 400,
  windowHeight: 400,
  framesPerSecond: 0,
  maxTurnRate: 0,
  maxSpeed: 0,
  sweeperScale: 0,
  numSweepers: 0,
  numMines: 0,
  numTicks: 0,
  mineScale: 0,
  crossoverRate: 0,
  mutationRate: 0,
  maxPerturbation: 0,
  numElite: 0,
  numCopiesElite: 0
};

var SmartSweepers = {};

function clamp(arg, min, max) {
  if (arg < min) arg = min;
  if (arg > max) arg = max;
  return arg;
}

function Sweeper(params) {
  var config = Sweeper.config;

  this.brain = new Brain.NeuralNet({
    bias: config.neuralNetBias,
    inputCount: config.neuralNetInputCount,
    outputCount: config.neuralNetOutputCount,
    hiddenLayerCount: config.neuralNetHiddenLayerCount,
    activationResponse: config.neuralNetActivationResponse,
    hiddenLayerNeuronCount: config.neuralNetHiddenLayerNeuronCount
  });
  this.params = params;

  this.position = new SmartSweepers.Vector2d(
    Math.random() * params.windowWidth,
    Math.random() * params.windowHeight
  );
  this.direction = new SmartSweepers.Vector2d();
  this.rotation = Math.random() * params.twoPi;
  this.speed = 0;
  this.lTrack = 0.16;
  this.rTrack = 0.16;
  this.fitness = 0;
  this.scale = params.sweeperScale;
  this.iClosestMine = 0;
}

Sweeper.prototype = {
  update: function (mines, sweepers) {
    var inputs = [];

    var closestMineRaw = this.getClosestMine(mines);
    var closestSweeperRaw = this.getClosestSweeper(sweepers);

    var closestMine = SmartSweepers.vector2dNormalize(closestMineRaw);
    var closestSweeper = SmartSweepers.vector2dNormalize(closestSweeperRaw);

    this.closestMine = closestMine;
    this.closestSweeper = closestSweeper;

    inputs.push(closestMine.x);
    inputs.push(closestMine.y);

    inputs.push(closestSweeper.x);
    inputs.push(closestSweeper.y);

    inputs.push(this.direction.x);
    inputs.push(this.direction.y);

    inputs.push(this.speed);

    var output = this.brain.update(inputs);

    if (output.length < Sweeper.config.outputCount) return false;

    this.lTrack = output[0];
    this.rTrack = output[1];

    var rotForce = this.lTrack - this.rTrack;

    rotForce = clamp(rotForce, -this.params.maxTurnRate, this.params.maxTurnRate);

    this.rotation += rotForce;
    this.speed = (this.lTrack + this.rTrack);

    this.direction.x = -Math.sin(this.rotation);
    this.direction.y =  Math.cos(this.rotation);

    this.position.x += this.speed * this.direction.x;
    this.position.y += this.speed * this.direction.y;

    if (this.position.x > this.params.windowWidth) this.position.x = 0;

    if (this.position.x < 0) this.position.x = this.params.windowWidth;

    if (this.position.y > this.params.windowHeight) this.position.y = 0;

    if (this.position.y < 0) this.position.y = this.params.windowHeight;
    return true;
  },

  getClosestMine: function (mines) {
    var closestMineDist = 99999;
    var closestMine = null;

    for (let i = 0; i < mines.length; i++) {
      var distToMine = SmartSweepers.vector2dLength(
        SmartSweepers.vector2dSub(mines[i], this.position)
      );

      if (distToMine < closestMineDist) {
        closestMineDist = distToMine;
        closestMine = SmartSweepers.vector2dSub(this.position, mines[i]);
        this.iClosestMine = i;
      }
    }
    return closestMine;
  },

  getClosestSweeper: function (sweepers) {
    var closestSweeperDist = 99999;
    var closestSweeper = null;

    for (let i = 0; i < sweepers.length; i++) {
      if (this === sweepers[i]) continue;

      var dist = SmartSweepers.vector2dLength(
        SmartSweepers.vector2dSub(sweepers[i].position, this.position)
      );

      if (dist < closestSweeperDist) {
        closestSweeperDist = dist;
        closestSweeper = SmartSweepers.vector2dSub(this.position, sweepers[i].position);
        this.iClosestSweeper = i;
      }
    }
    return closestSweeper;
  },

  checkForMine: function (mines, size) {
    var distToMine = SmartSweepers.vector2dSub(this.position, mines[this.iClosestMine]);

    if (SmartSweepers.vector2dLength(distToMine) < (size + 5)) {
      return this.iClosestMine;
    }
    return -1;
  },

  reset: function () {
    this.position = new SmartSweepers.Vector2d(
      Math.random() * this.params.windowWidth,
      Math.random() * this.params.windowHeight
    );
    this.fitness = 0;
    this.rotation = Math.random() * this.params.twoPi;
  },

  incrementFitness: function () { this.fitness++; },

  getFitness: function () { return this.fitness; },

  putWeights: function (weights) { this.brain.putWeights(weights); },

  getNumWeights: function () { return this.brain.getNumWeights(); }
};

Sweeper.config = {
  neuralNetBias: -1,
  neuralNetInputCount: 7,
  neuralNetOutputCount: 2,
  neuralNetHiddenLayerCount: 1,
  neuralNetHiddenLayerNeuronCount: 6,
  neuralNetActivationResponse: 1
};

SmartSweepers.Sweeper = Sweeper;

var Controller = function (ctx, params) {
  var key;

  if (params == undefined) params = {};

  for (key in Params) {
    if (Params.hasOwnProperty(key)) {
      if (params[key] === undefined) params[key] = Params[key];
    }
  }
  this.ctx = ctx;
  this.params = params;
  this.ideas = null;
  this.sweepers = [];
  this.mines = [];
  this.wisdom = null;
  this.numSweepers = params.numSweepers;
  this.numMines = params.numMines;
  this.numWeightsForNN = 0;

  this.avgFitness = [];
  this.bestFitness = [];
  this.ticks = 0;
  this.generations = 0;

  this.cxClient = params.windowWidth;
  this.cyClient = params.windowHeight;

  this.fastRender = false;
  this.viewPaths = false;

  for (let i = 0; i < this.numSweepers; ++i) {
    this.sweepers.push(new SmartSweepers.Sweeper(params));
  }
  this.numWeightsForNN = this.sweepers[0].getNumWeights();

  this.wisdom = new Experience.Wisdom(
    this.numSweepers,
    params.mutationRate,
    params.crossoverRate,
    this.numWeightsForNN,
    params.maxPerturbation,
    params.numElite,
    params.numCopiesElite
  );

  this.ideas = this.wisdom.getIdeas();

  for (let i = 0; i < this.numSweepers; i++) {
    this.sweepers[i].putWeights(this.ideas[i].weights);
  }

  for (let i = 0; i < this.numMines; i++) {
    this.mines.push(new SmartSweepers.Vector2d(
      Math.random() * this.cxClient,
      Math.random() * this.cyClient
    ));
  }
};

Controller.prototype = {
  render: function () {
    var ctx = this.ctx;
    var adja, oppo, hypo, angle;
    var eliteStart = this.numSweepers - this.params.numElite;
    var eliteColor = ['rgb(225, 230, 234)', 'rgb(0, 255, 0)', 'rgb(255, 255, 0)'];

    ctx.clearRect(0, 0, this.params.windowWidth, this.params.windowHeight);
    ctx.beginPath();
    ctx.rect(0, 0, this.params.windowWidth, this.params.windowHeight);
    ctx.closePath();
    ctx.fillStyle = 'rgb(32, 36, 45)'; // canvas background
    ctx.fill();

    for (let i = 0; i < this.numMines; i++) {
      ctx.beginPath();

      // ctx.arc(x, y, r, sAngle, eAngle, counterclockwise);
      ctx.arc(this.mines[i].x, this.mines[i].y, 2, 0, this.params.twoPi);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgb(255, 102, 255)'; // Mines
      ctx.stroke();
    }

    for (let i = 0; i < this.numSweepers; i++) {
      ctx.beginPath();
      ctx.arc(this.sweepers[i].position.x, this.sweepers[i].position.y, 6, 0, this.params.twoPi);

      if (i === 0) {
        ctx.strokeStyle = eliteColor[2]; // Origin Yellow Sweeper
        ctx.lineWidth = 2.0;

      } else {
        if (i < eliteStart) {
          ctx.strokeStyle = eliteColor[0]; // Standard Gray Sweeper
          ctx.lineWidth = 1.0;
        }

        if (i === eliteStart) {
          if (this.sweepers[i].iClosestMine > 0) {

            // radii draw from first elite sweeper center
            adja = this.sweepers[i].position.x - this.mines[this.sweepers[i].iClosestMine].x;
            oppo = this.sweepers[i].position.y - this.mines[this.sweepers[i].iClosestMine].y;
            hypo = Math.sqrt(adja * adja + oppo * oppo);
            angle = Math.asin(oppo / hypo) * 180 / this.params.pi;

            ctx.moveTo(this.sweepers[i].position.x, this.sweepers[i].position.y);
            ctx.lineTo(
              this.sweepers[i].position.x + Math.cos(angle) * 5,
              this.sweepers[i].position.y + Math.sin(angle) * 5,
            );
/**
            // radii draw from targeted mine
            adja = this.mines[this.sweepers[i].iClosestMine].x - this.sweepers[i].position.x;
            oppo = this.mines[this.sweepers[i].iClosestMine].y - this.sweepers[i].position.y;
            hypo = Math.sqrt(adja * adja + oppo * oppo);
            angle = Math.asin(oppo / hypo) * 180 / this.params.pi;
            ctx.moveTo(
              this.mines[this.sweepers[i].iClosestMine].x,
              this.mines[this.sweepers[i].iClosestMine].y
            );
            ctx.lineTo(
              this.mines[this.sweepers[i].iClosestMine].x + Math.cos(angle) * 5,
              this.mines[this.sweepers[i].iClosestMine].y + Math.sin(angle) * 5,
            );
*/
          }
          ctx.strokeStyle = eliteColor[1]; // Elite Bold Green Sweeper
          ctx.lineWidth = 2.0;
        }

        if (i > eliteStart) {
          ctx.strokeStyle = eliteColor[1]; // Elite Green Sweeper
          ctx.lineWidth = 1.0;
        }
      }
      ctx.stroke();
    }

    if (this.viewPaths) {
      for (let i = 0; i < this.numSweepers; i++) {
        if (this.sweepers[i].iClosestMine > 0) { // < 0) continue;
          if (i === 0 || i === eliteStart) {
            ctx.beginPath();
            ctx.moveTo(this.sweepers[i].position.x, this.sweepers[i].position.y);
            ctx.lineTo(
              this.mines[this.sweepers[i].iClosestMine].x,
              this.mines[this.sweepers[i].iClosestMine].y
            );
            if (i === 0) ctx.strokeStyle = eliteColor[2]; // Yellow
            if (i === eliteStart) ctx.strokeStyle = eliteColor[1]; // Green
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        }
      }
    } else {
      for (let i = 0; i < this.numSweepers; i++) {
        if (this.sweepers[i].iClosestMine > 0) {
          if (i === 0 || i === eliteStart) {

       // switch to following line for radii from mine
       // if (i === 0) {

            ctx.beginPath();
            ctx.arc(
              this.mines[this.sweepers[i].iClosestMine].x,
              this.mines[this.sweepers[i].iClosestMine].y, 2, 0, this.params.twoPi
            );
          }
          if (i === 0) ctx.strokeStyle = eliteColor[2]; // Yellow

          // disable the next line for radii from mine
          if (i === eliteStart) ctx.strokeStyle = eliteColor[1]; // Green

          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      }
    }
  }, // endo of render

  update: function () {
    var grabHit, sweeper;

    if (this.ticks++ < this.params.numTicks) {
      for (let i = 0; i < this.numSweepers; i++) {
        sweeper = this.sweepers[i];

        if (!sweeper.update(this.mines, this.sweepers)) {
          console.log("Wrong amount of NN inputs!");
          return false;
        }
        grabHit = sweeper.checkForMine(this.mines, this.params.mineScale);

        if (grabHit >= 0) {
          sweeper.incrementFitness();

          this.mines[grabHit] = new SmartSweepers.Vector2d(
            Math.random() * this.cxClient,
            Math.random() * this.cyClient
          );
        }
        this.ideas[i].fitness = this.sweepers[i].getFitness();
      }
    } else {
      this.avgFitness.push(this.wisdom.getAvgFitness());
      this.bestFitness.push(this.wisdom.getBestFitness());
      ++this.generations;
      this.ticks = 0;
      this.ideas = this.wisdom.epoch(this.ideas);

      for (let i = 0; i < this.numSweepers; i++) {
        this.sweepers[i].putWeights(this.ideas[i].weights);
        this.sweepers[i].reset();
      }
    }
    return true;
  },

  getFastRender: function () { return this.fastRender; },

  setFastRender: function (fastRender) { this.fastRender = fastRender; },

  toggleFasterRender: function () { this.fastRender = !this.fastRender; },

  getViewPaths: function () { return this.viewPaths; },

  setViewPaths: function (viewPaths) { this.viewPaths = viewPaths; },

  toggleViewPaths: function () { this.viewPaths = !this.viewPaths; },

  getExperience: function () {
    var sweepers = this.sweepers;
    var max = sweepers.length;
    var result = [];

    for (let i = 0; i < max; i++) {
      result.push(sweepers[i].brain.layers);
    }
    return result;
  },

  setExperience: function (experience) {
    var sweepers = this.sweepers;
    var max = sweepers.length;

    for (let i = 0; i < max; i++) {
      sweepers[i].brain.layers = experience[i];
    }
  }
};

SmartSweepers.Controller = Controller;

function Vector2d(x, y) {
  this.x = x || 0;
  this.y = y || 0;
}

Vector2d.prototype = {
  add: function (rhs) {
    this.x += rhs.x;
    this.y += rhs.y;
    return this;
  },

  sub: function (rhs) {
    this.x -= rhs.x;
    this.y -= rhs.y;
    return this;
  },

  mul: function (rhs) {
    this.x *= rhs.x;
    this.y *= rhs.y;
    return this;
  },

  div: function (rhs) {
    this.x /= rhs.x;
    this.y /= rhs.y;
    return this;
  }
};

SmartSweepers.Vector2d = Vector2d;

SmartSweepers.vector2dAdd = function (lhs, rhs) {
  return new Vector2d(lhs.x + rhs.x, lhs.y + rhs.y);
};

SmartSweepers.vector2dSub = function (lhs, rhs) {
  return new Vector2d(lhs.x - rhs.x, lhs.y - rhs.y);
};

SmartSweepers.vector2dMul = function (lhs, rhs) {
  return new Vector2d(lhs.x * rhs.x, lhs.y * rhs.y);
};

SmartSweepers.vector2dDiv = function (lhs, rhs) {
  return new Vector2d(lhs.x / rhs.x, lhs.y / rhs.y);
};

SmartSweepers.vector2dLength = function (vector2d) {
  return Math.sqrt(vector2d.x * vector2d.x + vector2d.y * vector2d.y);
};

SmartSweepers.vector2dDot = function (v1, v2) {
  return v1.x * v2.x + v1.y * v2.y;
};

SmartSweepers.vector2dSign = function (v1, v2) {
  if (v1.y * v2.x > v1.x * v2.y) {
    return 1;
  } else {
    return -1;
  }
};

SmartSweepers.vector2dNormalize = function (v) {
  var vLength = SmartSweepers.vector2dLength(v);
  v.x = v.x / vLength;
  v.y = v.y / vLength;
  return v;
};

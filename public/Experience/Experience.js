var Experience = {
  Idea: function (weights, fitness) {
    this.weights = weights;
    this.fitness = fitness || 0;
  }
};

// Object Constructor
function Wisdom(ideaCount, mutationRate, crossoverRate, weightCount, maxPerturbation, numElite, numCopiesElite) {
  this.ideaCount = ideaCount;
  this.weightCount = weightCount;
  this.mutationRate = mutationRate;
  this.maxPerturbation = maxPerturbation;
  this.numElite = numElite;
  this.numCopiesElite = numCopiesElite;
  this.crossoverRate = crossoverRate;
  this.totalFitness = 0;
  this.bestFitness = 0;
  this.avgFitness = 0;
  this.lowestFitness = Wisdom.defaults.worstFitness;
  this.bestIdea = 0;

  var weights;
  var ideas = this.ideas = [];

  for (let i = 0; i < ideaCount; i++) {
    weights = [];

    for (let j = 0; j < weightCount; j++) {
      weights.push(Math.random() - Math.random());
    }
    ideas.push(new Experience.Idea(weights));
  }
}

Wisdom.prototype = {
  experiment: function (existing1, existing2, new1, new2) {
    var crossoverPoint;

    if (Math.random() > this.crossoverRate) {
      for (let i = 0; i < existing1.weights.length; i++) {
        new1.weights[i] = existing1.weights[i];
        new2.weights[i] = existing2.weights[i];
      }
      new1.fitness = existing1.fitness;
      new2.fitness = existing2.fitness;

    } else {
      crossoverPoint = Math.floor((Math.random() * (this.weightCount - 1)));

      for (let i = 0; i < crossoverPoint; i++) {
        new1.weights[i] = existing1.weights[i];
        new2.weights[i] = existing2.weights[i];
      }

      for (let i = crossoverPoint; i < existing1.weights.length; i++) {
        new1.weights[i] = existing1.weights[i];
        new2.weights[i] = existing2.weights[i];
      }
    }
    new1.fitness = existing1.fitness;
    new2.fitness = existing2.fitness;
    return this;
  },

  hypothesize: function (idea) {
    var max = idea.weights.length;

    for (let i = 0; i < max; i++) {
      if (Math.random() < this.mutationRate) {
        idea.weights[i] += (Math.random() - Math.random()) * this.maxPerturbation;
      }
    }
    return this;
  },

  selectIdea: function () {
    var slice = Math.random() * this.totalFitness;
    var idea = null;
    var currentFitness = 0;

    for (let i = 0; i < this.ideaCount; i++) {
      currentFitness += this.ideas[i].fitness;

      if (currentFitness >= slice) {
        idea = this.ideas[i];
        break;
      }
    }
    return idea;
  },

  getBestIdeas: function (bestCount, copiesCount) {
    bestCount = bestCount || this.numElite;
    copiesCount = copiesCount || this.numCopiesElite;

    var ideas = [];

    while (bestCount--) {
      for (let i = 0; i < copiesCount; i++) {
        ideas.push(this.ideas[(this.ideaCount - 1) - bestCount]);
      }
    }
    return ideas;
  },

  calculateBestWorstAvTot: function () {
    this.totalFitness = 0;
    var bestFitness = 0;
    var lowestFitness = this.lowestFitness;

    for (let i = 0; i < this.ideaCount; i++) {
      if (this.ideas[i].fitness > bestFitness) {
        bestFitness = this.ideas[i].fitness;
        this.bestFitness = bestFitness;
        this.bestIdea = this.ideas[i];
      }

      if (this.ideas[i].fitness < lowestFitness) {
        lowestFitness = this.ideas[i].fitness;
        this.lowestFitness = lowestFitness;
      }
      this.totalFitness += this.ideas[i].fitness;
    }
    this.avgFitness = this.totalFitness / this.ideaCount;
    return this;
  },

  reset: function () {
    this.totalFitness = 0;
    this.bestFitness = 0;
    this.lowestFitness = Wisdom.defaults.worstFitness;
    this.avgFitness = 0;
    return this;
  },

  epoch: function (oldIdeas) {
    this.ideas = oldIdeas;
    this.reset();

    this.ideas.sort(function (a, b) {
      if (a.fitness > b.fitness) {
        return 1;
      } else if (a.fitness < b.fitness) {
        return -1;
      } else {
        return 0;
      }
    });

    this.calculateBestWorstAvTot();
    var bestIdeas = this.getBestIdeas();
    var existing1, existing2, new1, new2;

    while (bestIdeas.length < this.ideaCount) {
      existing1 = this.selectIdea();
      existing2 = this.selectIdea();
      new1 = new Experience.Idea([this.weightCount]);
      new2 = new Experience.Idea([this.weightCount]);
      this.experiment(existing1, existing2, new1, new2).hypothesize(new1).hypothesize(new2);
      bestIdeas.push(new1);
      bestIdeas.push(new2);
    }
    this.ideas = bestIdeas;
    return this.ideas;
  },

  getIdeas: function () { return this.ideas; },

  getAvgFitness: function () { return this.avgFitness; },

  getBestFitness: function () { return this.bestFitness; },

  getBestIdea: function () { return this.bestIdea; }
};

Wisdom.defaults = { worstFitness: 9999999 };
Experience.Wisdom = Wisdom;

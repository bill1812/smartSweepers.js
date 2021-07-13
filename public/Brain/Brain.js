var Brain = {
  NeuronLayer: function (neuronCount, inputCount) {
    this.neurons = [];

    for (let i = 0; i < neuronCount; i++) {
      this.neurons.push(new Brain.Neuron(inputCount));
    }
  },

  Neuron: function (inputCount) {
    this.weights = [];

    for (let i = 0; i <= inputCount; i++) {
      this.weights.push(Math.random() - Math.random());
    }
  }
};

// Object Constructor
function NeuralNet(params) {
  this.bias = params.bias;
  this.inputCount = params.inputCount;
  this.outputCount = params.outputCount;
  this.hiddenLayerCount = params.hiddenLayerCount;
  this.activationResponse = params.activationResponse;
  this.hiddenLayerNeuronCount = params.hiddenLayerNeuronCount;
  this.layers = [];
  this.createNet();
}

NeuralNet.prototype = {
  createNet: function () {
    var max = this.hiddenLayerCount - 1;

    if (this.hiddenLayerCount > 0) {
      this.layers.push(new Brain.NeuronLayer(this.hiddenLayerNeuronCount, this.inputCount));

      for (let i = 0; i < max; i++) {
        this.layers.push(
          new Brain.NeuronLayer(this.hiddenLayerNeuronCount, this.hiddenLayerNeuronCount)
        );
      }
      this.layers.push(new Brain.NeuronLayer(this.outputCount, this.hiddenLayerNeuronCount));

    } else {
      this.layers.push(new Brain.NeuronLayer(this.outputCount, this.inputCount));
    }
  },

  getWeights: function () {
    var weights = [];
    var layer, neuron;

    for (let i = 0; i <= this.hiddenLayerCount; i++) {
      layer = this.layers[i];

      for (let j = 0; j < layer.neurons.length; j++) {
        neuron = layer.neurons[j];

        for (let k = 0; k < neuron.weights.length; k++) {
          weights.push(neuron.weights[k]);
        }
      }
    }
    return weights;
  },

  putWeights: function (weights) {
    var cWeight = 0;
    var layer, neuron;

    for (let i = 0; i <= this.hiddenLayerCount; i++) {
      layer = this.layers[i];

      for (let j = 0; j < layer.neurons.length; j++) {
        neuron = layer.neurons[j];

        for (let k = 0; k < neuron.weights.length; k++) {
          neuron.weights[k] = weights[cWeight++];
        }
      }
    }
  },

  getNumWeights: function () {
    var weights = 0;
    var layer, neuron;

    for (let i = 0; i < this.layers.length; i++) {
      layer = this.layers[i];

      for (let j = 0; j < layer.neurons.length; j++) {
        neuron = layer.neurons[j];

        for (let k = 0; k < neuron.weights.length; k++) {
          weights++;
        }
      }
    }
    return weights;
  },

  update: function (inputs) {
    var outputs = [];
    var weight = 0;
    var layer, neurons, neuron, netInput, inputCount;

    if (inputs.length != this.inputCount) return outputs;

    for (let i = 0; i <= this.hiddenLayerCount; i++) {
      layer = this.layers[i];
      neurons = layer.neurons;

      if (i > 0) inputs = outputs.slice(0);

      while (outputs.length > 0) {
        outputs.pop();
      }
      weight = 0;

      for (let j = 0; j < neurons.length; j++) {
        neuron = neurons[j];
        netInput = 0;
        inputCount = neuron.weights.length * 1;

        for (let k = 0; k < inputCount - 1; k++) {
          netInput += neuron.weights[k] * inputs[weight++];
        }
        netInput += neuron.weights[inputCount - 1] * this.bias;
        outputs.push(this.sigmoid(netInput, this.activationResponse));
        weight = 0;
      }
    }
    return outputs;
  },

  sigmoid: function (netInput, response) {
    return (1 / (1 + Math.exp(-netInput / response)));
  }
};

Brain.NeuralNet = NeuralNet;

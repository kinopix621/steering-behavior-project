class ActivationFunction {
  constructor(func) {
    this.func = func;
  }
}

let sigmoid = new ActivationFunction((x) => 1 / (1 + Math.exp(-x)));
let relu = new ActivationFunction((x) => Math.max(0, x));

/**
 * MLP : entrée → N couches cachées (même fonction d'activation) → sortie (sigmoid).
 * hiddenSizes : tableau de tailles, ex. [16, 16].
 */
class NeuralNetwork {
  constructor(input_nodes, hiddenSizes, output_nodes, actFuncType) {
    if (typeof hiddenSizes === 'number') hiddenSizes = [hiddenSizes];
    if (!hiddenSizes || hiddenSizes.length === 0) {
      hiddenSizes = [8];
    }

    this.input_nodes = input_nodes;
    this.hiddenSizes = hiddenSizes.map((n) => parseInt(n, 10));
    this.output_nodes = output_nodes;

    this.weightMatrices = [];
    this.biases = [];

    let prevSize = input_nodes;
    for (let h of this.hiddenSizes) {
      this.weightMatrices.push(new Matrix(h, prevSize));
      this.biases.push(new Matrix(h, 1));
      prevSize = h;
    }
    this.weightMatrices.push(new Matrix(output_nodes, prevSize));
    this.biases.push(new Matrix(output_nodes, 1));

    for (let m of this.weightMatrices) m.randomize();
    for (let b of this.biases) b.randomize();

    this._actType = actFuncType || 'sigmoid';
    this.setActivationFunction(this._actType);
  }

  /** Première couche cachée (compat lecture capteurs / ancien code). */
  get hidden_nodes() {
    return this.hiddenSizes[0];
  }

  setActivationFunction(type) {
    this._actType = type;
    if (type === 'relu') this.activation_function = relu;
    else this.activation_function = sigmoid;
  }

  predict(input_array) {
    let a = Matrix.fromArray(input_array);
    let L = this.weightMatrices.length;

    for (let layer = 0; layer < L; layer++) {
      a = Matrix.multiply(this.weightMatrices[layer], a);
      a.add(this.biases[layer]);
      let isOutput = layer === L - 1;
      if (isOutput) a.map(sigmoid.func);
      else a.map(this.activation_function.func);
    }

    return a.toArray();
  }

  copy() {
    let nn = new NeuralNetwork(
      this.input_nodes,
      this.hiddenSizes.slice(),
      this.output_nodes,
      this._actType
    );
    for (let i = 0; i < this.weightMatrices.length; i++) {
      for (let r = 0; r < nn.weightMatrices[i].rows; r++) {
        for (let c = 0; c < nn.weightMatrices[i].cols; c++) {
          nn.weightMatrices[i].data[r][c] = this.weightMatrices[i].data[r][c];
        }
      }
      for (let r = 0; r < nn.biases[i].rows; r++) {
        for (let c = 0; c < nn.biases[i].cols; c++) {
          nn.biases[i].data[r][c] = this.biases[i].data[r][c];
        }
      }
    }
    return nn;
  }
}

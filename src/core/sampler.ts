export interface Sampler {
  shouldSample(flow?: string): boolean;
}

export class ProbabilisticSampler implements Sampler {
  constructor(private rate: number) {}
  shouldSample() {
    return Math.random() < this.rate;
  }
}

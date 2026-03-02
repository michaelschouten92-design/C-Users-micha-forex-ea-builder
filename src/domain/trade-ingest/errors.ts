export class StrategyHaltedError extends Error {
  constructor(public readonly strategyId: string) {
    super(`Strategy ${strategyId} is halted`);
    this.name = "StrategyHaltedError";
  }
}

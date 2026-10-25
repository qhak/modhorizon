import { Agent, setGlobalDispatcher } from "undici";

/** Local only. Built-in fetch can supply its own lower headers/body timeout. */
export class LocalGenerationAgent extends Agent {
  constructor(timeoutMs = 650_000) {
    super();
    this.generationTimeoutMs = timeoutMs;
  }
  dispatch(options, handler) {
    return super.dispatch({ ...options, headersTimeout: this.generationTimeoutMs, bodyTimeout: this.generationTimeoutMs }, handler);
  }
}

// Only the configured local launcher enables this preload. Request AbortSignals
// still enforce each service's own shorter deadline. No retry agent is used.
if (process.env.MODHORIZON_LOCAL_HTTP === "true") setGlobalDispatcher(new LocalGenerationAgent());

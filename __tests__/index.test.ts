import 'openai/shims/node';
import { SmartError, configure } from "../src";

describe("SmartErrorLens", () => {
  beforeAll(() => {
    configure({
      apiKey: "test-key",
    });
  });

  it("should be defined", () => {
    expect(SmartError).toBeDefined();
  });

  it("should be a function", () => {
    expect(typeof SmartError).toBe("function");
  });
});

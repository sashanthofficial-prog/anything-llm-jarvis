const {
  DEFAULT_REASONING_MODEL,
  DEFAULT_VISION_MODEL,
  hasImageAttachment,
  isComplexPrompt,
  selectJarvisModel,
} = require("../../../../utils/helpers/jarvisModelRouter");

describe("JARVIS request-scoped model selection", () => {
  const base = {
    provider: "lmstudio",
    selectedModel: "qwen2.5-coder-7b-instruct",
    env: {},
  };

  it("keeps the manually selected model for ordinary prompts", () => {
    expect(
      selectJarvisModel({
        ...base,
        prompt: "What is the capital of India?",
      })
    ).toEqual({
      model: "qwen2.5-coder-7b-instruct",
      route: "default",
    });
  });

  it("does not mistake a short trick question for a complex task", () => {
    const prompt =
      "A farmer has 17 sheep. All but 9 run away. How many sheep remain?";
    expect(isComplexPrompt(prompt)).toBe(false);
    expect(selectJarvisModel({ ...base, prompt }).route).toBe("default");
  });

  it("uses the reasoning model for explicit multi-step or advanced work", () => {
    const selection = selectJarvisModel({
      ...base,
      prompt: "Please provide a rigorous step-by-step proof.",
    });
    expect(selection).toEqual({
      model: DEFAULT_REASONING_MODEL,
      route: "reasoning",
    });
  });

  it("uses the configured vision model whenever an image is attached", () => {
    const selection = selectJarvisModel({
      ...base,
      prompt: "Analyze this image and explain it.",
      attachments: [
        {
          mime: "image/png",
          contentString: "data:image/png;base64,AAAA",
        },
      ],
    });
    expect(selection).toEqual({
      model: DEFAULT_VISION_MODEL,
      route: "vision",
    });
  });

  it("gives image routing priority when a prompt is also complex", () => {
    const selection = selectJarvisModel({
      ...base,
      prompt: "Perform a deep analysis and prove what this image shows.",
      attachments: [
        {
          mime: "image/jpeg",
          contentString: "data:image/jpeg;base64,AAAA",
        },
      ],
    });
    expect(selection.route).toBe("vision");
  });

  it("ignores non-image attachments for vision routing", () => {
    expect(
      hasImageAttachment([
        {
          mime: "application/pdf",
          contentString: "data:application/pdf;base64,AAAA",
        },
      ])
    ).toBe(false);
    expect(
      selectJarvisModel({
        ...base,
        attachments: [
          {
            mime: "application/pdf",
            contentString: "data:application/pdf;base64,AAAA",
          },
        ],
      }).route
    ).toBe("default");
  });

  it("supports custom reasoning and vision model preferences", () => {
    const env = {
      JARVIS_REASONING_MODEL_PREF: "custom/reasoning-model",
      JARVIS_VISION_MODEL_PREF: "custom/vision-model",
    };
    expect(
      selectJarvisModel({
        ...base,
        prompt: "Do a formal proof.",
        env,
      }).model
    ).toBe("custom/reasoning-model");
    expect(
      selectJarvisModel({
        ...base,
        attachments: [{ mime: "image/webp", contentString: "AAAA" }],
        env,
      }).model
    ).toBe("custom/vision-model");
  });

  it("does not route other providers or when automatic routing is disabled", () => {
    expect(
      selectJarvisModel({
        ...base,
        provider: "openai",
        prompt: "Do a formal proof.",
      }).route
    ).toBe("default");
    expect(
      selectJarvisModel({
        ...base,
        prompt: "Do a formal proof.",
        env: { JARVIS_AUTO_ROUTING: "false" },
      }).route
    ).toBe("default");
  });
});

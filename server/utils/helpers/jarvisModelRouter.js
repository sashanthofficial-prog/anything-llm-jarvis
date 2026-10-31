/**
 * JARVIS request-scoped model selection for LM Studio.
 *
 * The workspace model remains the user's manually selected default. A route
 * only changes the connector created for the current request.
 */

const DEFAULT_REASONING_MODEL = "qwen/qwen3-4b-thinking-2507";
const DEFAULT_VISION_MODEL = "qwen2-vl-2b-instruct";

const COMPLEX_PROMPT_PATTERNS = [
  /\b(multi[- ]step|step[- ]by[- ]step|think harder|reason carefully|deep(?:ly)? analyze|deep(?:ly)? analyse|rigorous(?:ly)?|formal proof|prove|proof|derive|derivation)\b/i,
  /\b(system design|software architecture|architect(?:ure)? a system|security audit|threat model|root cause analysis|algorithm analysis|time complexity|space complexity|race condition|deadlock|memory leak)\b/i,
  /\b(complex|non[- ]trivial|advanced reasoning|evaluate trade[- ]offs|compare trade[- ]offs|multiple constraints)\b/i,
];

function isImageAttachment(attachment = {}) {
  return (
    typeof attachment.mime === "string" &&
    attachment.mime.toLowerCase().startsWith("image/") &&
    typeof attachment.contentString === "string" &&
    attachment.contentString.length > 0
  );
}

function hasImageAttachment(attachments = []) {
  return Array.isArray(attachments) && attachments.some(isImageAttachment);
}

function isComplexPrompt(prompt = "") {
  const text = typeof prompt === "string" ? prompt.trim() : "";
  if (!text) return false;
  return COMPLEX_PROMPT_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Selects a model for one request. It never mutates workspace settings.
 *
 * @param {{
 *   provider?: string|null,
 *   selectedModel?: string|null,
 *   prompt?: string,
 *   attachments?: Array<{mime?: string, contentString?: string}>,
 *   env?: NodeJS.ProcessEnv
 * }} options
 * @returns {{model: string|null, route: "default"|"reasoning"|"vision"}}
 */
function selectJarvisModel({
  provider,
  selectedModel = null,
  prompt = "",
  attachments = [],
  env = process.env,
} = {}) {
  const defaultRoute = { model: selectedModel, route: "default" };

  if (
    provider !== "lmstudio" ||
    env.JARVIS_AUTO_ROUTING === "false" ||
    env.JARVIS_AUTO_ROUTING === "0"
  ) {
    return defaultRoute;
  }

  // Image routing has priority over text complexity. The vision model is used
  // only for the request carrying the image attachment.
  if (hasImageAttachment(attachments)) {
    return {
      model: env.JARVIS_VISION_MODEL_PREF || DEFAULT_VISION_MODEL,
      route: "vision",
    };
  }

  if (isComplexPrompt(prompt)) {
    return {
      model: env.JARVIS_REASONING_MODEL_PREF || DEFAULT_REASONING_MODEL,
      route: "reasoning",
    };
  }

  return defaultRoute;
}

module.exports = {
  DEFAULT_REASONING_MODEL,
  DEFAULT_VISION_MODEL,
  isImageAttachment,
  hasImageAttachment,
  isComplexPrompt,
  selectJarvisModel,
};

# JARVIS automatic model routing

JARVIS adds request-scoped model selection for LM Studio without changing the
workspace's saved chat model.

## Default model setup

The model selected in the workspace is the normal model. For the current
local setup, that is:

- Default: `qwen2.5-coder-7b-instruct`
- Reasoning: `qwen/qwen3-4b-thinking-2507`
- Vision: `qwen2-vl-2b-instruct`

The reasoning and vision preferences can be overridden with environment
variables:

```dotenv
JARVIS_AUTO_ROUTING=true
JARVIS_REASONING_MODEL_PREF=qwen/qwen3-4b-thinking-2507
JARVIS_VISION_MODEL_PREF=qwen2-vl-2b-instruct
```

These variables belong in the server environment. Do not put API keys or
authentication tokens in this file or commit a populated `.env`.

## Routing priority

For requests using the `lmstudio` provider:

1. An image attachment with an `image/*` MIME type selects the vision model.
2. Otherwise, prompts matching the advanced-reasoning patterns select the
   reasoning model.
3. All other prompts use the model currently selected in the workspace.

Image routing has priority if an image and a reasoning phrase appear together.
Non-image attachments do not activate the vision route. The selected model is
used only to construct the connector for the current request; the workspace's
`chatModel` value is not changed.

The reasoning classifier is deliberately a lightweight heuristic, not a
second LLM classifier. It recognises explicit requests such as multi-step or
step-by-step reasoning, proofs and derivations, system design, software
architecture, security audits, threat models, algorithm/time-complexity
analysis, and similar advanced tasks. It may occasionally classify a prompt
incorrectly; the test suite covers the expected basic cases.

## Agents and developer API

The same request-scoped selection is applied to LM Studio agent sessions. An
explicit workspace agent model remains the agent's default model; otherwise,
the workspace's selected LM Studio chat model is used as the agent default
when available. Agent sessions re-check the current turn's prompt when they
resolve a route, so a later complex prompt is not judged using only the first
message. Image and reasoning routes are temporary for the invocation. The
existing AnythingLLM agent and skill interfaces are not replaced.

The developer API's synchronous and streaming workspace-chat paths use the
same model selection. For a reasoning route, they also resolve and pass the
model's supported reasoning-effort option rather than selecting the reasoning
model without enabling its reasoning mode.

## Compatibility and limitations

- This routing applies only when the resolved provider is LM Studio.
- The existing AnythingLLM Model Router is left unchanged. Do not enable it in
  a workspace where you want the JARVIS manual-default workflow.
- The native reasoning-effort control remains tied to the manually selected
  model's reported LM Studio capabilities. An automatically routed reasoning
  request asks for reasoning mode only when the model reports that option.
- The image model and reasoning model must be installed/available in LM Studio.
- This source change does not rebuild the AnythingLLM Desktop Electron
  wrapper. A separate packaging step is required before it can be installed as
  a custom Windows desktop application.

## Verification checklist

Run the focused helper tests from the server directory:

```bash
yarn jest __tests__/utils/helpers/jarvisModelRouter.test.js --runInBand
```

Then test manually with LM Studio running:

1. Ask a normal question and confirm the selected workspace model remains in
   the response metrics.
2. Ask for a rigorous proof or step-by-step analysis and confirm the reasoning
   model appears in the server logs/response metrics.
3. Attach an image and confirm the vision model appears in the logs/metrics.
4. Send a normal text message after the image and confirm the manually selected
   workspace model is used again.
5. Repeat the image and reasoning checks through an agent invocation, including a later turn with a different prompt.
6. Check both synchronous and streaming developer API chat endpoints with a reasoning-triggering prompt.

These checks must be run against a locally built server before treating the
customization as verified. A successful GitHub commit alone is not a runtime
test.

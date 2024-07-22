async function applyDamageFromMessage({ message, multiplier = 1 }: ApplyDamageFromMessageParams): Promise<void> {
  // Get active tokens
  // Do damage to tokens based on the message
  // Copying the style from https://github.com/foundryvtt/pf2e/blob/59cb2907071333012f8ff2185a614dcc0bfe2450/src/module/chat-message/helpers.ts#L63
}

interface ApplyDamageFromMessageParams {
  message: String;
  multiplier?: number;
}

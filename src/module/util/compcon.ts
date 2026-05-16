import type { PackedPilotData } from "./unpacking/packed-types";

export async function fetchPilotViaShareCode(sharecode: string): Promise<PackedPilotData> {
  const shareCodeResponse = await fetch("https://api.compcon.app/share?code=" + sharecode, {
    headers: {
      "x-api-key": "fcFvjjrnQy2hypelJQi4X9dRI55r5KuI4bC07Maf",
    },
  });

  const shareObj = await shareCodeResponse.json();
  const pilotResponse = await fetch(shareObj["presigned"]);
  return await pilotResponse.json();
}

import { PackedPilotData } from "./unpacking/packed-types";

// we only cache the id, cloud ids, and name; we're going to fetch all other data on user input
// the point of the cache is not have the pilot actor window to wait for network calls
// this does mean that the GM needs to refresh foundry to clear this cache if they add pilots
// (they could also re-login, we initiate a cache refresh there)

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

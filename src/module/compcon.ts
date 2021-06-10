import { PackedPilotData } from "machine-mind";
import Auth from "@aws-amplify/auth";
import Storage from "@aws-amplify/storage";

// we don't cache anything other than id/name; we're going to fetch all other data on user input
// but we don't want the pilot actor window to wait for network calls
// this does mean that the GM needs to refresh foundry to clear this cache if they add pilots
// (they could also re-login, we initiate a cache refresh there)
let pilotCache: Array<{ id: string; name: string }> = [];

export async function populatePilotCache(): Promise<Array<{ id: string; name: string }>> {
  await Auth.currentSession(); // refresh the token if we need to
  const res = await Storage.list("pilot", { level: "protected" });
  const data: Array<PackedPilotData> = await Promise.all(res.map((obj: { key: string }) => fetchPilot(obj.key)));
  data.forEach(pilot => (pilot.mechs = []));
  pilotCache = data;
  return data;
}

export function pilotNames(): Array<{ id: string; name: string }> {
  return pilotCache;
}

export async function fetchPilot(id: string): Promise<PackedPilotData> {
  if (id.substring(0, 6) != "pilot/") {
    id = "pilot/" + id;
  }
  try {
    await Auth.currentSession(); // refresh the token if we need to
  } catch {
    ui.notifications.error("Sync failed - you aren't logged into a Comp/Con account.");
  }
  const res = (await Storage.get(id, { level: "protected", download: true })) as any;
  const text = await res.Body.text();
  return JSON.parse(text);
}

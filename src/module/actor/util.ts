import * as mm from "machine-mind";
import { EntryType, OpCtx, Pilot, RegPilotData } from "machine-mind";
import { cloud_sync } from "machine-mind/dist/funcs";
import { create_compendium_reg, FoundryReg } from "../mm-util/foundry-reg";

export async function import_pilot_by_code(code: string): Promise<mm.Pilot> {
  let data = await mm.funcs.gist_io.download_pilot(code);

  // Need these for initial pilot instantiation
  let foundry_reg = new FoundryReg();
  let import_ctx = new OpCtx();
  let pilot = await foundry_reg.create_live(EntryType.PILOT, import_ctx);

  // Then delegate to cloud sync
  let comp_reg = create_compendium_reg();
  await cloud_sync(data, pilot, comp_reg);
  
  // Return our new pilot
  return pilot
}

// Updates a pilot by the specified code
export async function update_pilot_by_code(pilot: Pilot, code: string) {
  let data = await mm.funcs.gist_io.download_pilot(code);

  // Delegate to cloud sync
  let comp_reg = create_compendium_reg();
  await cloud_sync(data, pilot, comp_reg);
}

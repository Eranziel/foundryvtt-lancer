# Migration notes

## Core Bonus
* New fields: actions, bonuses, synergies, counters, deployables, integrated

## Frame
* Migrated fields:
  * None!
* New fields: stats.stress, stats.structure, y_pos, image_url, other_art
  * core_system: use, activation, active_actions, active_bonuses, active_synergies, deactivation, counters, deployables, integrated, passive_actions, passive_bonuses, passive_name, passive_effect, passive_synergies

## License
* Migrated fields:
  * id -> none
  * source -> manufacturer
  * ranks -> unlocks
* New fields: None!

## Weapon Mod
* All new.

## Mech System
* Migrated fields:
  * system_type -> type
  * effect: {} -> effect: "" (moved to actions, bonuses, synergies)
  * integrated: "" -> integrated: []
  * mod -> None
* New fields: actions, bonuses, synergies, deployables

## Mech Weapon
* Migrated fields:
  * mount -> size
  * weapon_type -> ????
  * damage -> profiles[0.damage]
  * range -> profiles[0.range]
  * effect: {} -> effect: "" (moved to actions, bonuses, synergies, profiles)
* New fields: actions, bonuses, synergies, deployables, profiles, selected_profile, integrated

## Pilot Armor
* Migrated fields:
  * `hp_bonus` -> `bonuses[hp]`
  * `speed_bonus` -> `bonuses[speed]`
  * `edef_bonus` -> `bonuses[edef]`
  * `evasion_bonus` -> `bonuses[evasion]`
  * speed, armor, edef, evasion -> ????
* New fields: actions, deployables, synergies
	  
## Pilot Gear
* Migrated fields:
  * None!
* New fields: actions, bonuses, deployables, synergies
	  
## Pilot Weapon
* Migrated fields:
  * custom_damage_type -> none
* New fields: actions, bonuses, deployables, synergies
	  
## Talent
* Migrated fields:
  * `rank` -> `curr_rank`
* New fields: icon, terse

## Skill
* New fields: family
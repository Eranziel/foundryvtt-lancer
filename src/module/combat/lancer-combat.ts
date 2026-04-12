/**
 * Overrides and extends the Combat class to use an activation model instead of
 * the standard ordered list of turns. {@link LancerCombat#activateCombatant}
 * is added to the interface.
 */
export class LancerCombat<SubType extends Combat.SubType = Combat.SubType> extends Combat<SubType> {
  protected override _sortCombatants(a: LancerCombatant, b: LancerCombatant): number {
    // Sort by Players then Neutrals then Hostiles
    const dc = b.disposition - a.disposition;
    if (dc !== 0) return dc;
    return super._sortCombatants(a, b);
  }

  protected override async _preCreate(
    ...[data, options, user]: Parameters<Combat["_preCreate"]>
  ): Promise<boolean | void> {
    this.updateSource({ turn: null });
    return super._preCreate(data, options, user);
  }

  async _manageTurnEvents() {
    // Avoid the Foundry bug where this is called on create, before this.previous is set.
    if (!this.previous) return;
    super._manageTurnEvents();
  }

  /**
   * Set all combatants to their max activations
   */
  async resetActivations(): Promise<LancerCombatant[]> {
    const skipDefeated = this.settings.skipDefeated;
    const updates = this.combatants.map(c => {
      return {
        _id: c.id,
        "system.activations.value": skipDefeated && c.isDefeated ? 0 : (c.activations.max ?? 0),
      };
    });
    return this.updateEmbeddedDocuments("Combatant", updates);
  }

  override async startCombat(): Promise<this> {
    this._playCombatSound("startEncounter");
    const updateData = { round: 1, turn: null };
    Hooks.callAll("combatStart", this, updateData);
    await this.resetActivations();
    await this.update(updateData);
    return this;
  }

  override async nextRound(): Promise<this> {
    await this.resetActivations();
    const updateData = { round: this.round + 1, turn: null };
    let advanceTime = Math.max(this.turns.length - (this.turn || 0), 0) * CONFIG.time.turnTime;
    advanceTime += CONFIG.time.roundTime;
    const updateOptions = { advanceTime, direction: 1 } as const;
    Hooks.callAll("combatRound", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /**
   * Ends the current turn without starting a new one
   */
  override async nextTurn(): Promise<this> {
    const updateData = { turn: null };
    const updateOptions = { advanceTime: 0, direction: 0 } as const;
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    await this.update(updateData, updateOptions as unknown as Combat.Database.UpdateOperation);
    return this;
  }

  override async previousRound(): Promise<this> {
    await this.resetActivations();
    const round = Math.max(this.round - 1, 0);
    let advanceTime = 0;
    if (round > 0) advanceTime -= CONFIG.time.roundTime;
    const updateData = { round, turn: null };
    const updateOptions = { advanceTime, direction: -1 } as const;
    Hooks.callAll("combatRound", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /**
   * End the current turn and refund the activation
   */
  override async previousTurn() {
    if (this.turn === null) return this;
    const updateData = { turn: null };
    const updateOptions = { advanceTime: -CONFIG.time.turnTime, direction: -1 };
    await this.combatant?.modifyCurrentActivations(1);
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    await this.update(updateData, updateOptions as unknown as Combat.Database.UpdateOperation);
    return this;
  }

  override async resetAll(): Promise<this> {
    await this.resetActivations();
    this.combatants.forEach(c => c.updateSource({ initiative: null }));
    await this.update({ turn: null, combatants: this.combatants.toObject() }, { diff: false });
    return this;
  }

  /**
   * Filter out next up turn notifications sound since the next up isn't deterministic
   */
  override _playCombatSound(...[announcement]: Parameters<Combat["_playCombatSound"]>) {
    if (announcement === "nextUp") return;
    return super._playCombatSound(announcement);
  }

  /**
   * Sets the active turn to the combatant passed by id or calls
   * {@link LancerCombat#requestActivation()} if the user does not have
   * permission to modify the combat
   */
  async activateCombatant(id: string, override = false): Promise<this | undefined> {
    if (!(game.user?.isGM || (this.turn == null && this.combatants.get(id)?.isOwner) || override))
      return this.requestActivation(id);
    const combatant = this.getEmbeddedDocument("Combatant", id, {});
    if (!combatant?.activations.value) return this;
    await combatant?.modifyCurrentActivations(-1);
    const turn = this.turns.findIndex(t => t.id === id);
    const updateData = { turn };
    const updateOptions = { advanceTime: CONFIG.time.turnTime, direction: 1 as const };
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /**
   * Sets the active turn back to 0 (no active unit) if the passed id
   * corresponds to the current turn and the user has ownership of the
   * combatant.
   */
  async deactivateCombatant(id: string) {
    const turn = this.turns.findIndex(t => t.id === id);
    if (turn !== this.turn) return this;
    if (!this.turns[turn].testUserPermission(game.user!, "OWNER") && !game.user?.isGM) return this;
    return this.nextTurn();
  }

  /**
   * Calls any Hooks registered for "LancerCombatRequestActivate".
   */
  protected async requestActivation(id: string): Promise<this> {
    Hooks.callAll("LancerCombatRequestActivate", this, id);
    return this;
  }
}

export class LancerCombatant<SubType extends Combatant.SubType = Combatant.SubType> extends Combatant<SubType> {
  override prepareBaseData(): void {
    super.prepareBaseData();
    this.initiative ??= 0;
  }

  /**
   * The current activation data for the combatant.
   */
  get activations(): Activations {
    return this.system.activations;
  }

  /**
   * The disposition for this combatant. In order, manually specified for this
   * combatant, token disposition, token disposition for the associated actor,
   * -2.
   */
  get disposition(): number {
    const disposition =
      <number>this.system.disposition ?? this.token?.disposition ?? this.actor?.prototypeToken.disposition ?? -2;
    if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY && this.hasPlayerOwner) return 2;
    return disposition;
  }

  /**
   * Adjusts the number of activations that a combatant can take
   * @param num - The number of maximum activations to add (can be negative)
   */
  async addActivations(num: number): Promise<this | undefined> {
    if (num === 0) return this;
    return this.update({
      system: {
        activations: {
          max: Math.max((this.activations.max ?? 1) + num, 1),
          value: Math.max((this.activations.value ?? 0) + num, 0),
        },
      },
    });
  }

  /**
   * Adjusts the number of current activations that a combatant has
   * @param num - The number of current activations to add (can be negative)
   */
  async modifyCurrentActivations(num: number): Promise<this | undefined> {
    if (num === 0) return this;
    return this.update({
      system: {
        activations: {
          value: Math.clamp((this.activations?.value ?? 0) + num, 0, this.activations?.max ?? 1),
        },
      },
    });
  }
}

/**
 * Interface for the activations object
 */
interface Activations {
  max?: number;
  value?: number;
}

declare module "fvtt-types/configuration" {
  namespace Hooks {
    interface HookConfig {
      /**
       * A hook event that fires when a Combat encounter is started.
       * This event fires on the initiating client before any database update occurs.
       * @param combat     - The Combat encounter which is starting
       * @param updateData - An object which contains Combat properties that will be updated. Can be mutated.
       */
      combatStart: (
        combat: Combat.Implementation,
        updateData: {
          /** The initial round */
          round: number;
          /** The initial turn */
          turn: number | null;
        }
      ) => void;

      /**
       * A hook event that fires when the turn of the Combat encounter changes.
       * This event fires on the initiating client before any database update occurs.
       * @param combat        - The Combat encounter which is advancing or rewinding its turn
       * @param updateData    - An object which contains Combat properties that will be updated. Can be mutated.
       * @param updateOptions - An object which contains options provided to the update method. Can be mutated.
       */
      combatTurn: (
        combat: Combat.Implementation,
        updateData: {
          /** The current round of combat */
          round?: number;

          /** The new turn number */
          turn: number | null;
        },
        updateOptions: {
          /** The amount of time in seconds that time is being advanced */
          advanceTime: number;

          /** A signed integer for whether the turn order is advancing or rewinding */
          direction: number;
        }
      ) => void;

      LancerCombatRequestActivate: (combat: Combat.Implementation, id: string) => void;
    }
  }

  interface FlagConfig {
    Combatant: {
      lancer: {
        activations: Activations;
        disposition?: number;
        tour: string;
      };
    };
  }
}

/**
 * Overrides and extends the Combat class to use an activation model instead of
 * the standard ordered list of turns. {@link LancerCombat#activateCombatant}
 * is added to the interface.
 */
export class LancerCombat extends Combat {
  protected override _sortCombatants(a: LancerCombatant, b: LancerCombatant): number {
    // Sort by Players then Neutrals then Hostiles
    const dc = b.disposition - a.disposition;
    if (dc !== 0) return dc;
    return super._sortCombatants(a, b);
  }

  protected override async _preCreate(...[data, options, user]: Parameters<Combat["_preCreate"]>): Promise<void> {
    // @ts-expect-error v10
    this.updateSource({ turn: null });
    return super._preCreate(data, options, user);
  }

  async _manageTurnEvents(adjustedTurn: any) {
    // Avoid the Foundry bug where this is called on create, before this.previous is set.
    if (!this.previous) return;
    // @ts-expect-error v10 types
    super._manageTurnEvents(adjustedTurn);
  }

  /**
   * Set all combatants to their max activations
   */
  async resetActivations(): Promise<LancerCombatant[]> {
    const module = CONFIG.LancerInitiative.module;
    const skipDefeated = "skipDefeated" in this.settings && this.settings.skipDefeated;
    const updates = this.combatants.map(c => {
      return {
        _id: c.id,
        [`flags.${module}.activations.value`]:
          // @ts-expect-error V10 typings
          skipDefeated && c.isDefeated ? 0 : (<LancerCombatant>c).activations.max ?? 0,
      };
    });
    return <Promise<LancerCombatant[]>>this.updateEmbeddedDocuments("Combatant", updates);
  }

  override async startCombat(): Promise<this | undefined> {
    await this.resetActivations();
    return this.update({ round: 1, turn: null });
  }

  override async nextRound(): Promise<this | undefined> {
    await this.resetActivations();
    const updateData = { round: this.round + 1, turn: null };
    let advanceTime = Math.max(this.turns.length - (this.turn || 0), 0) * CONFIG.time.turnTime;
    advanceTime += CONFIG.time.roundTime;
    const updateOptions = { advanceTime, direction: 1 };
    Hooks.callAll("combatRound", this, updateData, updateOptions);
    return this.update(updateData, updateOptions as any);
  }

  /**
   * Ends the current turn without starting a new one
   */
  override async nextTurn(): Promise<this | undefined> {
    const updateData = { turn: null };
    const updateOptions = { advanceTime: 0, direction: 0 };
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions as any);
  }

  override async previousRound(): Promise<this | undefined> {
    await this.resetActivations();
    const round = Math.max(this.round - 1, 0);
    let advanceTime = 0;
    if (round > 0) advanceTime -= CONFIG.time.roundTime;
    const updateData = { round, turn: null };
    const updateOptions = { advanceTime, direction: -1 };
    Hooks.callAll("combatRound", this, updateData, updateOptions);
    return this.update(updateData, updateOptions as any);
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
    return this.update(updateData, updateOptions as any);
  }

  override async resetAll(): Promise<this | undefined> {
    await this.resetActivations();
    // @ts-expect-error V10 typings
    this.combatants.forEach(c => c.updateSource({ initiative: null }));
    return this.update({ turn: null, combatants: this.combatants.toObject() }, { diff: false });
  }

  /**
   * Sets the active turn to the combatant passed by id or calls
   * {@link LancerCombat#requestActivation()} if the user does not have
   * permission to modify the combat
   */
  async activateCombatant(id: string, override = false): Promise<this | undefined> {
    if (!(game.user?.isGM || (this.turn == null && this.combatants.get(id)?.isOwner) || override))
      return this.requestActivation(id);
    const combatant = <LancerCombatant | undefined>this.getEmbeddedDocument("Combatant", id);
    if (!combatant?.activations.value) return this;
    await combatant?.modifyCurrentActivations(-1);
    const turn = this.turns.findIndex(t => t.id === id);
    const updateData = { turn };
    const updateOptions = { advanceTime: CONFIG.time.turnTime, direction: 1 };
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions as any);
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

export class LancerCombatant extends Combatant {
  /**
   * This just fixes a bug in foundry 0.8.x that prevents Combatants with no
   * associated token or actor from being modified, even by the GM
   */
  override testUserPermission(...[user, permission, options]: Parameters<Combatant["testUserPermission"]>): boolean {
    return this.actor?.testUserPermission(user, permission, options) ?? user.isGM;
  }

  override prepareBaseData(): void {
    super.prepareBaseData();
    const module = CONFIG.LancerInitiative.module;
    if (
      // @ts-expect-error
      this.flags?.[module]?.activations?.max === undefined &&
      canvas?.ready
    ) {
      const activations = foundry.utils.getProperty(this.actor?.getRollData() ?? {}, "activations") ?? 1;
      // @ts-expect-error v10
      this.updateSource({
        [`flags.${module}.activations`]: {
          max: activations,
          value: (this.parent?.round ?? 0) > 0 ? activations : 0,
        },
      });
    }
    // @ts-expect-error v10
    this.initiative ??= 0;
  }

  /**
   * The current activation data for the combatant.
   */
  get activations(): Activations {
    const module = CONFIG.LancerInitiative.module;
    return <Activations>this.getFlag(module, "activations") ?? {};
  }

  /**
   * The disposition for this combatant. In order, manually specified for this
   * combatant, token dispostion, token disposition for the associated actor,
   * -2.
   */
  get disposition(): number {
    const module = CONFIG.LancerInitiative.module;
    return (
      <number>this.getFlag(module, "disposition") ??
      (this.actor?.hasPlayerOwner ?? false
        ? 2
        : // @ts-expect-error v10
          this.token?.disposition ??
          // @ts-expect-error v10
          this.actor?.prototypeToken.disposition ??
          -2)
    );
  }

  /**
   * Adjusts the number of activations that a combatant can take
   * @param num - The number of maximum activations to add (can be negative)
   */
  async addActivations(num: number): Promise<this | undefined> {
    const module = CONFIG.LancerInitiative.module;
    if (num === 0) return this;
    return this.update({
      [`flags.${module}.activations`]: {
        max: Math.max((this.activations.max ?? 1) + num, 1),
        value: Math.max((this.activations.value ?? 0) + num, 0),
      },
    });
  }

  /**
   * Adjusts the number of current activations that a combatant has
   * @param num - The number of current activations to add (can be negative)
   */
  async modifyCurrentActivations(num: number): Promise<this | undefined> {
    const module = CONFIG.LancerInitiative.module;
    if (num === 0) return this;
    return this.update({
      [`flags.${module}.activations`]: {
        // @ts-expect-error v12
        value: Math.clamp((this.activations?.value ?? 0) + num, 0, this.activations?.max ?? 1),
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

/**
 * Watches for exact changes in its payload, detected by monitoring changes int its payload is stringified to JSON
 */
export class ChangeWatchHelper {
  // The previous value, and it stringified
  prior_value: any = null;
  prior_string = "";

  // The current value, and it stringified
  curr_value: any = null;
  curr_string = "";

  // Whether a call to setValue changed the value.
  isDirty: boolean = false;

  // Clears dirty
  public clean() {
    this.isDirty = true;
  }

  /**
   * Set the value, returning true (and marking self as "dirty") if its different from our initial value
   * Initial call will never mark dirty bit
   * @param to
   */
  public setValue(to: any): boolean {
    // Propagate if not first, flag otherwise
    let first = false;
    if (!this.curr_string) {
      first = true;
    } else {
      this.prior_value = this.curr_value;
      this.prior_string = this.curr_string;
    }

    // Compute new
    this.curr_value = to;
    this.curr_string = JSON.stringify(to);

    // If first, initial mimic
    if (first) {
      this.prior_string = this.curr_string;
      this.prior_value = this.curr_value;
    }

    // Test change
    if (!first && !this.isDirty) {
      this.isDirty = this.curr_string != this.prior_string;
    }
    return this.isDirty;
  }
}

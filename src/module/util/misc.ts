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

  // Whether the most recent setValue changed the value
  invalid: boolean = false;

  /**
   * Set the value, returning true (and marking self as "invalid")
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
    this.invalid = this.curr_string != this.prior_string;
    return this.invalid;
  }
}

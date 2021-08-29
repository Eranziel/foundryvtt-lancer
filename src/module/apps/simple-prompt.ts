// Spawn a simple dialogue to edit a string. Returns null on close
export function promptText(title: string, prefill: string = ""): Promise<string | null> {
  return new Promise((succ, _rej) => {
    new Dialog(
      {
        title,
        content: ` 
          <div class="form-group">  
            <input id="textval" style="width: 100%;" value="${prefill}"></input>
          </div>
          <hr>
        `,
        buttons: {
          confirm: {
            label: `Confirm`,
            callback: async dialog_html => {
              // Get the value
              let new_val: string = ($(dialog_html).find("#textval")[0] as HTMLInputElement).value;
              succ(new_val);
            },
          },
        },
        close: () => succ(null),
        default: "confirm",
      },
      {
        classes: ["lancer"],
      }
    ).render(true);
  });
}

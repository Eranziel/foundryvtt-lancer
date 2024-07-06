# Contributing Macros

The LANCER system ships with macros for various side functions. The process of
adding or modifying these macros is unfortunately not as straight forward as
simply pasting the new script content into the yml files.

In order to add or edit a macro and submit the changes for inclusion, follow
these steps.

## Step by Step guide

### 1. Set up a development environment

[Development Setup Wiki
Page](https://github.com/Eranziel/foundryvtt-lancer/wiki/Development-Setup)

This is necessary to import and export the macro from the compendium.

### 2. Rebuild the packs

```sh
$ npx gulp build_packs
```

This ensures that the packs are up to date.

### 3. Edit the macro inside foundry

Unlock the compendium by right clicking on it and selectiong "Toggle Edit
Lock". Foundry will war about editing a compendium that does not belong to the
world. Select yes, and then open the macro from the compendium. If you are
adding a new macro, you'll want to drag the macro into the compendium. Make
sure that it's in the correct folder.

### 4. Format the macro code using prettier

Copy the macro code into your editor and run prettier on it using the system
prettier configuration. You can also save the macro code in a .js file and run
`npx prettier --write <yourmacro>.js`. After the code has been formatted copy
the formatted version into the macro inside foundry.

### 5. Test

Thoroughly test your changes to the macro to ensure that it works properly for
a wide variety of cases.

### 6. Shutdown foundry

Re-lock the compendium and shut down foundry. This is important, since the
foundry database engine locks the files when in use, potentially causing
errors.

### 7. Extract the compendium

```sh
$ npx gulp extract_packs
```

This will extract the macros into yaml files for inclusion in the repository
allowing for easier tracking of the edit history of the individual macros.

### 8. Commit the modified macro

Commit the new or modified file corresponding to the macro you were working on.
Other files may show as changed after unpacking, but those can be ignored
safely.


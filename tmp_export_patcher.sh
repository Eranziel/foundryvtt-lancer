TMP="./tmp_type_fix"

# Fixup the league types
FVTT_TYPES="node_modules/@league-of-foundry-developers/foundry-vtt-types/package.json"
jq -r ".exports.\"./*\" |= \"./*\"" $FVTT_TYPES > $TMP
mv $TMP $FVTT_TYPES
const traitConfig = require('../traits-configuration.json')
import fs from 'fs';

const ho = () => {
  let totalTraits = 0;
  for (const val of Object.values(traitConfig.breakdown)) {
    totalTraits += Object.keys(val).length
  }
  console.log({totalTraits})
}

const roles = () => {
  const filenames = fs.readdirSync('./assets')
  const roles = {

  };
  for (const filename of filenames) {
    if (!filename.includes('.json')) continue;
    const ass = require(`../assets/${filename}`)
    for (const attr of ass.attributes) {
      if (attr.trait_type === 'Role') {
        if(!roles[attr.value]) {
          roles[attr.value] = 1;
        } else {
          roles[attr.value]++;
        }
      }
    }
  }

  console.log(roles);
}

ho();
roles();
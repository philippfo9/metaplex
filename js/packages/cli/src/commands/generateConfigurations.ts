import fs from 'fs';
import log from 'loglevel';

import { generateRandoms } from '../helpers/various';

const { readdir, writeFile } = fs.promises;

export type TTraitValue =
  | number
  | ({
      [otherAttr: string]: {
        [otherTraitVal: string]: number;
      };
    } & {
      baseValue: number;
    });

export type TTraitGroup = {
  [traitName: string]: TTraitValue;
};

export type TBreakdown = {
  [traitGroup: string]: TTraitGroup;
};

export type TConfig = { [key: string]: any; breakdown: TBreakdown };

export async function generateConfigurations(
  traits: string[],
): Promise<boolean> {
  let generateSuccessful: boolean = true;
  const configs: TConfig = {
    name: '',
    symbol: '',
    description: '',
    creators: [],
    dnp: {},
    premadeCustoms: [],
    collection: {},
    breakdown: {},
    order: traits,
    width: 1000,
    height: 1000,
  };

  try {
    await Promise.all(
      traits.map(async trait => {
        const attributes = await readdir(`./traits/${trait}`);
        const randoms = generateRandoms(attributes.length - 1);
        const tmp = {};

        attributes.forEach((attr, i) => {
          tmp[attr] = randoms[i];
        });

        configs['breakdown'][trait] = tmp;
      }),
    );
  } catch (err) {
    generateSuccessful = false;
    log.error('Error created configurations', err);
    throw err;
  }

  try {
    await writeFile('./traits-configuration.json', JSON.stringify(configs));
  } catch (err) {
    generateSuccessful = false;
    log.error('Error writing configurations to configs.json', err);
    throw err;
  }

  return generateSuccessful;
}

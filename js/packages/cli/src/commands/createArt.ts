import os from 'os';
import fs from 'fs';
const gifFrames = require('gif-frames');
import { writeFile } from 'fs/promises';
import { createCanvas, loadImage } from 'canvas';
import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';
import log from 'loglevel';

import { readJsonFile } from '../helpers/various';
import { ASSETS_DIRECTORY, TRAITS_DIRECTORY } from '../helpers/metadata';
import { Stream } from 'form-data';
const GIFEncoder = require('gifencoder');

function makeCreateImageWithCanvas(order, width, height) {
  return function makeCreateImage(canvas, context) {
    return async function createImage(image) {
      const start = Date.now();
      const ID = parseInt(image.id, 10) - 1;
      const gifCur = order.find(
        cur => image[cur] && image[cur].includes('.gif'),
      );

      if (gifCur) {
        const loadGifCur = async (gifCur: any) => {
          const encoder = new GIFEncoder(width, height);
          encoder
            .createReadStream()
            .pipe(fs.createWriteStream(`${ASSETS_DIRECTORY}/${ID}.gif`));
          encoder.start();
          encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
          encoder.setDelay(33); // frame delay in ms
          encoder.setQuality(10); // image quality. 10 is default.
          context.patternQuality = 'best';
          context.quality = 'best';
          console.log(order, image);
          const gifLocation = `${TRAITS_DIRECTORY}/${gifCur}/${image[gifCur]}`;
          const frameData = await gifFrames({
            url: gifLocation,
            frames: 'all',
            outputType: 'png',
          });

          for (const frame of frameData) {
            for (const cur of order) {
              if (cur === gifCur) {
                context.drawImage(
                  await loadImage(await stream2buffer(frame.getImage())),
                  0,
                  0,
                  width,
                  height,
                );
              } else {
                const imageLocation = `${TRAITS_DIRECTORY}/${cur}/${image[cur]}`;
                const loadedImage = await loadImage(imageLocation);
                context.drawImage(loadedImage, 0, 0, width, height);
              }
            }
            encoder.addFrame(context);
          }

          encoder.finish();

          return;
        };
        await loadGifCur(gifCur);
      }

      for (const cur of order) {
        let imgName = image[cur];
        if (!imgName) continue;
        if (!imgName.includes('.png')) imgName = imgName + '.png';
        const imageLocation = `${TRAITS_DIRECTORY}/${cur}/${imgName}`;
        const loadedImage = await loadImage(imageLocation);
        context.patternQuality = 'best';
        context.quality = 'best';
        context.drawImage(loadedImage, 0, 0, width, height);
      }
      const buffer = canvas.toBuffer('image/png');
      context.clearRect(0, 0, width, height);
      const optimizedImage = await imagemin.buffer(buffer, {
        plugins: [
          imageminPngquant({
            quality: [0.6, 0.95],
          }),
        ],
      });
      await writeFile(`${ASSETS_DIRECTORY}/${ID}.png`, optimizedImage);
      const end = Date.now();
      log.info(`Placed ${ID}.png into ${ASSETS_DIRECTORY}.`);
      const duration = end - start;
      log.info('Image generated in:', `${duration}ms.`);
    };
  };
}

const CONCURRENT_WORKERS = os.cpus().length;

const worker = (work, next_) => async () => {
  let next;
  while ((next = next_())) {
    await work(next);
  }
};

export async function createGenerativeArt(
  configLocation: string,
  randomizedSets,
) {
  const start = Date.now();
  const { order, width, height } = await readJsonFile(configLocation);
  const makeCreateImage = makeCreateImageWithCanvas(order, width, height);

  const imagesNb = randomizedSets.length;

  const workers = [];
  const workerNb = Math.min(CONCURRENT_WORKERS, imagesNb);
  log.info(`Instanciating ${workerNb} workers to generate ${imagesNb} images.`);
  for (let i = 0; i < workerNb; i++) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    const work = makeCreateImage(canvas, context);
    const w = worker(work, randomizedSets.pop.bind(randomizedSets));
    workers.push(w());
  }

  await Promise.all(workers);
  const end = Date.now();
  const duration = end - start;
  log.info(`Generated ${imagesNb} images in`, `${duration / 1000}s.`);
}

async function stream2buffer(stream: Stream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<any>();

    stream.on('data', chunk => _buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(_buf)));
    stream.on('error', err => reject(`error converting stream - ${err}`));
  });
}

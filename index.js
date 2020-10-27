/* eslint-disable no-console */

const fs = require('fs').promises;
const path = require('path');

const tourRd = require('./module/TourRd');

const getTourId = async () => {
  let listUrl = [];
  let page = 0;

  // Get Tour ID
  try {
    for (let i = 1; i <= 60; i++) {
      const listUrlPage = await tourRd.getListTours(`vietnam?page=${i}`);
      page = i;
      listUrl = [...listUrl, ...listUrlPage];
      console.log('done page:', i);
    }
  } catch (error) {
    console.log(error);
  } finally {
    await fs.writeFile(`Tour-Url-${page}.json`, JSON.stringify(listUrl));
    console.log('finished!!!');
  }
};

// for testing TourRd
const getTour = async (tourId) => {
  const tourData = await tourRd.getTourData(tourId);
  // let quickGet = await tourRd.getDataTour('1842');

  console.log(tourData);
};

const getTours = async (step, listUrl) => {
  const data = [];
  const reviews = [];
  const errorList = [];

  // listUrl.length
  for (let i = 0; i < step; i++) {
    try {
      const { tourData, tourReviews } = await tourRd.getTourData(listUrl[i]);

      data.push(tourData);
      reviews.push(tourReviews);

      console.log(
        `🌟🌟🌟: Complete tour ${i + 1} : id ${listUrl[i]}! Remaining: ${
          listUrl.length - i - 1
        } 🌟🌟🌟`
      );

      // listUrl[i] = 'ok';
    } catch (error) {
      const errorMessage = `💥💥💥: Error on tour ${i + 1} : id ${
        listUrl[i]
      } !!!: 💥💥💥`;

      // listUrl[i] = 'error';

      console.log(errorMessage, error);
      errorList.push({ tour: listUrl[i], error: error.toString() });
    }
  }

  return { data, reviews, errorList };
};

const runBatch = async (from = 0, to = 0, step = 10) => {
  const listUrl = JSON.parse(
    await fs.readFile(
      path.join(__dirname, 'File', 'Input', 'input.json'),
      'utf8'
    )
  );

  console.log(
    `👉👉👉Total Tours need to get: ${listUrl.length - from} !!!👈👈👈\n`
  );

  if (!to) to = listUrl.length;
  const timesRun = Math.ceil((to - from + 1) / step);

  for (let j = 0; j < timesRun; j += 1) {
    const startLoop = step * j + from;
    const stopLoop = startLoop + step - 1;

    console.log(`🥊🥊🥊Get tour from ${startLoop} to ${stopLoop}!!!🥊🥊🥊`);

    const listUrlPart = listUrl.slice(startLoop, stopLoop + 1);

    const { data, reviews, errorList } = await getTours(step, listUrlPart);

    const writeData = fs.writeFile(
      path.join(
        __dirname,
        'File',
        'Data',
        `Data from ${startLoop} to ${stopLoop} - ${data.length}.json`
      ),
      JSON.stringify(data)
    );

    const writeReviews = fs.writeFile(
      path.join(
        __dirname,
        'File',
        'Review',
        `Reviews from ${startLoop} to ${stopLoop} - ${reviews.length}.json`
      ),
      JSON.stringify(reviews)
    );

    let writeError = '';

    if (errorList.length)
      writeError = await fs.writeFile(
        path.join(
          __dirname,
          'File',
          'Error',
          `Error from ${startLoop} to ${stopLoop} - ${errorList.length}.json`
        ),
        JSON.stringify(errorList)
      );

    await Promise.all([writeData, writeReviews, writeError]);

    console.log(
      `\n👍👍👍 finished from ${startLoop} to ${stopLoop}!!!😆😆😆 Total Remaining: ${
        listUrl.length - stopLoop - 1
      } 😅😅😅\n`
    );
  }
};

(async () => {
  await tourRd.initialize();
  await runBatch(0, 1, 1);

  // await getTour('164411'); //188722
})();

// const file = await fs.readFile('filename.txt', 'utf8');
// await fs.writeFile('filename.txt', 'test');

const tourRd = require('./TourRd');
const fs = require('fs').promises;
const path = require('path');

(async () => {
  await tourRd.initialize();
  await runBatch(110, 150, 10);
})();

const runBatch = async (start, stop, step) => {
  let page = 0;

  let listUrl = JSON.parse(
    await fs.readFile(path.join(__dirname, 'Url', 'Tour-page-10.json'), 'utf8')
  );

  let totalQuantity = listUrl.length;
  console.log(`Total Tour to get: ${totalQuantity} !!!`);

  for (let j = 0; j < 7; j += 1) {
    let startLoop = step * j + start;
    let stopLoop = startLoop + step;

    console.log(`Get tour from ${startLoop} to ${stopLoop}!!!`);
    let listUrlPart = listUrl.slice(startLoop, stopLoop);

    let { result, errorList, listUrl: remainingList } = await getTours(
      step,
      listUrlPart
    );

    await fs.writeFile(
      `Data from ${startLoop} to ${stopLoop} - ${result.length}.json`,
      JSON.stringify(result)
    );

    await fs.writeFile(
      `Error from ${startLoop} to ${stopLoop} - ${errorList.length}.json`,
      JSON.stringify(errorList)
    );

    await fs.writeFile(
      `Log from ${startLoop} to ${stopLoop}.json`,
      JSON.stringify(remainingList)
    );

    console.log(`finished from ${startLoop} to ${stopLoop}!!!`);
  }
};

const getTourId = async () => {
  let listUrl = [];
  let page = 0;

  // Get Tour ID
  try {
    for (let i = 1; i <= 60; i++) {
      let listUrlPage = await tourRd.getListTours(`vietnam?page=${i}`);
      page = i;
      listUrl = [...listUrl, ...listUrlPage];
      console.log('done page: ', i);
    }
  } catch (e) {
    console.log(e);
  } finally {
    await fs.writeFile(`Tour-Url-${page}.json`, JSON.stringify(listUrl));
    console.log('finished!!!');
  }
};

const getTours = async (step, listUrl) => {
  let result = [];
  let errorList = [];

  // listUrl.length
  for (let i = 0; i < step; i++) {
    try {
      let resultItem = await tourRd.getTourData(listUrl[i]);

      result.push(resultItem);

      console.log(
        `Done tour ${i + 1} : id ${listUrl[i]}! Remaining: ${
          listUrl.length - i - 1
        }`
      );

      listUrl[i] = 'ok';
    } catch (e) {
      let errorMessage = `Error on tour ${i + 1} : id ${listUrl[i]} !!!`;

      listUrl[i] = 'error';

      console.log(errorMessage, e);
      errorList.push({ tour: listUrl[i], error: e });
    }
  }

  console.log(listUrl);
  console.log(typeof listUrl);

  return { result, errorList, listUrl };
};

const getTour = async () => {
  let quickGet = await tourRd.getDataTour('59429');
  // let quickGet = await tourRd.getDataTour('1842');

  console.log(quickGet);
};

// const file = await fs.readFile('filename.txt', 'utf8');
// await fs.writeFile('filename.txt', 'test');

const puppeteer = require('puppeteer');
const to = require('./catchError');

const SUBPAGE_URL = (country) => `https://www.tourradar.com/d/${country}`;
const SUBPAGE_TOUR_URL = 'https://www.tourradar.com/t/';

const self = {
  browser: null,

  initialize: async () => {
    self.browser = await puppeteer.launch(); //{ headless: false }
  },

  getListTours: async (country) => {
    // Go to the page
    let getListPage = await self.browser.newPage();
    await getListPage.goto(SUBPAGE_URL(country), { waitUntil: 'networkidle0' });

    let elements = await getListPage.$$('.list >ul>li>div.bm');
    let listURL = [];

    for (let element of elements) {
      let url = await element.$eval('a[href]', (el) => el.href);

      url = url.replace(SUBPAGE_TOUR_URL, '');

      listURL.push(url);
    }

    await getListPage.waitFor(5000);
    return listURL;
  },

  getTourData: async (url) => {
    let getDataPage = await self.browser.newPage();

    let result = {
      name: '',
      duration: 0,
      travelStyle: [],
      oldPrice: 0,
      price: 0,
      summary: '',
      highlights: [],
      imageCover: '',
      images: [],
      destinations: [],
      timeline: [],
    };

    url = SUBPAGE_TOUR_URL.concat(url);

    await getDataPage.goto(url, {
      waitUntil: 'networkidle0',
    });

    result.name = await getDataPage.$eval(
      'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > h1',
      (el) => el.innerText
    );

    result.duration = await getDataPage.$eval(
      'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > div.ao-tour-above-fold__length',
      (el) => parseInt(el.outerText.replace(/[^0-9\.]/g, ''), 10)
    );

    let listStyle = await getDataPage.$$(
      'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > ul >li'
    );

    for (let item of listStyle) {
      let url = await item.$eval('a', (el) => el.innerText);
      result.travelStyle.push(url);
    }

    result.price = await getDataPage.$eval(
      'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > div.ao-tour-above-fold__price-block.js-ao-tour-above-fold__price-block > div.ao-tour-above-fold__main-price > span.ao-tour-above-fold__price',
      (el) => parseInt(el.outerText.replace(/[^0-9\.]/g, ''), 10)
    );

    result.oldPrice = await to(
      getDataPage.$eval(
        'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > div.ao-tour-above-fold__price-block.js-ao-tour-above-fold__price-block > div.ao-tour-above-fold__price-from > div.ao-tour-above-fold__old-price',
        (el) => parseInt(el.outerText.replace(/[^0-9\.]/g, ''), 10)
      )
    );

    // try {
    // } catch (e) {
    //   console.error(e);
    // }

    let introductionButton = await getDataPage.$(
      'body > main > div:nth-child(4) > div.bl.bl--middle > div.ao-tour-block.js-ao-tour-block.js-ao-tour-itinerary.itn > ol:nth-child(5) > li'
    );

    if (introductionButton) {
      await introductionButton.click();
    }
    await getDataPage.waitForSelector('li.itn--first.active > div.i');

    // let summaryArray = await getDataPage.$$(
    //   'body > main > div:nth-child(4) > div.bl.bl--middle > div.ao-tour-block.js-ao-tour-block.js-ao-tour-itinerary.itn > ol:nth-child(5) > li.itn--first.active > div.i'
    // );

    // let tempSummary = '';

    // for (let item of summaryArray) {
    //   let summary = await (await item.getProperty('textContent')).jsonValue();
    //   tempSummary += summary;
    // }

    let tempSummary = await getDataPage.$eval(
      'body > main > div:nth-child(4) > div.bl.bl--middle > div.ao-tour-block.js-ao-tour-block.js-ao-tour-itinerary.itn > ol:nth-child(5) > li.itn--first.active > div.i',
      (el) => el.innerText
    );

    // for some summary too long
    result.summary =
      tempSummary.length > 1000 ? tempSummary.split('\n')[0] : tempSummary;
    // result.summary = tempSummary;

    if (result.summary === '') throw 'Summary is blank !!!';

    // let tourOperator = await getDataPage.$eval(
    //   'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > dl > div:nth-child(1) > dd',
    //   (el) => el.innerText
    // );

    // // return tourOperator === 'Intrepid Travel';

    // result.imageCover = await getDataPage.$eval(
    //   'div.ao-tour-snapshot__container > div.ao-tour-hero-image > div.ao-tour-hero-image-wrapper.js-ao-tour-hero-image-wrapper.js-bg-all',
    //   (el) => `https:${el.getAttribute('data-starting-image-url')}`
    // );

    let highlightLists = await getDataPage.$$(
      'section.ao-tour-block.js-ao-tour-block.ao-tour-highlights.js-ao-tour-highlights > div.ao-tour-highlights__facts > ul > li'
    );

    for (let item of highlightLists) {
      let element = await (await item.getProperty('innerText')).jsonValue();
      result.highlights.push(element);
    }

    await getDataPage.waitFor(5000); // wait for something galery not show up

    let galeryButton = await getDataPage.$(
      'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-hero-image > div.ao-tour-hero-image-wrapper.js-ao-tour-hero-image-wrapper.js-bg-all'
    );

    if (galeryButton) {
      await galeryButton.click();
    }
    //#ao-tour-image-gallery-lightbox-1 >
    await getDataPage.waitForSelector(
      'div.ao-common-super-popup__content.ao-tour-image-gallery-lightbox-content > div > div.ao-tour-image-gallery__thumbnails-list-wrapper.js-ao-tour-image-gallery__thumbnails-list-wrapper.ao-tour-image-gallery__thumbnails-list-wrapper--right-overlay > ul > li'
    );
    //#ao-tour-image-gallery-lightbox-1 >
    let imagesArray = await getDataPage.$$(
      'div.ao-common-super-popup__content.ao-tour-image-gallery-lightbox-content > div > div.ao-tour-image-gallery__thumbnails-list-wrapper.js-ao-tour-image-gallery__thumbnails-list-wrapper.ao-tour-image-gallery__thumbnails-list-wrapper--right-overlay > ul > li'
    );

    for (let image of imagesArray) {
      let url = await image.$eval('div > img', (el) => el.src);
      let bigImageUrl = url.replace('232x150', '1500x800');

      if (
        !bigImageUrl.includes('data:image') &&
        !bigImageUrl.includes('review')
      )
        result.images.push(bigImageUrl);
    }

    result.imageCover = result.images[0];

    let destinationsList = await getDataPage.$$(
      'body > main > div:nth-child(4) > div.bl.bl--middle > div.ao-tour-block.js-ao-tour-block.ao-tour-places-you-will-see.ao-tour-block__carousel > div > ul > li'
    );

    for (let item of destinationsList) {
      let url = await item.$eval(
        'div.ao-tour-places-you-will-see__slider-title',
        (el) => el.innerText
      );
      result.destinations.push(url);
    }

    let itineraryButtonArr = await getDataPage.$$(
      'div.bl.bl--middle > div.ao-tour-block.js-ao-tour-block.js-ao-tour-itinerary.itn > ol.det > li'
    );
    let i = 0;
    for (let button of itineraryButtonArr) {
      // let abc = await button.$('span.det__arrow');
      // abc.click();
      await button.click();
      await getDataPage.waitFor(1000);
    }

    for (let i = 0; i < itineraryButtonArr.length; i += 1) {
      let dayTitle = await itineraryButtonArr[i].evaluate((e) =>
        e.firstChild.data.replace(/\s\s+/g, ' ').trim()
      );

      let dayDesc = '';

      dayDesc = await itineraryButtonArr[i].$eval(
        'div.i',
        (e) => e.textContent
      );

      // if (i === itineraryButtonArr.length - 1) {
      //   dayDesc = await itineraryButtonArr[i].$eval(
      //     'div.i',
      //     (e) => e.textContent
      //   );
      // } else {
      //   dayDesc = await itineraryButtonArr[i].$eval(
      //     'div.i>p',
      //     (e) => e.textContent
      //   );
      // }

      result.timeline.push({ title: dayTitle, description: dayDesc });
    }

    // await getDataPage.waitFor(Math.floor(Math.random() * Math.floor(12000)));

    await getDataPage.close();

    // console.log(result);
    return result;
  },
};

module.exports = self;

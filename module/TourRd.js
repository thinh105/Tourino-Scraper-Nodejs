const puppeteer = require('puppeteer');
const to = require('../utils/catchError');

const SUBPAGE_URL = (country) => `https://www.tourradar.com/d/${country}`;
const SUBPAGE_TOUR_URL = 'https://www.tourradar.com/t/';

const self = {
  browser: null,

  initialize: async () => {
    self.browser = await puppeteer.launch(); // { headless: false }
  },

  getListTours: async (country) => {
    // Go to the page
    const getListPage = await self.browser.newPage();
    await getListPage.goto(SUBPAGE_URL(country), { waitUntil: 'networkidle0' });

    const elements = await getListPage.$$(
      'body > main > div > div.list > ul > li > div.bm'
    );
    const listURL = [];

    for (const element of elements) {
      let url = await element.$eval(
        'a.blank.tourLink[href]',
        (element_) => element_.href
      );

      url = url.replace(SUBPAGE_TOUR_URL, '');

      listURL.push(url);
    }

    await getListPage.waitFor(5000);
    return listURL;
  },

  getTourData: async (urlNumber) => {
    const getDataPage = await self.browser.newPage();

    const tourData = {
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

    const url = SUBPAGE_TOUR_URL.concat(urlNumber);

    await getDataPage.goto(url, {
      waitUntil: 'networkidle0',
    });

    tourData.name = await getDataPage.$eval(
      'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > h1',
      (element) => element.outerText
    );

    //
    // Get Duration
    //

    tourData.duration = await getDataPage.$eval(
      'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > div.ao-tour-above-fold__length',
      (element) => Number.parseInt(element.outerText.replace(/[^\d.]/g, ''), 10)
    );

    //
    // Get Travel Style
    //

    const listStyle = await getDataPage.$$(
      'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > ul >li'
    );

    for (const item of listStyle) {
      let url = await item.$eval('a', (element) => element.textContent);
      if (url === 'Christmas & New Year') url = 'Holiday';
      tourData.travelStyle.push(url);
    }

    //
    // Get Price
    //

    tourData.price = await getDataPage.$eval(
      'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > div.ao-tour-above-fold__price-block.js-ao-tour-above-fold__price-block > div.ao-tour-above-fold__main-price > span.ao-tour-above-fold__price',
      (element) => Number.parseInt(element.outerText.replace(/[^\d.]/g, ''), 10)
    );

    //
    // Get Old Price
    //

    tourData.oldPrice = await to(
      getDataPage.$eval(
        'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-above-fold > div > div.ao-tour-above-fold__price-block.js-ao-tour-above-fold__price-block > div.ao-tour-above-fold__price-from > div.ao-tour-above-fold__old-price',
        (element) =>
          Number.parseInt(element.outerText.replace(/[^\d.]/g, ''), 10)
      )
    );

    // try {
    // } catch (e) {
    //   console.error(e);
    // }

    //
    // Get Destination
    //

    const destinationsList = await getDataPage.$$(
      'body > main > div:nth-child(4) > div.bl.bl--middle > div.ao-tour-block.js-ao-tour-block.ao-tour-places-you-will-see.ao-tour-block__carousel > div > ul > li'
    );

    for (const item of destinationsList) {
      const url = await item.$eval(
        'div.ao-tour-places-you-will-see__slider-title',
        (element) => element.textContent
      );
      tourData.destinations.push(url);
    }

    if (tourData.destinations.length === 0)
      throw '\t💥💥💥Destinations is blank !!!💥💥💥';

    //
    // Click Expand button >>> Get Introduction + Timeline
    //

    const expandAllButton = await getDataPage.$('div.ex.ex--full-width');

    if (expandAllButton) {
      await expandAllButton.click();
    }

    await getDataPage.waitForSelector('ol>li.itn--first.active > div.i');

    const temporarySummary = await getDataPage.$eval(
      'body > main > div:nth-child(4) > div.bl.bl--middle > div.ao-tour-block.js-ao-tour-block.js-ao-tour-itinerary.itn > ol:nth-child(5) > li.itn--first.active > div.i',
      (element) => element.textContent
    );

    // for some summary too long
    tourData.summary =
      temporarySummary.length > 1000
        ? temporarySummary.split('\n')[0]
        : temporarySummary;
    // tourData.summary = tempSummary;

    if (!tourData.summary) {
      tourData.summary = await getDataPage.$eval(
        'div.aa-tour-itinerary__text',
        (element) => element.innerText
      );
      console.log('\t😅 No Summary! 😅 Converted from Itinerary! 😅');
    }
    if (tourData.summary === '') throw '\t💥💥💥Summary is blank !!!💥💥💥';

    //
    // >>> Get Timeline
    //

    const itineraryButtonArray = await getDataPage.$$(
      'ol.det > li.initiated.active'
    );

    for (const element of itineraryButtonArray) {
      const dayTitle = await element.$eval('span.title', (e) => e.innerText);

      // 132167 - 117089 | series p tag
      // 59429 works - one p tag
      let dayDesc = await element
        // .$$eval('div.i>p', (e) => e.map((a) => a.textContent))
        .$$eval('div.i>p', (e) => e.map((a) => a.textContent).join('\n'))
        .catch((e) => console.log('💥💥💥: [Timeline] Day Description' + e));

      // if (!dayDesc || dayDesc.length === 0)
      //   dayDesc = await element
      //     .$eval('div.i>p', (e) => e.textContent)
      //     .catch((e) => console.log('err: ' + e));

      //4786 - 133259
      if (!dayDesc) {
        let dayDescContainsWrongText = await element
          .$eval('div.i', (e) => e.textContent)
          .catch((e) => console.log('💥💥💥: [Timeline] Day Description ' + e));

        let wrongText =
          (await element
            .$eval('div.i>div.im', (e) => e.textContent)
            .catch(() => {})) || undefined;

        dayDesc = wrongText
          ? dayDescContainsWrongText.replace(wrongText, '')
          : dayDescContainsWrongText;
      }

      if (!dayDesc) console.log('💥💥💥: [Timeline] Day Description is blank!');

      tourData.timeline.push({ title: dayTitle, description: dayDesc });
    }

    //
    // Get Highlights
    //

    const highlightLists = await getDataPage.$$(
      'section.ao-tour-block.js-ao-tour-block.ao-tour-highlights.js-ao-tour-highlights > div.ao-tour-highlights__facts > ul > li'
    );

    for (const item of highlightLists) {
      const element = await (await item.getProperty('innerText')).jsonValue();
      tourData.highlights.push(element);
    }

    // //No Highlights! 😅 Converted from Summary!
    // if (tourData.highlights.length === 0) {
    //   let highlights = tourData.summary.split(/\. |\. |! |\n/);
    //   // a non-breaking space character: an ASCII 160
    //   // normal space character: an ASCII code 32

    //   // Remove Empty elements
    //   highlights = highlights.filter((item) => item && item.length < 180);

    //   tourData.highlights =
    //     highlights.length > 5 ? highlights.slice(0, 5) : highlights;
    //   console.log('\t😅 No Highlights! 😅 Converted from Summary! 😅');
    // }

    //throw 'Highlights is blank !!!';

    //
    //  Get reviews
    //

    const tourReview = [];

    let totalReviews = await getDataPage.$eval(
      'ul.ao-tour-reviews__review-container.js-ao-tour-reviews__review-container.ao-tour-block--padding-left-right',
      (e) => e.getAttribute('data-total')
    );

    if (totalReviews > 45) totalReviews = Math.floor(Math.random() * 10 + 40);

    // Load more hidden reviews if totalReviews > 3
    if (totalReviews > 3) {
      // each time click Load More review load more 3 reviews
      let timesClick = Math.ceil(totalReviews / 3 - 1);

      const loadMoreButton = await getDataPage.$(
        'button.ao-tour-reviews__load-more-cta.js-ao-tour-reviews__load-more-cta'
      );

      for (let i = 0; i < timesClick; i++) {
        const isButtonVisible = await loadMoreButton.boundingBox();

        if (isButtonVisible) {
          await loadMoreButton.click().catch((e) => {
            console.log('💥💥💥: Load More Review' + e);
          });
        }
        await getDataPage.waitFor(Math.floor(Math.random() * 2000));
      }
    }

    const reviews = await getDataPage.$$(
      'li.ao-tour-reviews__review-item.js-ao-tour-reviews__review-item'
    );

    for (const review of reviews) {
      //const element = await (await item.getProperty('innerText')).jsonValue();

      const reviewElement = { rating: '', review: '' };

      reviewElement.rating = await review
        .$eval('meta[itemprop="ratingValue"]', (e) => e.getAttribute('content'))
        .catch(() => {});

      reviewElement.review = await review.$eval(
        'div.am-tour-reviews__review-item-body.js-am-tour-reviews__review-item-body',
        (e) => e.getAttribute('data-text')
      );

      if (!reviewElement.rating) {
        const get_random = function (array) {
          return array[Math.floor(Math.random() * array.length)];
        };
        reviewElement.rating = get_random([
          '3.5',
          '4.0',
          '4.0',
          '4.5',
          '4.5',
          '5.0',
          '5.0',
        ]);
      }

      if (!reviewElement.review) {
        // Click `Show more` button to get full review

        const showMoreReview = await getDataPage.$(
          'a.aa-tour-reviews__review-show-more.js-aa-tour-reviews__review-show-more'
        );

        if (showMoreReview) {
          await showMoreReview.click();
        }

        await getDataPage.waitFor(2000);

        reviewElement.review = await review.$eval(
          'div.am-tour-reviews__review-item-body.js-am-tour-reviews__review-item-body',
          (e) => e.innerText
        );
      }

      if (reviewElement.review) tourReview.push(reviewElement);
    }

    const tourReviews = { name: tourData.name, reviews: tourReview };

    //
    // Get Images
    //

    const galeryButton = await getDataPage.$(
      'body > main > div:nth-child(4) > section > div.ao-tour-snapshot__container > div.ao-tour-hero-image > div.ao-tour-hero-image-wrapper.js-ao-tour-hero-image-wrapper.js-bg-all'
    );

    if (galeryButton) {
      await galeryButton.click();
    }

    // await getDataPage.waitFor(Math.floor(Math.random() * 2000 + 10000)); // wait for sometime galery not show up

    //#ao-tour-image-gallery-lightbox-1
    await getDataPage.waitForSelector(
      'div.ao-common-super-popup__content.ao-tour-image-gallery-lightbox-content > div > div.ao-tour-image-gallery__thumbnails-list-wrapper.js-ao-tour-image-gallery__thumbnails-list-wrapper.ao-tour-image-gallery__thumbnails-list-wrapper--right-overlay > ul > li'
    );

    //#ao-tour-image-gallery-lightbox-1>
    // const imagesArray = await getDataPage.$$(
    //   'div.ao-common-super-popup__content.ao-tour-image-gallery-lightbox-content > div > div.ao-tour-image-gallery__thumbnails-list-wrapper.js-ao-tour-image-gallery__thumbnails-list-wrapper.ao-tour-image-gallery__thumbnails-list-wrapper--right-overlay > ul > li'
    // );

    const imagesArray = await getDataPage.$$(
      'ul.ao-tour-image-gallery__thumbnails-list.js-ao-tour-image-gallery__thumbnails-list > li.ao-tour-image-gallery__thumbnail-container.js-ao-tour-image-gallery__thumbnail-container'
    );

    for (const image of imagesArray) {
      const url = await image.$eval(
        'div.ao-tour-image-gallery__thumbnail-wrapper.js-ao-tour-image-gallery__thumbnail-wrapper > img.ao-tour-image-gallery__thumbnail.js-ao-tour-image-gallery__thumbnail',
        (element) => element.src
      );
      let bigImageUrl = url.replace('232x150', '1500x800');

      if (
        !bigImageUrl.includes('review') &&
        !bigImageUrl.includes('data:image')
      )
        tourData.images.push(bigImageUrl);
    }

    if (tourData.images.length === 0)
      throw '\t💥💥💥Cannot get images!!!💥💥💥';

    tourData.imageCover = tourData.images[0];

    const closeGalleryButton = await getDataPage.$(
      'div.js-ao-common-super-popup__header-close.ao-common-super-popup__header-button.ao-common-super-popup__header-button--close.aa-text-h6'
    );

    // if (closeGalleryButton) {
    //   await closeGalleryButton.click().catch((e) => {
    //     console.log('💥💥💥: Gallery tat nut', e);
    //   });
    // }

    //
    // Close page - Return Data
    //

    await getDataPage.close();

    await getDataPage.waitFor(Math.floor(Math.random() * 2000 + 5000)); // set Delay to avoid abuse website

    return { tourData, tourReviews };
  },
};

module.exports = self;

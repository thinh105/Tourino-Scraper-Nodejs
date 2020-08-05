/* const catchErrors = (functionToHandle) => (...handledFunctionParams) => {
  functionToHandle(...handledFunctionParams).catch((e) => {
    console.log('catch cho vui!!!', e);
  });
};

module.exports = catchErrors;
 */

const to = function (promise) {
  return promise
    .then((data) => {
      return data;
    })
    .catch((err) => 0);
  // .catch((err) => [err]);
};

module.exports = to;

const fs = require('fs'); //.promises;
const path = require('path');

// async function myReaddir() {
//   const files = await fs.readdir(dir);
//   files.forEach((file) => {
//     console.log(file);
//   });
// }

// myReaddir();

// (dir, (err, files) => {
//   if (err) console.log('error', err);
//   files.forEach((file) => {
//     console.log(file);
//   });
// });

const dir = path.join(__dirname, 'File', process.argv[2]);
let finalContent = [];

const read_directory = async (dir) =>
  fs.readdirSync(dir).reduce((finalContent, file) => {
    filePath = path.join(dir, file);

    let content = require(filePath);

    finalContent = [...finalContent, ...content];

    return finalContent;
  }, finalContent);

read_directory(dir).then((data) => {
  fs.writeFileSync(
    path.join(__dirname, 'File', `${process.argv[2]}-final.json`),
    JSON.stringify(data)
  );
  console.log('👉👉👉finished!!!👈👈👈');
});

// fs.readdir(dir, (err, files) => {
//   return new Promise((resolve, reject) => {
//     if (err) reject(err);
//     files.forEach((file) => {
//       console.log(file);
//       let content = require(`${dir}${file}`);
//       data['passed'] += content.passed;
//       data['fixtures'] = data['fixtures'].concat(content['fixtures']);
//     });
//     resolve(data);
//   }).then((data) => {
//     fs.writeFileSync('./final.json', JSON.stringify(data));
//   });
// });

// node joinJson Data

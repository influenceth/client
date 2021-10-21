const fs = require('fs');

(() => {
  try {
    // fix heroku-specific bug with ethereumjs-abi node module in package-lock.json
    // `"git+ssh://git@github.com` --> `"https://github.com`
    fs.writeFileSync(
      './package-lock.json',
      fs.readFileSync('./package-lock.json').toString().replace(/\"git\+ssh:\/\/git\@github.com/g, '"https://github.com')
    );
  } catch (error) {
    console.error(error);
  }
})();

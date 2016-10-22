module.exports = function (status, done) {
  setTimeout(() => {
    this.$$b = true;
    done();
  }, 100);
};

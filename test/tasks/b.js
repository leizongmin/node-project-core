module.exports = function (done) {
  setTimeout(() => {
    this.$$b = true;
    done();
  }, 100);
};

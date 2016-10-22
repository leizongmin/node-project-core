module.exports = function (done) {
  setTimeout(() => {
    this.$$c = true;
    done();
  }, 100);
};

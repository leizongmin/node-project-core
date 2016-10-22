module.exports = function (done) {
  setTimeout(() => {
    this.$$a = true;
    done();
  }, 100);
};

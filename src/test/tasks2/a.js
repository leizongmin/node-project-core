module.exports = function (status, done) {
  setTimeout(() => {
    this.$$a = true;
    done();
  }, 100);
};

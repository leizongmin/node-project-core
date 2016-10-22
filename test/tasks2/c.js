module.exports = function (status, done) {
  setTimeout(() => {
    this.$$c = true;
    done();
  }, 100);
};

'use strict';

const Promise = require('bluebird');
const cheerio = require('cheerio');

class ArdourXML {
  constructor(doc) {
    this.doc = doc;
  }
};

module.exports.load = load;
function load(xml) {
  return Promise.try(() => cheerio.load(xml, { xmlMode: true }))
    .then((doc) => new ArdourXML(doc));
}

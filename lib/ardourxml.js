'use strict';

const Promise = require('bluebird');
const cheerio = require('cheerio');

class ArdourXML {
  constructor(doc) {
    this.doc = doc;

    this.ids = [];
    this.doc("*[id]").each((idx,elem) => this.ids[elem.attribs['id']] = true);
  }

  newID() {
    this.lastID = this.lastID || this.ids.length;

    while(this.lastID in this.ids)
      this.lastID += 1;

    this.ids[this.lastID] = true;
    return this.lastID;
  }
};

module.exports.load = load;
function load(xml) {
  return Promise.try(() => cheerio.load(xml, { xmlMode: true }))
    .then((doc) => new ArdourXML(doc));
}

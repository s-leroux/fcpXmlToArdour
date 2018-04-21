'use strict';

const Promise = require('bluebird');
const cheerio = require('cheerio');
const pug = require('pug');

const templates = {
  stereoRoute: pug.compileFile('./lib/templates/route.pug'),
};

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

  newStereoRoute() {
    const route = cheerio.load(templates.stereoRoute(this))('route');

    this.doc('routes').append(route);
    return route.get(0);
  }
};

module.exports.load = load;
function load(xml) {
  return Promise.try(() => cheerio.load(xml, { xmlMode: true }))
    .then((doc) => new ArdourXML(doc));
}

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

    this.routes = [];
    this.doc("Route").each((idx,elem) => this.routes[elem.attribs['name']] = elem);
  }

  newID() {
    this.lastID = this.lastID || this.ids.length;

    while(this.lastID in this.ids)
      this.lastID += 1;

    this.ids[this.lastID] = true;
    return this.lastID;
  }

  makeRouteName(routeName) {
    if (routeName in this.routes) {
      const [,stem,base] = routeName.match(/(.*[^\d]|^)(\d*)$/);
      let i = +base+1;
      while((routeName = stem+i) in this.routes)
        i += 1;
    }

    this.routes[routeName] = null;
    return routeName;
  }

  newStereoRoute(routeName) {
    if (!routeName)
      routeName = 'Audio';

    routeName = this.makeRouteName(routeName);

    const route = cheerio.load(templates.stereoRoute({ doc: this, routeName: routeName }), { xmlMode: true })('Route');
    this.doc('Routes').append(route);

    const result = route.get(0);
    this.routes[result.attribs.name] = result;
    return result;
  }

  toString() {
    return this.doc.xml();
  }
};

module.exports.load = load;
function load(xml) {
  return Promise.try(() => cheerio.load(xml, { xmlMode: true }))
    .then((doc) => new ArdourXML(doc));
}

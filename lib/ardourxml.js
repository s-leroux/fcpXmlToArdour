'use strict';

const Promise = require('bluebird');
const cheerio = require('cheerio');
const pug = require('pug');
const path = require('path');

const templates = {
  stereoRoute: pug.compileFile('./lib/templates/route.pug'),
  playlist: pug.compileFile('./lib/templates/playlist.pug'),
  source: pug.compileFile('./lib/templates/source.pug'),
};

class Source {
  constructor(session, element) {
    this.session = session;
    this.element = element;
  }

}

class Playlist {
  constructor(session, element) {
    this.session = session;
    this.element = element;
  }

  get name() {
    return this.element.attribs.name;
  }

  get id() {
    return this.element.attribs.id;
  }
}

class Route {
  constructor(session, element) {
    this.session = session;
    this.element = element;

    this.playlists = new Map();
    this.session.doc(`Playlist[orig-track-id='${this.id}']`).each((idx,elem) => this.playlists.set(elem.attribs['name'], elem));
  }

  get name() {
    return this.element.attribs.name;
  }

  get id() {
    return this.element.attribs.id;
  }

  /**
   * Return a playlist for this Route given its name.
   * If the name is missing, assumes `${route.name}.1`.
   * If there is no playlist, create one.
   *
   * @param  {[type]} name [description]
   * @return {[type]}      [description]
   */
  playlist(name) {
    name = name || this.name + ".1";

    let playlist = this.playlists.get(name);

    if (!playlist) {
      const fragment = cheerio.load(templates.playlist({ doc: this.session, route: this, playlistName: name }), { xmlMode: true })('Playlist');
      this.session.doc('Playlists').append(fragment);

      playlist = fragment.get(0);
    }

    if (!(playlist instanceof Playlist)) {
      playlist = new Playlist(this.session, playlist);
      this.playlists.set(name, playlist);
    }
    return playlist;
  }
}

class ArdourXML {
  constructor(doc) {
    this.doc = doc;

    this.ids = new Set();
    this.doc("*[id]").each((idx,elem) => this.ids.add(elem.attribs['id']));

    this.routes = new Map();
    this.doc("Route").each((idx,elem) => this.routes.set(elem.attribs['name'], elem));

    this.sources = new Map();
    this.doc("Source").each((idx,elem) => this.sources.set(`${elem.attribs['origin']}.${elem.attribs['channel']}`, elem));
  }

  newID() {
    let lastID = +this.lastID || this.ids.size;
    let lastIDAsString

    while(this.ids.has((lastIDAsString = lastID.toString()))) {
      lastID += 1;
    }

    this.lastID = lastID;
    this.ids.add(lastIDAsString);
    return lastIDAsString;
  }

  makeRouteName(routeName) {
    if (this.routes.has(routeName)) {
      const [,stem,base] = routeName.match(/(.*[^\d]|^)(\d*)$/);
      let i = +base+1;
      while(this.routes.has(routeName = stem+i))
        i += 1;
    }

    this.routes.set(routeName, null);
    return routeName;
  }

  /**
   * Eventually create then get a new source
   * @return {[type]} [description]
   */
  source(origin, channel) {
    const name = path.basename(origin);
    const key = `${origin}.${channel}`;

    let source = this.sources.get(key);

    if (!source) {
      const fragment = cheerio.load(templates.source({ doc: this, name: name, origin: origin, channel: channel }), { xmlMode: true })('Source');
      this.doc('Sources').append(fragment);

      source = fragment.get(0);
    }

    if (!(source instanceof Source)) {
      source = new Source(this, source);
      this.sources.set(key, source);
    }
    return source;
  }

  getRoute(routeName) {
    let route = this.routes.get(routeName);
    if (route && !(route instanceof Route)) {
      route = new Route(this, route);
      this.routes.set(routeName, route);
    }

    return route;
  }

  newStereoRoute(routeName) {
    if (!routeName)
      routeName = 'Audio';

    routeName = this.makeRouteName(routeName);

    const route = cheerio.load(templates.stereoRoute({ doc: this, routeName: routeName }), { xmlMode: true })('Route');
    this.doc('Routes').append(route);

    const result = route.get(0);
    this.routes.set(routeName, result);

    return this.getRoute(routeName);
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

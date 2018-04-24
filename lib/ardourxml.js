'use strict';

const Promise = require('bluebird');
const cheerio = require('cheerio');
const pug = require('pug');
const path = require('path');

const templates = {
  stereoRoute: pug.compileFile('./lib/templates/stereo-route.pug'),
  monoRoute: pug.compileFile('./lib/templates/mono-route.pug'),
  playlist: pug.compileFile('./lib/templates/playlist.pug'),
  source: pug.compileFile('./lib/templates/source.pug'),
  region: pug.compileFile('./lib/templates/region.pug'),
};

const FRAMERATE = new Map([
  ['timecode_23976', 23.976],
  ['timecode_24', 24],
  ['timecode_24975', 24.975],
  ['timecode_24976', 24.975],
  ['timecode_25', 25],
  ['timecode_25drop', 25],
  ['timecode_2997', 29.97],
  ['timecode_2997drop', 29.97],
  ['timecode_30', 30],
  ['timecode_30drop', 30],
  ['timecode_5994', 59.94],
  ['timecode_60', 60],
]);

const FRAMERATE_R = new Map([
  [23.976, 'timecode_23976'],
  [24, 'timecode_24'],
  [24.975, 'timecode_24976'], // this is currious but 24.975 maps to timecode_24976
  [25, 'timecode_25'],
  [29.97, 'timecode_2997'],
  [30, 'timecode_30'],
  [59.94, 'timecode_5994'],
  [60, 'timecode_60'],
]);

function error(message) { throw new Error(message); }

class Region {
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

  get start() {
    return this.element.attribs.start;
  }

  get length() {
    return this.element.attribs.length;
  }

  get position() {
    return this.element.attribs.position;
  }
}

class Source {
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

  get origin() {
    return this.element.attribs.origin;
  }

  get channel() {
    return this.element.attribs.channel;
  }
}

class Playlist {
  constructor(session, element) {
    this.session = session;
    this.element = element;

//    this.regions = new Map();
//    this.session.doc(element).find('Region').each((idx,elem) => this.regions.set(elem.attribs['id'], elem));
  }

  get name() {
    return this.element.attribs.name;
  }

  get id() {
    return this.element.attribs.id;
  }

  makeRegion(name, start, length, position, sources) {
    if (typeof start == "string")
      start = this.session.tcToSample(start);
    if (typeof length == "string")
      length = this.session.tcToSample(length);
    if (typeof position == "string")
      position = this.session.tcToSample(position);

    const region = cheerio.load(templates.region({
      doc: this.session,
      name: name,
      start: start,
      length: length,
      position: position,
      sources: sources,
    }), { xmlMode: true })('Region');
    this.session.doc(this.element).append(region);

    sources.forEach((source, idx) => {
      region.attr(`master-source-${idx}`, source.id);
      region.attr(`source-${idx}`, source.id);
    });

    return new Region(this, region.get(0));
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

  get sampleRate() {
    return +this.doc('Session').attr('sample-rate');
  }

  set sampleRate(value) {
    value = +value;

    if (Number.isNaN(value))
      throw new Error('Not a valid sample-rate');

    const notCD = value % 44100;
    const notMovie = value % 48000;
    const notIntegral = value % 1;

    if ((notCD && notMovie) || notIntegral || (value <= 0) || (value > 1000000))
      throw new Error(`Not a valid sample-rate: ${value}`);

    console.log(`Set sample-rate to ${value}`);
    this.doc('Session').attr('sample-rate', value);
  }

  get frameRate() {
    const tc = this.doc('Option[name="timecode-format"]').attr('value');
    return FRAMERATE.get(tc) || error("Unknown timecode-format: " + tc);
  }

  set frameRate(value) {
    const tc = FRAMERATE_R.get(+value) || error("Unknown timecode-format: " + tc);
    this.doc('Option[name="timecode-format"]').attr('value', tc);
  }

  tcToSample(h,m,s,f) {
    if (arguments.length == 1) {
      [,h,m,s,f] = h.match(/(\d\d):(\d\d):(\d\d)[:.](\d\d)$/);
    }

    const fr = this.frameRate;
    const frames = (h*60*60+m*60+s*1)*fr+f*1;
    return this.sampleRate*frames/fr;
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

  newRoute(routeName, template) {
    if (!routeName)
      routeName = 'Audio';

    routeName = this.makeRouteName(routeName);

    const route = cheerio.load(template({ doc: this, routeName: routeName }), { xmlMode: true })('Route');

    this.doc('Routes').append(route);
    const result = route.get(0);
    this.routes.set(routeName, result);

    return this.getRoute(routeName);
  }

  newStereoRoute(routeName) {
    return this.newRoute(routeName, templates.stereoRoute);
  }

  newMonoRoute(routeName) {
    return this.newRoute(routeName, templates.monoRoute);
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

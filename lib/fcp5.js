'use strict';

const Promise = require('bluebird');
const cheerio = require('cheerio');

class AudioTrack {
  constructor(session, element) {
    this.session = session;
    this.element = element;
  }
}

class Sequence {
  constructor(session, element) {
    this.session = session;
    this.element = element;
  }

  get name() {
    return this.session.doc(this.element).find('name').text();
  }

  get id() {
    return this.element.attribs.id;
  }

  get audioTracks() {
    const result = [];
    this.session.doc(this.element).find("audio track").each((idx,elem) => result.push(new AudioTrack(this, elem)));

    return result;
  }
}

class FCP5 {
  constructor(doc) {
    this.doc = doc;
  }

  get sequences() {
    const result = [];
    this.doc("sequence").each((idx,elem) => result[idx] = result[elem.attribs['id']] = new Sequence(this, elem));

    return result;
  }
}

module.exports.load = load;
function load(xml) {
  return Promise.try(() => cheerio.load(xml, { xmlMode: true }))
    .then((doc) => new FCP5(doc));
}

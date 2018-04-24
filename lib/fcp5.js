/*
 *  This file is part of the fcpXmlToArdour project
 *  Copyright 2018 Sylvain Leroux <sylvain@chicoree.fr>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

const Promise = require('bluebird');
const cheerio = require('cheerio');

class AudioClip {
  constructor(session, element) {
    this.session = session;
    this.element = element;

    this.frameRate = +this.session.doc(this.element).find('> rate timebase').text();
  }

  get name() {
    return this.session.doc(this.element).find('> name').text();
  }

  get start() {
    const n = +this.session.doc(this.element).find('> in').text();

    return this.toTimecode(n);
  }

  get length() {
    const n = +this.session.doc(this.element).find('> end').text() - this.session.doc(this.element).find('> start').text();

    return this.toTimecode(n);
  }

  get position() {
    const n = +this.session.doc(this.element).find('> start').text();

    return this.toTimecode(n);
  }

  get source() {
    const channel = +this.session.doc(this.element).find('> sourcetrack trackindex').text()-1;
    const { origin } = this.session.file(this.session.doc(this.element).find('> masterclipid').text());

    return [origin, channel];
  }

  get levels() {
    const result = [];
    let last = -1;

    this.session.doc(this.element)
      .find('effect effectid:contains("audiolevels") ~ parameter')
      .find('name:contains("Level") ~ keyframe')
      .each((idx, elem) => {
        const keyframe = this.session.doc(elem);
        const when = +keyframe.find('when').text();
        const value = +keyframe.find('value').text();

        if (when > last) { // because Lightworks exports sometimes twice the same frame value
          last = when;
          result.push([this.toTimecode(when), value]);
        }
      });

    return result;
  }

  toTimecode(n) {
    function div(a,b) {
      return [Math.floor(a/b), a%b];
    }

    function pad(v, n) {
      v = v.toString();
      while(v.length < n)
        v = '0'+v;

      return v;
    }

    const fr = this.frameRate;
    let h,m,s,f;

    [h, n] = div(n, 60*60*fr);
    [m, n] = div(n, 60*fr);
    [s, n] = div(n, fr);
    [f, n] = div(n, 1);

    return `${pad(h,2)}:${pad(m,2)}:${pad(s,2)}.${pad(f,2)}`;
  }
}

class AudioTrack {
  constructor(session, element) {
    this.session = session;
    this.element = element;
  }

  get clips() {
    const result = [];
    this.session.doc(this.element).find("clipitem").each((idx,elem) => result.push(new AudioClip(this.session, elem)));

    return result;
  }
}

class Sequence {
  constructor(session, element) {
    this.session = session;
    this.element = element;
  }

  get name() {
    return this.session.doc(this.element).find('> name').text();
  }

  get id() {
    return this.element.attribs.id;
  }

  get audioTracks() {
    const result = [];
    this.session.doc(this.element).find("audio track").each((idx,elem) => result.push(new AudioTrack(this.session, elem)));

    return result;
  }
}

class FCP5 {
  constructor(doc) {
    this.doc = doc;

    // sanity check
    const root = doc(':root')[0];
    if ((!root) || (root.name != "xmeml") || (root.attribs.version != 5)) {
      throw new Error("Not a valid FCP5 XML file");
    }
  }

  get sequences() {
    const result = [];
    this.doc("sequence").each((idx,elem) => result[idx] = result[elem.attribs['id']] = new Sequence(this, elem));

    return result;
  }

  file(id) {
    if (!this.files) {
      const files = this.files = [];
      this.doc("file").each((idx,elem) => {
        // different handling here since apparently the same file ID may appear several times in the Lightworks generated FCP5 file
        const id = elem.attribs['id'];
        let file = files[id];

        if (!file)
          file = files[id] = {};

        const [_,path] = this.doc(elem).find('> pathurl').text().match(/^(?:file:\/\/localhost)?(.*)/) || [];
        if (path)
          file.origin = path;
      });
    }

    return this.files[id];
  }
}

module.exports.load = load;
function load(xml) {
  return Promise.try(() => cheerio.load(xml, { xmlMode: true }))
    .then((doc) => new FCP5(doc));
}

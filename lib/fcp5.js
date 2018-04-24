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

class VirtualStereoClip {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  get name() { return this.left.name }
  get start() { return this.left.start }
  get length() { return this.left.length }
  get position() { return this.left.position }
  get envelope() { return this.left.envelope }
  get source() {
    const lsource = this.left.source;
    const rsource = this.right.source;

    return [lsource[0], lsource[1].concat(rsource[1])];
  }

  get frameRate() { return this.left.frameRate }
  toTimecode(n) { return this.left.toTimecode(n) }

}

class AudioClip {
  constructor(session, element) {
    this.session = session;
    this.element = element;

    this.frameRate = +this.session.doc(this.element).find('> rate timebase').text();
  }

  /**
   * Compare two audioclips to guess if they could be part of a stereo pair
   * @param  {[type]}  left  A possibly left channel region
   * @param  {[type]}  right A possibly right channel region
   * @return {Boolean}       True if the two channel could be part of a stereo region
   */
  static isStereoPair(left, right) {
    if (left.start != right.start) return false;
    if (left.length != right.length) return false;
    if (left.position != right.position) return false;

    const lsource = left.source;
    const rsource = right.source;

    if (lsource[0] != rsource[0]) return false;
    if (lsource[1] != 0) return false;
    if (rsource[1] != 1) return false;

    const lenvelope = left.envelope;
    const renvelope = right.envelope;

    if (lenvelope.toString() != renvelope.toString()) return false;

    return true;
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

    return [origin, [ channel ]];
  }

  get envelope() {
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

/**
 * Wrap two mono tracks as a pseudo-stereo pair
 */
class VirtualStereoTrack {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  get channels() { return 2 };

  get clips() {
    const lclips = this.left.clips;
    const rclips = this.right.clips;

    const result = [];
    for(let i = 0; i < lclips.length; ++i)
      result.push(new VirtualStereoClip(lclips[i], rclips[i]));

    return result;
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

  get channels() { return 1 };

  static isStereoPair(left, right) {
    if ((left.channels > 1) || (right.channels > 1)) return false;

    const lclips = left.clips;
    const rclips = right.clips;

    if (lclips.length != rclips.length) return false;
    for(let i = 0; i < lclips.length; ++i) {
      if (!AudioClip.isStereoPair(lclips[i], rclips[i])) return false;
    }

    return true;
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
    let n = 0;
    this.session.doc(this.element).find("audio track").each((idx,elem) => {
      let track = new AudioTrack(this.session, elem);

      // Check if the new track may be joined with the previous one
      // in a stereo pair
      if (n && AudioTrack.isStereoPair(result[n-1], track))
        result[n-1] = new VirtualStereoTrack(result[n-1], track);
      else {
        result[n++] = track;
      }
    });

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

module.exports.AudioTrack = AudioTrack;
module.exports.AudioClip = AudioClip;
module.exports.load = load;
function load(xml) {
  return Promise.try(() => cheerio.load(xml, { xmlMode: true }))
    .then((doc) => new FCP5(doc));
}

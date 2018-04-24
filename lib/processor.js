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
const debug = require("debug")("fcpXmlToArdour:processor");
const path = require("path");
const fs = Promise.promisifyAll(require("fs"));
const AXML = require("./ardourxml.js");
const FCP5 = require("./fcp5.js");

class ServerError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
  }
}

class InvalidInput extends ServerError {
  constructor(message) {
    super(message, 400);
  }
}

function convert(fcp, ardour, options) {
  if (options.sr)
    ardour.sampleRate = options.sr;

  const sequence = fcp.sequences[0];
  if (sequence) {
    const name = `${sequence.name}.1`;
    sequence.audioTracks.forEach((track) => {
      const route = ardour.newRoute(name, track.channels);
      const playlist = route.playlist();

      track.clips.forEach((clip) => {
        ardour.frameRate = clip.frameRate; // Adjust frame rate on a clip to clip basis.
                                           // Probably leads to inconsistent results if
                                           // the frame rate is not the same for each clip
                                           // though
        const region = playlist.makeRegion(clip.name, clip.start, clip.length, clip.position, ardour.source(...clip.source));
        const envelope = clip.envelope;
        if (envelope.length) {
          region.envelope = envelope;
        }
      });
    });
  }
  return ardour.toString();
}

function process(doc, options) {
  return Promise.all([FCP5.load(doc), fs.readFileAsync(path.join(__dirname, 'data/empty.ardour')).then(AXML.load)])
    .catch((err) => { throw new InvalidInput(err.message || "Invalid XML file") })
    .then((args) => convert(...args, options))
    .then((result) => (typeof result == "string") ? result : JSON.stringify(result, 2, "  "));
}

module.exports = function(req,res) {
  if (!req.file || !req.file.buffer)
    throw new InvalidInput("Missing input file");

  const options = {
    sr: req.body.sr    || 48000,    // sample rate for everything
  };
  process(req.file.buffer.toString(), options)
    .then((result) => res.send(result))
    .tapCatch((err) => { if (!err.status || err.status == 5000) console.log(err) })
    .catch((err) => res.status(err.status || 500 ).send(err.message || "Error"));
}

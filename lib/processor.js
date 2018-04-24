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

function convert(fcp, ardour) {
  const sequence = fcp.sequences[0];
  if (sequence) {
    const name = `${sequence.name}.1`;
    sequence.audioTracks.forEach((track) => {
      const route = ardour.newMonoRoute(name);
      const playlist = route.playlist();

      track.clips.forEach((clip) => {
        ardour.frameRate = clip.frameRate; // Adjust frame rate on a clip to clip basis.
                                           // Probably leads to inconsistent results if
                                           // the frame rate is not the same for each clip
                                           // though
        playlist.makeRegion(clip.name, clip.start, clip.length, clip.position, [ ardour.source(...clip.source) ]);
      });
    });
  }
  return ardour.toString();
}

function process(doc) {
  return Promise.all([FCP5.load(doc), fs.readFileAsync(path.join(__dirname, 'data/empty.ardour')).then(AXML.load)])
    .catch((err) => { throw new InvalidInput(err.message || "Invalid XML file") })
    .spread(convert)
    .then((result) => (typeof result == "string") ? result : JSON.stringify(result, 2, "  "));
}

module.exports = function(req,res) {
  if (!req.file || !req.file.buffer)
    throw new InvalidInput("Missing input file");

  process(req.file.buffer.toString())
    .then((result) => res.send(result))
    .tapCatch((err) => { if (!err.status || err.status == 5000) console.log(err) })
    .catch((err) => res.status(err.status || 500 ).send(err.message || "Error"));
}

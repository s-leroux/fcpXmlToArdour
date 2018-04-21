'use strict';

const Promise = require('bluebird');
const cheerio = require('cheerio');

const debug = require("debug")("xml2lua:processor");

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

function ensureValidInput(doc) {
  if (doc.root().children("xmeml[version=5]").length == 1)
    return doc;

  throw new InvalidInput("Not a valid FCP5 XML file");
}

function luaCodeGenerator(info) {
  const result = [];
  const inPorts = 1;
  const outPorts = 1;
  info.tracks.forEach((track) => {
    result.push(`Session:new_audio_track (${inPorts}, ${outPorts}, nil, 1,
                                          [[${track.name}]],
                                          ARDOUR.PresentationInfo.max_order, ARDOUR.TrackMode.Normal)`);
  });

  /*
  Import into the region list:

local pos = -1
f = Editor:do_import (files,
        Editing.ImportDistinctFiles, Editing.ImportAsRegion, ARDOUR.SrcQuality.SrcBest,
        ARDOUR.MidiTrackNameSource.SMFTrackName, ARDOUR.MidiTempoMapDisposition.SMFTempoIgnore,
        pos, ARDOUR.PluginInfo())

   */


  return result.join('\n');
}

function extractInfo(doc) {
  const result = {
    tracks: [],
  };

  doc('audio > track').each(function(idx) {
    let track = result.tracks[idx] = {
      clips: [],
      name: `IMPORTED-${idx}`,
    };

  });

  return result;
}

function xml2lua(doc) {
  return Promise.try(() => cheerio.load(doc, { xmlMode: true }))
    .catch((err) => { throw new InvalidInput(err.message || "Invalid XML file") })
    .then(ensureValidInput)
    .then(extractInfo)
    .then(luaCodeGenerator)
    .then((result) => (typeof result == "string") ? result : JSON.stringify(result, 2, "  "));
}

module.exports = function(req,res) {
  if (!req.file || !req.file.buffer)
    throw new InvalidInput("Missing input file");

  xml2lua(req.file.buffer.toString())
    .then((result) => res.send(`OK\n\n${result}\n\n`))
    .catch((err) => res.status(err.status || 500 ).send(err.message || "Error"));
}

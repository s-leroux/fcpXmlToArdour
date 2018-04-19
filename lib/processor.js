'use strict';

const Promise = require('bluebird');
const xml = Promise.promisifyAll(require('xml2js'));

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

function ensureValidInput(root) {
  if (root["xmeml"] && root["xmeml"].$.version == "5")
    return root;

  throw new InvalidInput("Not a valid FCP5 XML file");
}

function xml2lua(doc) {
  debug(doc);
  return xml.parseStringAsync(doc)
    .catch((err) => { throw new InvalidInput(err.message || "Invalid XML file") })
    .then(ensureValidInput)
    .then((result) => JSON.stringify(result, 2, "  "));
}

module.exports = function(req,res) {
  if (!req.file || !req.file.buffer)
    throw new InvalidInput("Missing input file");

  xml2lua(req.file.buffer.toString())
    .then((result) => res.send(`OK\n\n${result}\n\n`))
    .catch((err) => res.status(err.status || 500 ).send(err.message || "Error"));
}

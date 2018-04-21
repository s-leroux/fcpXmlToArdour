'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const AXML = require("../lib/ardourxml.js");

const { assert } = require("chai");

describe("ArdourXML", function() {

  describe("load()", function() {

    it("should load Ardour projects", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load);
    });

    it("should return a promise", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then((data) => {
          const p = AXML.load(data);
          assert.property(p, 'then');

          return p;
        });
    });

    it("should produce an ArdourXML instance", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          assert.equal(doc.constructor.name, 'ArdourXML');
        });
    });


  });

});

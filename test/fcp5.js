'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const FCP5 = require("../lib/fcp5.js");

const { assert } = require("chai");

describe("FCP5", function() {

  describe("load()", function() {

    it("should load FCP5 projects", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load);
    });

    it("should return a promise", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then((data) => {
          const p = FCP5.load(data);
          assert.property(p, 'then');

          return p;
        });
    });

  });
  describe("the sequences property", function() {

    it("should return an array of Sequence", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const sequences = doc.sequences;
          assert(sequences instanceof Array);
          sequences.forEach((item) => assert.equal(item.constructor.name, "Sequence"));
        });
    });

    it("should map sequence by id and index", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const sequences = doc.sequences;
          sequences.forEach((item) => assert.equal(item, sequences[item.id]));
        });
    });

  });
  describe("Sequence instances", function() {

    it("should have an id property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const sequences = doc.sequences;
          assert(sequences[0].id, 'E30R21M9');
        });
    });

    it("should have a name property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const sequences = doc.sequences;
          assert(sequences[0].name, 'Sequence #1');
        });
    });

  });

});

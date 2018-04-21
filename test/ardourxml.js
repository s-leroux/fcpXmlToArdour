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

    it("should gather document ids", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          assert.property(doc.ids, '55');
          assert.property(doc.ids, '220');
          assert.property(doc.ids, '2743');
          assert.property(doc.ids, '2590');
        });
    });

  });
  describe("newID()", function() {

    it("should return a new unused id", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          for(let i =0; i < 1000; ++i) {
            const oldIDs = doc.ids.slice();
            const id = doc.newID();

            assert.typeOf(id, 'Number');
            assert.notProperty(oldIDs, id);
          }
        });
    });

    it("should register newly created ids", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          for(let i =0; i < 1000; ++i) {
            const id = doc.newID();
            assert.property(doc.ids, id);
          }
        });
    });

  });
  describe("newRoute()", function() {

    it("should returns a new route element", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const route = doc.newStereoRoute();

          assert.equal(route.tagName, 'Route');
        });
    });

    it("should register the new route", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const oldLength = doc.doc('Routes').children().length;
          const route = doc.newStereoRoute();
          const newLength = doc.doc('Routes').children().length;

          assert.equal(newLength, oldLength+1);
        });
    });

    it("should create valid Ardour file (check externally please)", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          doc.newStereoRoute('A');
          doc.newStereoRoute('B');
          fs.writeFileAsync("test/out/two-tracks.ardour", doc)
        });
    });

  });

});

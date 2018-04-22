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
  describe("makeRouteName()", function() {
    const NEWROUTENAME='SOME-ROUTE-NAME';

    it("should leave new route names as-is", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          assert.equal(doc.makeRouteName(NEWROUTENAME), NEWROUTENAME);
        });
    });

    it("should add index on duplicate route name", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          assert.equal(doc.makeRouteName(NEWROUTENAME), NEWROUTENAME);
          assert.equal(doc.makeRouteName(NEWROUTENAME), NEWROUTENAME + "1");
        });
    });

    it("should add index on duplicate route name (existing)", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          assert.equal(doc.makeRouteName('MyAudioStereoTrack'), 'MyAudioStereoTrack1');
          assert.equal(doc.makeRouteName('MyAudioStereoTrack'), 'MyAudioStereoTrack2');
        });
    });

    it("should increment route name with index", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          assert.equal(doc.makeRouteName(NEWROUTENAME + "10"), NEWROUTENAME + "10");
          assert.equal(doc.makeRouteName(NEWROUTENAME + "10"), NEWROUTENAME + "11");
        });
    });

  });
  describe("newRoute()", function() {

    it("should returns a Route object", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const route = doc.newStereoRoute();

          assert.equal(route.constructor.name, 'Route');
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

    it("should NOT create two tracks with the same name", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const r1 = doc.newStereoRoute('A');
          const r2 = doc.newStereoRoute('A');
          const r3 = doc.newStereoRoute('A');
          assert.notEqual(r1.name, r2.name);
          assert.notEqual(r1.name, r3.name);
          assert.notEqual(r2.name, r3.name);
        });
    });

  });
  describe("Route instances", function() {

    it("should have a name property", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const r1 = doc.newStereoRoute('A');

          assert.equal(r1.name, 'A');
        });
    });

    it("should have an id property", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {

          const oldIDs = doc.ids.slice();
          const r1 = doc.newStereoRoute('A');

          assert.notProperty(oldIDs, r1.id);
          assert.property(doc.ids, r1.id);
        });
    });

    it("should find playlist by name", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {

          const oldIDs = doc.ids.slice();
          const route = doc.newStereoRoute('A');
          const playlist = route.playlist('A.1');

          assert.equal(playlist.name, 'A.1');
        });
    });

  });


  it("should create valid Ardour file (check externally please)", function() {
    return fs.readFileAsync("test/data/sample.ardour")
      .then(AXML.load)
      .then((doc) => {
        const r1 = doc.newStereoRoute('A');
        const r2 = doc.newStereoRoute('B');
        const p11 = r1.playlist('A.1');
        const p12 = r1.playlist('A.2');
        fs.writeFileAsync("test/out/two-tracks.ardour", doc)
      });
  });

});

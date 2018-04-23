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

    it("should have a sample rate property", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          assert.property(doc,'sampleRate');
          assert.equal(doc.sampleRate, 48000);
        });
    });

    it("should have a frame rate property [get]", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          assert.equal(doc.frameRate, 30);
        });
    });

    it("should have a frame rate property [set]", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          doc.frameRate = 25;
          assert.equal(doc.frameRate, 25);
          assert.equal(doc.doc('Option[name="timecode-format"]').attr('value'), 'timecode_25');
        });
    });

    it("should gather document ids", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          assert.containsAllKeys(doc.ids, ['55', '220', '2743', '2590']);
        });
    });

  });
  describe("tcToSample()", function() {

    it("should allows timecode string or number arguments", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          // dot-frame notation
          assert.equal(doc.tcToSample("00:00:00.00"), doc.tcToSample(0, 0, 0, 0));
          assert.equal(doc.tcToSample("00:00:00.15"), doc.tcToSample(0, 0, 0, 15));
          assert.equal(doc.tcToSample("00:00:01.15"), doc.tcToSample(0, 0, 1, 15));
          assert.equal(doc.tcToSample("00:02:01.15"), doc.tcToSample(0, 2, 1, 15));
          assert.equal(doc.tcToSample("03:02:01.15"), doc.tcToSample(3, 2, 1, 15));

          // colon notation
          assert.equal(doc.tcToSample("00:00:00:00"), doc.tcToSample(0, 0, 0, 0));
          assert.equal(doc.tcToSample("00:00:00:15"), doc.tcToSample(0, 0, 0, 15));
          assert.equal(doc.tcToSample("00:00:01:15"), doc.tcToSample(0, 0, 1, 15));
          assert.equal(doc.tcToSample("00:02:01:15"), doc.tcToSample(0, 2, 1, 15));
          assert.equal(doc.tcToSample("03:02:01:15"), doc.tcToSample(3, 2, 1, 15));
        });
    });

    it("should convert timecode to samples", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          assert.equal(doc.tcToSample("00:00:00.00"), 0);
          assert.equal(doc.tcToSample("00:00:00.15"), 24000);
          assert.equal(doc.tcToSample("00:00:01.15"), 48000+24000);
          assert.equal(doc.tcToSample("00:02:01.15"), 48000*2*60+48000+24000);
          assert.equal(doc.tcToSample("03:02:01.15"), 48000*3*60*60+48000*2*60+48000+24000);
        });
    });

  });
  describe("newID()", function() {

    it("should return a new unused id", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          for(let i =0; i < 1000; ++i) {
            const oldIDs = new Set(doc.ids);
            const id = doc.newID();

            assert.typeOf(id, 'String');
            assert(!oldIDs.has(id));
          }
        });
    });

    it("should register newly created ids", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          for(let i = 0; i < 1000; ++i) {
            const id = doc.newID();

            assert(doc.ids.has(id));
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
  describe("source()", function() {

    it("should find source by origin and channel", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const s = doc.source("/tmp/test.wav", 0);
          assert.equal(s.id, 4682);
          assert.equal(s.channel, 0);
          assert.equal(s.origin, "/tmp/test.wav");
        });
    });

    it("should create source on demand", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const oldSize  = doc.sources.size;
          const s = doc.source("/tmp/test.wav", 0);
          const s0 = doc.source("/tmp/test.wav", 1);
          const s1 = doc.source('A.wav', 0);
          const s2 = doc.source('A.wav', 1);
          const s3 = doc.source('B.wav', 0);
          const s4 = doc.source('B.wav', 1);

          assert.equal(s.origin, '/tmp/test.wav');
          assert.equal(s0.origin, '/tmp/test.wav');
          assert.equal(s1.origin, 'A.wav');
          assert.equal(s2.origin, 'A.wav');
          assert.equal(s3.origin, 'B.wav');
          assert.equal(s4.origin, 'B.wav');

          assert.equal(s.channel, 0);
          assert.equal(s0.channel, 1);
          assert.equal(s1.channel, 0);
          assert.equal(s2.channel, 1);
          assert.equal(s3.channel, 0);
          assert.equal(s4.channel, 1);
          assert.equal(doc.sources.size, oldSize+5);
        });
    });


  });
  describe("makeRegion()", function() {

    it("should returns a Region object", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const route = doc.newStereoRoute('A');
          const playlist = route.playlist('A.1');
          const s0 = doc.source('/tmp/test.wav', 0);
          const s1 = doc.source('/tmp/test.wav', 1);
          const region = playlist.makeRegion("R", 10,20,30,[ s0, s1 ]);

          assert.equal(region.constructor.name, 'Region');
        });
    });

    it("should properly set attributes on the new region", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const route = doc.newStereoRoute('A');
          const playlist = route.playlist('A.1');
          const s0 = doc.source('/tmp/test.wav', 0);
          const s1 = doc.source('/tmp/test.wav', 1);
          const region = playlist.makeRegion("R", 10,20,30,[ s0, s1 ]);

          assert.equal(region.name, 'R');
          assert.equal(region.start, 10);
          assert.equal(region.length, 20);
          assert.equal(region.position, 30);
        });
    });

  });
  describe("Source instances", function() {

    it("should have a name property", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const s = doc.source("/tmp/test.wav", 0);

          assert.property(s, 'name');
          assert.equal(s.name, "test.wav");
        });
    });

    it("should have an id property", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const s = doc.source("/tmp/test.wav", 0);

          assert.property(s, 'id');
          assert.equal(s.id, 4682);
        });
    });

    it("should have an origin property", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const s = doc.source("/tmp/test.wav", 0);

          assert.property(s, 'origin');
          assert.equal(s.origin, "/tmp/test.wav");
        });
    });

    it("should have an channel property", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const s = doc.source("/tmp/test.wav", 0);

          assert.property(s, 'channel');
          assert.equal(s.channel, 0);
        });
    });

    it("should infer name from origin", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          for(let path of [ "", "./", "./local/" ]) {
            for(let basename of [ "file.wav", "file" ]) {
              for(let channel of [ 0, 1 ]) {
                const s = doc.source(path + basename, 0);
                  assert.equal(s.name, basename);
              }
            }
          }
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

          const oldIDs = new Set(doc.ids);
          const r1 = doc.newStereoRoute('A');

          assert(doc.ids.has(r1.id));
          assert(!oldIDs.has(r1.id));
        });
    });

    it("should find playlist by name", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {

          const route = doc.newStereoRoute('A');
          const playlist = route.playlist('A.1');

          assert.equal(playlist.name, 'A.1');
        });
    });

    it("should create playlist on demand", function() {
      return fs.readFileAsync("test/data/sample.ardour")
        .then(AXML.load)
        .then((doc) => {
          const route = doc.newStereoRoute('A');
          const oldSize  = route.playlists.size;
          const p1 = route.playlist('A.1');
          const p2 = route.playlist('A.2');
          const p3 = route.playlist('A.3');
          const p4 = route.playlist('A.1');

          assert.equal(p1.name, 'A.1');
          assert.equal(p2.name, 'A.2');
          assert.equal(p3.name, 'A.3');
          assert.equal(p4.name, 'A.1');
          assert.equal(route.playlists.size, oldSize+3);
        });
    });

  });


  it("should create valid Ardour file (check externally please)", function() {
    return fs.readFileAsync("test/data/sample.ardour")
      .then(AXML.load)
      .then((doc) => {
        const r1 = doc.newStereoRoute('A');
        const r2 = doc.newStereoRoute('B');
        const r3 = doc.newMonoRoute('C');
        const p11 = r1.playlist('A.1');
        const p12 = r1.playlist('A.2');
        const s0 = doc.source('/tmp/test.wav', 0);
        const s1 = doc.source('/tmp/test.wav', 1);
        const rg1 = p11.makeRegion('R', 10,20,30,[ s0, s1 ]);
        fs.writeFileAsync("test/out/two-tracks.ardour", doc)
      });
  });

});

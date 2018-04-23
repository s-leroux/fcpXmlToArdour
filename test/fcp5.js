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
          assert.equal(sequences.length, 1);
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

    it("should have an audioTracks property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const audioTracks = doc.sequences[0].audioTracks;
          assert(audioTracks instanceof Array);
          assert.equal(audioTracks.length, 5);
          audioTracks.forEach((item) => assert.equal(item.constructor.name, "AudioTrack"));
        });
    });

  });
  describe("AudioTrack instances", function() {

    it("should have a clips property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const clips = doc.sequences[0].audioTracks[0].clips;
          assert(clips instanceof Array);
          assert.equal(clips.length, 4);
          clips.forEach((item) => assert.equal(item.constructor.name, "AudioClip"));
        });
    });

  });
  describe("AudioClip instances", function() {

    it("should have a frameRate property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const clips = doc.sequences[0].audioTracks[0].clips;
          clips.forEach((clip) => assert.equal(clip.frameRate, 25));
        });
    });

    it("should know how to map frames to timecodes", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const clip = doc.sequences[0].audioTracks[0].clips[0];

          assert.equal(clip.toTimecode(0), "00:00:00.00");
          assert.equal(clip.toTimecode(15), "00:00:00.15");
          assert.equal(clip.toTimecode(19), "00:00:00.19");
          assert.equal(clip.toTimecode(25), "00:00:01.00");
          assert.equal(clip.toTimecode(25*59), "00:00:59.00");
          assert.equal(clip.toTimecode(25*60*59), "00:59:00.00");
          assert.equal(clip.toTimecode(25*60*60*59), "59:00:00.00");
        });
    });

    it("should have a start property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const clip = doc.sequences[0].audioTracks[0].clips[0];
          assert.equal(clip.start, "00:00:00.00");
        });
    });

    it("should have a length property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const clip = doc.sequences[0].audioTracks[0].clips[0];
          assert.equal(clip.length, "00:00:01.05");
        });
    });

    it("should have a position property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const clip = doc.sequences[0].audioTracks[0].clips[0];
          assert.equal(clip.position, "00:00:00.19");
        });
    });

    it("should have a (zero based) channel property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const tracks = doc.sequences[0].audioTracks;
          assert.equal(tracks[0].clips[0].channel, 0);
          assert.equal(tracks[1].clips[0].channel, 1);
        });
    });

  });

});

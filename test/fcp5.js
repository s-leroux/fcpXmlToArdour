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

    it("should find files by id", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          assert.equal(doc.file("E30R21AU").origin, '/tmp/final/2/out25.mp4');
          assert.equal(doc.file("E30R21CH").origin, '/tmp/final/2/exhale-sigh_fkHQMu4d.wav');
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
          assert.equal(audioTracks.length, 3);
          audioTracks.forEach((item) => assert.include(["AudioTrack", "VirtualStereoTrack"], item.constructor.name));
        });
    });

    it("should merge compatible mono tracks as stereo", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const audioTracks = doc.sequences[0].audioTracks;
          assert(audioTracks instanceof Array);
          assert.equal(audioTracks.length, 3);
          assert.equal(audioTracks[0].channels, 2);
          assert.equal(audioTracks[1].channels, 2);
          assert.equal(audioTracks[2].channels, 1);
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
          clips.forEach((item) => assert.include(["AudioClip", "VirtualStereoClip"], item.constructor.name));
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

    it("should have a name property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const clip = doc.sequences[0].audioTracks[0].clips[0];
          assert.equal(clip.name, "exhale-sigh_fkHQMu4d");
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

    it("should have a source property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const tracks = doc.sequences[0].audioTracks;
          assert.deepEqual(tracks[0].clips[0].source, ["/tmp/final/2/exhale-sigh_fkHQMu4d.wav", [0, 1]]);
        });
    });

    it("should have an envelope property", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const envelope = doc.sequences[0].audioTracks[0].clips[2].envelope;
          assert.deepEqual(envelope, [ ["00:00:00.00",1],
                                       ["00:00:00.01",1],
                                       ["00:00:01.01",.10000024],
                                       ["00:00:01.05",.10000024],
                                     ]);
        });
    });

  });
  describe("AudioClip.isStereoPair()", function() {

    it("should detect potential stereo pairs", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const type = doc.sequences[0].audioTracks[0].clips[2].constructor.name;
          assert.equal(type, "VirtualStereoClip");
        });
    });

    it("should reject non-matching pairs", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const clip1 = doc.sequences[0].audioTracks[0].clips[0];
          const clip2 = doc.sequences[0].audioTracks[0].clips[1];
          assert(!FCP5.AudioClip.isStereoPair(clip1, clip2));
        });
    });

  });
  describe("AudioTrack.isStereoPair()", function() {

    it("should detect potential stereo pairs", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const type = doc.sequences[0].audioTracks[0].constructor.name;
          assert.equal(type, "VirtualStereoTrack");
        });
    });

    it("should reject non-matching pairs", function() {
      return fs.readFileAsync("test/data/sample.fcp5")
        .then(FCP5.load)
        .then((doc) => {
          const track0 = doc.sequences[0].audioTracks[0];
          const track1 = doc.sequences[0].audioTracks[3];
          assert(!FCP5.AudioTrack.isStereoPair(track0, track1));
        });
    });

  });

});

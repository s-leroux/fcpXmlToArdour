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
process.env.NODE_ENV = 'test';

const processor = require("../lib/processor.js");

const chai = require("chai");
chai.use(require('chai-http'));

const { assert, request } = chai;

describe("Processor", function() {

  it("should export a function", function() {
    assert.equal(typeof processor, "function");
  });

});

describe("Server", function() {
  let server = undefined;
  before(function() {
    server = require("../server.js");
  });
  after(function() {
    server.close();
  });

  it("should reject missing input", function() {
    return request(server)
      .post("/")
      .then((res) => {
        assert.equal(res.status, 400);
      });
  });

  it("should reject non-XML input", function() {
    const buffer = Buffer.from("hello", 'utf8');

    return request(server)
      .post("/")
      .attach("xml", buffer, "somefile.xml")
      .then((res) => {
        assert.equal(res.status, 400);
      });
  });

  it("should reject non-FCP XML input", function() {
    const buffer = Buffer.from("<xml/>", 'utf8');

    return request(server)
      .post("/")
      .attach("xml", buffer, "somefile.xml")
      .then((res) => {
        assert.equal(res.status, 400);
      });
  });

  it("should reject non-FCP5 XML input", function() {
    const buffer = Buffer.from("<xmeml version='4'/>", 'utf8');

    return request(server)
      .post("/")
      .attach("xml", buffer, "somefile.xml")
      .then((res) => {
        assert.equal(res.status, 400);
      });
  });

  it("should accept FCP5 XML input", function() {
    const buffer = Buffer.from("<xmeml version='5'/>", 'utf8');

    return request(server)
      .post("/")
      .attach("xml", buffer, "somefile.xml")
      .then((res) => {
        assert.equal(res.status, 200);
      });
  });

});

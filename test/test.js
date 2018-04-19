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

var server = require("../server/server");
var request = require("request");
var assert = require("chai").assert;

var testPort = 52684;
var baseUrl = "http://localhost:" + testPort;
var todoListUrl = baseUrl + "/api/todo";

describe("server", function() {
    var serverInstance;
    beforeEach(function() {
        serverInstance = server(testPort);
    });
    afterEach(function() {
        serverInstance.close();
    });
    describe("get list of todos", function() {
        it("responds with status code 200", function(done) {
            request(todoListUrl, function(error, response) {
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("responds with a body encoded as JSON in UTF-8", function(done) {
            request(todoListUrl, function(error, response) {
                assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
                done();
            });
        });
        it("responds with a body that is a JSON empty array", function(done) {
            request(todoListUrl, function(error, response, body) {
                assert.equal(body, "[]");
                done();
            });
        });
    });
    describe("get list of actions", function() {
        var todoChangesUrl =  baseUrl + "/api/changes";
        it("responds with status code 200", function(done) {
            request(todoChangesUrl, function(error, response) {
                assert.equal(response.statusCode, 200);
                done();
            });
        });
        it("responds with a body encoded as JSON in UTF-8", function(done) {
            request(todoChangesUrl, function(error, response) {
                assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
                done();
            });
        });
        it("responds with a body that is a JSON empty array", function(done) {
            request(todoChangesUrl, function(error, response, body) {
                assert.equal(body, "[]");
                done();
            });
        });
    });
    describe("get a single todo", function() {
        it("responds with status code 404", function(done) {
            request.get({
                url: todoListUrl + "/0",
            }, function(error, response) {
                assert.equal(response.statusCode, 404);
                done();
            });
        });
        it("responds with status code 200 with TODO item", function(done) {
            request.post({
                url: todoListUrl,
                json: {
                    title: "This is a TODO item"
                }
            }, function() {
                request.get(todoListUrl + "/0", function(error, response, body) {
                    assert.deepEqual(JSON.parse(body), {
                        title: "This is a TODO item",
                        isComplete : false,
                        id: "0"
                    });
                    done();
                });
            });
        });
    });
    describe("create a new todo", function() {
        it("responds with status code 201", function(done) {
            request.post({
                url: todoListUrl,
                json: {
                    title: "This is a TODO item"
                }
            }, function(error, response) {
                assert.equal(response.statusCode, 201);
                done();
            });
        });
        it("responds with the location of the newly added resource", function(done) {
            request.post({
                url: todoListUrl,
                json: {
                    title: "This is a TODO item"
                }
            }, function(error, response) {
                assert.equal(response.headers.location, "/api/todo/0");
                done();
            });
        });
        it("inserts the todo at the end of the list of todos", function(done) {
            request.post({
                url: todoListUrl,
                json: {
                    title: "This is a TODO item"
                }
            }, function() {
                request.get(todoListUrl, function(error, response, body) {
                    assert.deepEqual(JSON.parse(body), [{
                        title: "This is a TODO item",
                        isComplete : false,
                        id: "0"
                    }]);
                    done();
                });
            });
        });
    });
    describe("update a todo", function() {
        it("responds with status code 404 if there is no such item", function(done) {
            request.put(todoListUrl + "/0", function(error, response) {
                assert.equal(response.statusCode, 404);
                done();
            });
        });
        it("responds with status code 200 and updates title", function(done) {
            request.post({
                url: todoListUrl,
                json: {
                    title: "This is a TODO item"
                }
            }, function() {
                request.put({
                    url: todoListUrl + "/0",
                    json: {
                        title: "This is an updated TODO item",
                        isComplete: true
                    }
                }, function(error, response) {
                    assert.equal(response.statusCode, 200);
                    request.get(todoListUrl, function(error, response, body) {
                        assert.deepEqual(JSON.parse(body), [{
                            title: "This is an updated TODO item",
                            isComplete: true,
                            id: "0"
                        }]);
                        done();
                    });
                });
            });
        });
        it("responds with status code 400", function(done) {
            request.post({
                url: todoListUrl,
                json: {
                    title: "This is a TODO item"
                }
            }, function() {
                request.put({
                    url: todoListUrl + "/0",
                    json: {}
                }, function(error, response) {
                    assert.equal(response.statusCode, 400);
                    done();
                });
            });
        });
    });
    describe("delete a todo", function() {
        it("responds with status code 404 if there is no such item", function(done) {
            request.del(todoListUrl + "/0", function(error, response) {
                assert.equal(response.statusCode, 404);
                done();
            });
        });
        it("responds with status code 200", function(done) {
            request.post({
                url: todoListUrl,
                json: {
                    title: "This is a TODO item"
                }
            }, function() {
                request.del(todoListUrl + "/0", function(error, response) {
                    assert.equal(response.statusCode, 200);
                    done();
                });
            });
        });
        it("removes the item from the list of todos", function(done) {
            request.post({
                url: todoListUrl,
                json: {
                    title: "This is a TODO item"
                }
            }, function() {
                request.del(todoListUrl + "/0", function() {
                    request.get(todoListUrl, function(error, response, body) {
                        assert.deepEqual(JSON.parse(body), []);
                        done();
                    });
                });
            });
        });
    });
});

var express = require("express");
var createServer = require("../server/server");
var webdriver = require("selenium-webdriver");
var istanbul = require("istanbul");
var path = require("path");
var fs = require("fs");

var testPort = 52684;
var baseUrl = "http://localhost:" + testPort;
var instrumenter = new istanbul.Instrumenter();
var collector = new istanbul.Collector();
var gatheringCoverage = process.env.running_under_istanbul;
var coverageFilename = "build_artifacts/coverage-e2e.json";

var driver;
var router;
var server;

module.exports.setupDriver = function() {
    driver = new webdriver.Builder().forBrowser("chrome").build();
};

module.exports.setupServer = function(done) {
    router = express.Router();
    if (gatheringCoverage) {
        router.get("/main.js", function(req, res) {
            var absPath = path.join(__dirname, "..", "public", "main.js");
            res.send(instrumenter.instrumentSync(fs.readFileSync("public/main.js", "utf8"), absPath));
        });
    }
    server = createServer(testPort, router, done);
};

module.exports.teardownServer = function(done) {
    server.close(done);
};

module.exports.teardownDriver = function() {
    if (gatheringCoverage) {
        driver.executeScript("return __coverage__;").then(function (coverage) {
            collector.add(coverage);
        });
    }
    driver.quit();
};

module.exports.reportCoverage = function() {
    if (gatheringCoverage) {
        fs.writeFileSync(coverageFilename, JSON.stringify(collector.getFinalCoverage()), "utf8");
    }
};

module.exports.navigateToSite = function() {
    driver.get(baseUrl);
};

module.exports.getTitleText = function() {
    return driver.findElement(webdriver.By.id("header")).getText();
};

module.exports.getInputText = function() {
    return driver.findElement(webdriver.By.id("new-todo")).getAttribute("value");
};

module.exports.getErrorText = function() {
    var errorElement = driver.findElement(webdriver.By.id("messages"));
    driver.wait(webdriver.until.elementIsEnabled(errorElement), 5000);
    return driver.findElements(webdriver.By.css("#messages div"));
};

module.exports.getTodoList = function() {
    var todoListPlaceholder = driver.findElement(webdriver.By.id("todo-list-placeholder"));
    driver.wait(webdriver.until.elementIsNotVisible(todoListPlaceholder), 5000);
    return driver.findElements(webdriver.By.css("#todo-list li"));
};

module.exports.addTodo = function(text) {
    driver.findElement(webdriver.By.id("new-todo")).sendKeys(text);
    driver.findElement(webdriver.By.id("submit-todo")).click();
};

module.exports.deleteTodo = function(index) {
    var todoListPlaceholder = driver.findElement(webdriver.By.id("todo-list-placeholder"));
    driver.wait(webdriver.until.elementIsNotVisible(todoListPlaceholder), 5000);
    var button =  driver.findElement(webdriver.By.id("deleteTODO" + index));
    button.click();
};

module.exports.getCountDiv = function(index) {
    var todoListPlaceholder = driver.findElement(webdriver.By.id("todo-list-placeholder"));
    driver.wait(webdriver.until.elementIsNotVisible(todoListPlaceholder), 5000);
    var countDiv =  driver.findElement(webdriver.By.css("#count-label")).getText();
    return countDiv;
};

module.exports.setupErrorRoute = function(action, route) {
    if (action === "get") {
        router.get(route, function(req, res) {
            res.sendStatus(500);
        });
    }
    if (action === "post") {
        router.post(route, function(req, res) {
            res.sendStatus(500);
        });
    }
};

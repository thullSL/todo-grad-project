var express = require("express");
var bodyParser = require("body-parser");
var _ = require("underscore");

module.exports = function(port, middleware, callback) {
    var actionHistory = [];
    var commandNum = 0;
    var app = express();

    if (middleware) {
        app.use(middleware);
    }
    app.use(express.static("public"));
    app.use(bodyParser.json());

    var latestId = 0;
    var todos = [];
    function Action(action, data) {
        this.id = commandNum++;
        this.action = action;
        this.data = data;
        this.logAction = function() {
            actionHistory.push(this);
        };
    }

    // Create
    app.post("/api/todo", function(req, res) {
        var todo = req.body;
        todo.id = latestId.toString();
        todo.isComplete = false;
        latestId++;
        todos.push(todo);
        new Action("create", todo).logAction();
        res.set("Location", "/api/todo/" + todo.id);
        res.sendStatus(201);
    });

    // Read
    app.get("/api/todo/:id", function(req, res) {
        var id = req.params.id;
        var todo = getTodo(id);
        if (todo) {
            res.json(todo);
        }else {
            res.sendStatus(404);
        }
    });

    // Read
    app.get("/api/todo", function(req, res) {
        res.json(todos);
    });

    // Delete
    app.delete("/api/todo/:id", function(req, res) {
        var id = req.params.id;
        var todo = getTodo(id);
        if (todo) {
            todos = todos.filter(function(otherTodo) {
                return otherTodo !== todo;
            });
            new Action("delete", {id: id}).logAction();
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    });

    // Update
    app.put("/api/todo/:id", function(req, res) {
        var id  = req.params.id;
        var todo = getTodo(id);
        if (todo) {
            if (req.body.title !== undefined &&  req.body.isComplete !== undefined) {
                todo.title = req.body.title;
                todo.isComplete = req.body.isComplete;
                new Action("update", todo).logAction();
                res.sendStatus(200);
            } else {
                res.set("responseText", "Invalid or incomplete TODO object");
                res.sendStatus(400);
            }
        } else {
            res.sendStatus(404);
        }
    });

    // Get changes
    app.get("/api/changes", function(req, res) {
        var lastActionID = req.query.lastActionID !== undefined ? req.query.lastActionID : 0;
        var changes = actionHistory.filter(function(action) {return action.id >= lastActionID;});
        res.json(changes);
    });

    function getTodo(id) {
        return _.find(todos, function(todo) {
            return todo.id === id;
        });
    }

    var server = app.listen(port, callback);

    // We manually manage the connections to ensure that they're closed when calling close().
    var connections = [];
    server.on("connection", function(connection) {
        connections.push(connection);
    });

    return {
        close: function(callback) {//assada
            connections.forEach(function(connection) {
                connection.destroy();
            });
            server.close(callback);
        }
    };
};
